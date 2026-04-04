import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { useSessionDetail, useDeleteSession } from '../../hooks/use-session-detail';
import * as sessionStore from '../../lib/session-store';
import * as pointsStore from '../../lib/session-points-store';
import * as gapsStore from '../../lib/session-gaps-store';
import type { Session } from '../../lib/session-store';
import type { SessionPoint } from '../../lib/session-points-store';
import type { SessionGap } from '../../lib/session-gaps-store';

jest.mock('../../lib/session-store', () => ({
  getSession: jest.fn(),
  deleteSession: jest.fn(),
}));
jest.mock('../../lib/session-points-store', () => ({
  getSessionPoints: jest.fn(),
}));
jest.mock('../../lib/session-gaps-store', () => ({
  getSessionGaps: jest.fn(),
}));

const mockGetSession = sessionStore.getSession as jest.MockedFunction<typeof sessionStore.getSession>;
const mockDeleteSession = sessionStore.deleteSession as jest.MockedFunction<typeof sessionStore.deleteSession>;
const mockGetSessionPoints = pointsStore.getSessionPoints as jest.MockedFunction<typeof pointsStore.getSessionPoints>;
const mockGetSessionGaps = gapsStore.getSessionGaps as jest.MockedFunction<typeof gapsStore.getSessionGaps>;

// ─── テストデータ ──────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 1,
    started_at: 1_700_000_000_000,
    ended_at: 1_700_003_600_000,
    status: 'finished',
    is_background_active: 0,
    paused_reason: null,
    distance_m: 5000,
    moving_time_s: 1800,
    avg_speed: 2.78,
    max_speed: 8.0,
    point_count: 360,
    note: null,
    created_at: 1_700_000_000_000,
    updated_at: 1_700_003_600_000,
    ...overrides,
  };
}

function makePoint(overrides: Partial<SessionPoint> = {}): SessionPoint {
  return {
    id: 1,
    session_id: 1,
    latitude: 35.6895,
    longitude: 139.6917,
    altitude: null,
    accuracy: null,
    speed: null,
    timestamp: 1_700_000_000_000,
    created_at: 1_700_000_000_000,
    ...overrides,
  };
}

function makeGap(overrides: Partial<SessionGap> = {}): SessionGap {
  return {
    id: 1,
    session_id: 1,
    gap_started_at: 1_700_001_000_000,
    gap_ended_at: 1_700_001_060_000,
    reason: null,
    correction_mode: 'none',
    ...overrides,
  };
}

// ─── ラッパー ──────────────────────────────────────────────────────────────────

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
  };
}

// ─── useSessionDetail ─────────────────────────────────────────────────────────

describe('useSessionDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('セッション・ポイント・ギャップをまとめて返す', async () => {
    const session = makeSession();
    const points = [makePoint(), makePoint({ id: 2, latitude: 35.69 })];
    const gaps = [makeGap()];

    mockGetSession.mockResolvedValue(session);
    mockGetSessionPoints.mockResolvedValue(points);
    mockGetSessionGaps.mockResolvedValue(gaps);

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useSessionDetail(1), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.session).toEqual(session);
    expect(result.current.data?.points).toEqual(points);
    expect(result.current.data?.gaps).toEqual(gaps);
  });

  it('セッションが存在しない場合はエラーになる', async () => {
    mockGetSession.mockResolvedValue(null);
    mockGetSessionPoints.mockResolvedValue([]);
    mockGetSessionGaps.mockResolvedValue([]);

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useSessionDetail(999), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ─── useDeleteSession ─────────────────────────────────────────────────────────

describe('useDeleteSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deleteSession を呼び出す', async () => {
    mockDeleteSession.mockResolvedValue(undefined);

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteSession(), { wrapper });

    await act(async () => {
      result.current.mutate(1);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDeleteSession).toHaveBeenCalledWith(1);
  });
});
