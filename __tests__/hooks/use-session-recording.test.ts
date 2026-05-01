import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSessionRecording } from '../../hooks/use-session-recording';
import type { Session } from '../../lib/session-store';

// ─── モック ───────────────────────────────────────────────────────────────────

jest.mock('../../services/gps-service', () => ({
  startRecordingService:   jest.fn(),
  pauseRecordingService:   jest.fn(),
  resumeRecordingService:  jest.fn(),
  stopRecordingService:    jest.fn(),
  isBackgroundTaskRunning: jest.fn(),
  getActiveSession:        jest.fn(),
}));

jest.mock('../../lib/session-store', () => ({
  updateSessionStatus: jest.fn(),
}));

import * as gpsService   from '../../services/gps-service';
import * as sessionStore from '../../lib/session-store';

// ─── ヘルパー ─────────────────────────────────────────────────────────────────

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

/** テスト用の最小セッションオブジェクト */
function session(partial: Pick<Session, 'id' | 'status'>): Session {
  return {
    id: partial.id,
    started_at: 1_700_000_000_000,
    ended_at: null,
    status: partial.status,
    vehicle_id: null,
    odometer_start_km: null,
    odometer_end_km: null,
    is_background_active: 0,
    paused_reason: null,
    distance_m: 0,
    moving_time_s: 0,
    avg_speed: 0,
    max_speed: 0,
    point_count: 0,
    note: null,
    created_at: 1_700_000_000_000,
    updated_at: 1_700_000_000_000,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(gpsService.getActiveSession).mockResolvedValue(null);
  jest.mocked(gpsService.isBackgroundTaskRunning).mockResolvedValue(false);
  jest.mocked(gpsService.startRecordingService).mockResolvedValue({
    id: 1,
    started_at: 1_700_000_000_000,
  });
  jest.mocked(gpsService.pauseRecordingService).mockResolvedValue(undefined);
  jest.mocked(gpsService.resumeRecordingService).mockResolvedValue(undefined);
  jest.mocked(gpsService.stopRecordingService).mockResolvedValue(undefined);
  jest.mocked(sessionStore.updateSessionStatus).mockResolvedValue(undefined);
});

// ─── 初期ロード ───────────────────────────────────────────────────────────────

describe('initial state restoration', () => {
  it('starts as loading then becomes idle when no active session', async () => {
    const { result } = renderHook(() => useSessionRecording(), { wrapper: makeWrapper() });

    expect(result.current.status).toBe('loading');

    await waitFor(() => expect(result.current.status).toBe('idle'));
    expect(result.current.activeSessionId).toBeNull();
    expect(result.current.activeSessionStartedAt).toBeNull();
  });

  it('restores to paused when a paused session exists', async () => {
    jest.mocked(gpsService.getActiveSession).mockResolvedValue(session({ id: 5, status: 'paused' }));

    const { result } = renderHook(() => useSessionRecording(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.status).toBe('paused'));
    expect(result.current.activeSessionId).toBe(5);
    expect(result.current.activeSessionStartedAt).toBe(1_700_000_000_000);
  });

  it('restores to recording when session is recording AND task is running', async () => {
    jest.mocked(gpsService.getActiveSession).mockResolvedValue(session({ id: 3, status: 'recording' }));
    jest.mocked(gpsService.isBackgroundTaskRunning).mockResolvedValue(true);

    const { result } = renderHook(() => useSessionRecording(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.status).toBe('recording'));
    expect(result.current.activeSessionId).toBe(3);
    expect(result.current.activeSessionStartedAt).toBe(1_700_000_000_000);
  });

  it('crash recovery: recording session but task stopped → restores to paused', async () => {
    jest.mocked(gpsService.getActiveSession).mockResolvedValue(session({ id: 9, status: 'recording' }));
    jest.mocked(gpsService.isBackgroundTaskRunning).mockResolvedValue(false);

    const { result } = renderHook(() => useSessionRecording(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.status).toBe('paused'));
    expect(result.current.activeSessionId).toBe(9);
    expect(result.current.activeSessionStartedAt).toBe(1_700_000_000_000);
    expect(sessionStore.updateSessionStatus).toHaveBeenCalledWith(9, 'paused', 'crash_recovery');
  });
});

// ─── start ────────────────────────────────────────────────────────────────────

describe('start()', () => {
  it('transitions idle → recording and sets activeSessionId', async () => {
    jest.mocked(gpsService.startRecordingService).mockResolvedValue({
      id: 42,
      started_at: 1_700_123_456_000,
    });

    const { result } = renderHook(() => useSessionRecording(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.status).toBe('idle'));

    await act(async () => { await result.current.start(); });

    expect(result.current.status).toBe('recording');
    expect(result.current.activeSessionId).toBe(42);
    expect(result.current.activeSessionStartedAt).toBe(1_700_123_456_000);
    expect(result.current.error).toBeNull();
  });

  it('transitions to idle with error when startRecordingService throws', async () => {
    jest.mocked(gpsService.startRecordingService).mockRejectedValue(
      new Error('権限が拒否されました'),
    );

    const { result } = renderHook(() => useSessionRecording(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.status).toBe('idle'));

    await act(async () => {
      await expect(result.current.start()).rejects.toThrow('権限が拒否されました');
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.activeSessionStartedAt).toBeNull();
    expect(result.current.error).toBe('権限が拒否されました');
  });
});

// ─── pause ────────────────────────────────────────────────────────────────────

describe('pause()', () => {
  it('transitions recording → paused', async () => {
    jest.mocked(gpsService.getActiveSession).mockResolvedValue(session({ id: 1, status: 'recording' }));
    jest.mocked(gpsService.isBackgroundTaskRunning).mockResolvedValue(true);

    const { result } = renderHook(() => useSessionRecording(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.status).toBe('recording'));

    await act(async () => { await result.current.pause(); });

    expect(result.current.status).toBe('paused');
    expect(gpsService.pauseRecordingService).toHaveBeenCalledWith(1);
  });

  it('reverts to recording on pause failure', async () => {
    jest.mocked(gpsService.getActiveSession).mockResolvedValue(session({ id: 1, status: 'recording' }));
    jest.mocked(gpsService.isBackgroundTaskRunning).mockResolvedValue(true);
    jest.mocked(gpsService.pauseRecordingService).mockRejectedValue(new Error('一時停止に失敗しました'));

    const { result } = renderHook(() => useSessionRecording(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.status).toBe('recording'));

    await act(async () => { await result.current.pause(); });

    expect(result.current.status).toBe('recording');
    expect(result.current.error).toBe('一時停止に失敗しました');
  });
});

// ─── resume ───────────────────────────────────────────────────────────────────

describe('resume()', () => {
  it('transitions paused → recording', async () => {
    jest.mocked(gpsService.getActiveSession).mockResolvedValue(session({ id: 2, status: 'paused' }));

    const { result } = renderHook(() => useSessionRecording(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.status).toBe('paused'));

    await act(async () => { await result.current.resume(); });

    expect(result.current.status).toBe('recording');
    expect(gpsService.resumeRecordingService).toHaveBeenCalledWith(2);
  });

  it('reverts to paused on resume failure', async () => {
    jest.mocked(gpsService.getActiveSession).mockResolvedValue(session({ id: 2, status: 'paused' }));
    jest.mocked(gpsService.resumeRecordingService).mockRejectedValue(new Error('再開に失敗しました'));

    const { result } = renderHook(() => useSessionRecording(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.status).toBe('paused'));

    await act(async () => { await result.current.resume(); });

    expect(result.current.status).toBe('paused');
    expect(result.current.error).toBe('再開に失敗しました');
  });
});

// ─── stop ─────────────────────────────────────────────────────────────────────

describe('stop()', () => {
  it('transitions recording → idle and clears activeSessionId', async () => {
    jest.mocked(gpsService.getActiveSession).mockResolvedValue(session({ id: 3, status: 'recording' }));
    jest.mocked(gpsService.isBackgroundTaskRunning).mockResolvedValue(true);

    const { result } = renderHook(() => useSessionRecording(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.status).toBe('recording'));

    await act(async () => { await result.current.stop(); });

    expect(result.current.status).toBe('idle');
    expect(result.current.activeSessionId).toBeNull();
    expect(result.current.activeSessionStartedAt).toBeNull();
    expect(gpsService.stopRecordingService).toHaveBeenCalledWith(3, undefined);
  });

  it('transitions paused → idle', async () => {
    jest.mocked(gpsService.getActiveSession).mockResolvedValue(session({ id: 4, status: 'paused' }));

    const { result } = renderHook(() => useSessionRecording(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.status).toBe('paused'));

    await act(async () => { await result.current.stop(); });

    expect(result.current.status).toBe('idle');
    expect(result.current.activeSessionId).toBeNull();
    expect(result.current.activeSessionStartedAt).toBeNull();
  });

  it('falls back to paused on stop failure', async () => {
    jest.mocked(gpsService.getActiveSession).mockResolvedValue(session({ id: 5, status: 'recording' }));
    jest.mocked(gpsService.isBackgroundTaskRunning).mockResolvedValue(true);
    jest.mocked(gpsService.stopRecordingService).mockRejectedValue(new Error('停止に失敗しました'));

    const { result } = renderHook(() => useSessionRecording(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.status).toBe('recording'));

    await act(async () => {
      await expect(result.current.stop()).rejects.toThrow('停止に失敗しました');
    });

    expect(result.current.status).toBe('paused');
    expect(result.current.error).toBe('停止に失敗しました');
  });
});
