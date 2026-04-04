/**
 * Unit tests for hooks/use-gps-logger.ts
 *
 * expo-location / expo-task-manager は jest.setup.ts でモック済み。
 * TanStack Query の QueryClientProvider をラッパーとして提供する。
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';

import { useGPSLogger } from '../../hooks/use-gps-logger';

// ─── テスト用ラッパー ──────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
}

// ─── セットアップ ─────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // デフォルト: 記録中ではない
  (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValue(false);
});

// ─── 初期状態 ─────────────────────────────────────────────────────────────────

describe('初期状態', () => {
  it('isLoading が true → false に遷移し、isRecording が false になる', async () => {
    const { result } = renderHook(() => useGPSLogger(), {
      wrapper: createWrapper(),
    });

    // 初期は isLoading=true
    expect(result.current.isLoading).toBe(true);

    // isTaskRegisteredAsync の解決後に isLoading=false になる
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.isRecording).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('既にバックグラウンドタスクが動作中の場合 isRecording が true で復元される', async () => {
    (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValue(true);

    const { result } = renderHook(() => useGPSLogger(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.isRecording).toBe(true);
  });
});

// ─── startRecording ───────────────────────────────────────────────────────────

describe('startRecording', () => {
  it('正常系: 呼び出し後に isRecording が true になる', async () => {
    const { result } = renderHook(() => useGPSLogger(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('正常系: startLocationUpdatesAsync が呼ばれる', async () => {
    const { result } = renderHook(() => useGPSLogger(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.startRecording();
    });

    expect(Location.startLocationUpdatesAsync).toHaveBeenCalledTimes(1);
  });

  it('異常系: 前景権限拒否時に error がセットされ isRecording は false のまま', async () => {
    (
      Location.requestForegroundPermissionsAsync as jest.Mock
    ).mockResolvedValueOnce({ status: 'denied' });

    const { result } = renderHook(() => useGPSLogger(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.error).toContain('前景位置情報の許可が必要です');
  });

  it('異常系: バックグラウンド権限拒否時に error がセットされる', async () => {
    (
      Location.requestBackgroundPermissionsAsync as jest.Mock
    ).mockResolvedValueOnce({ status: 'denied' });

    const { result } = renderHook(() => useGPSLogger(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.error).toContain('バックグラウンド位置情報の許可が必要です');
  });
});

// ─── stopRecording ────────────────────────────────────────────────────────────

describe('stopRecording', () => {
  it('正常系: 開始後に停止すると isRecording が false になる', async () => {
    const { result } = renderHook(() => useGPSLogger(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // まず開始
    await act(async () => {
      await result.current.startRecording();
    });
    expect(result.current.isRecording).toBe(true);

    // 停止（タスクが登録済みとして扱う）
    (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValue(true);
    await act(async () => {
      await result.current.stopRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('正常系: タスク登録済みの場合 stopLocationUpdatesAsync が呼ばれる', async () => {
    (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValue(true);

    const { result } = renderHook(() => useGPSLogger(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.stopRecording();
    });

    expect(Location.stopLocationUpdatesAsync).toHaveBeenCalledTimes(1);
  });
});
