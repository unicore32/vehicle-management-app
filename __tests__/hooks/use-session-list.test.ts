import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { useSessionList } from '../../hooks/use-session-list';
import * as sessionStore from '../../lib/session-store';
import type { Session } from '../../lib/session-store';

jest.mock('../../lib/session-store', () => ({
  getSessions: jest.fn(),
}));

const mockGetSessions = sessionStore.getSessions as jest.MockedFunction<typeof sessionStore.getSessions>;

function makeSession(overrides: Partial<Session>): Session {
  return {
    id: 1,
    started_at: Date.now(),
    ended_at: null,
    status: 'finished',
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
    created_at: Date.now(),
    updated_at: Date.now(),
    ...overrides,
  };
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: 0 } },
});

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useSessionList', () => {
  afterEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  it('finished セッションのみ返す', async () => {
    const finished = makeSession({ id: 1, status: 'finished', distance_m: 1000, moving_time_s: 300 });
    const recording = makeSession({ id: 2, status: 'recording' });
    const paused = makeSession({ id: 3, status: 'paused' });
    mockGetSessions.mockResolvedValue([finished, recording, paused]);

    const { result } = renderHook(() => useSessionList(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.sessions).toHaveLength(1);
    expect(result.current.data?.sessions[0].id).toBe(1);
  });

  it('サマリーを正しく集計する', async () => {
    const sessions = [
      makeSession({ id: 1, status: 'finished', distance_m: 2000, moving_time_s: 600 }),
      makeSession({ id: 2, status: 'finished', distance_m: 3000, moving_time_s: 900 }),
    ];
    mockGetSessions.mockResolvedValue(sessions);

    const { result } = renderHook(() => useSessionList(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.summary).toEqual({
      totalCount: 2,
      totalDistanceM: 5000,
      totalMovingTimeS: 1500,
    });
  });

  it('セッションが空のとき空リストとゼロサマリーを返す', async () => {
    mockGetSessions.mockResolvedValue([]);

    const { result } = renderHook(() => useSessionList(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.sessions).toHaveLength(0);
    expect(result.current.data?.summary).toEqual({
      totalCount: 0,
      totalDistanceM: 0,
      totalMovingTimeS: 0,
    });
  });
});
