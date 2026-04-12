import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { useLiveSessionPoints } from '../../hooks/use-live-session';
import * as sessionPointsStore from '../../lib/session-points-store';

jest.mock('../../lib/session-points-store', () => ({
  getRecentSessionPoints: jest.fn(),
  getSessionPoints: jest.fn(),
  getLatestSessionPoint: jest.fn(),
  computeLiveDistance: jest.fn(),
}));

const mockGetRecentSessionPoints = sessionPointsStore.getRecentSessionPoints as jest.MockedFunction<
  typeof sessionPointsStore.getRecentSessionPoints
>;

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useLiveSessionPoints', () => {
  beforeEach(() => {
    mockGetRecentSessionPoints.mockReset();
  });

  it('loads recent session points for the live map query', async () => {
    mockGetRecentSessionPoints.mockResolvedValue([]);

    const { result } = renderHook(() => useLiveSessionPoints(7, true), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGetRecentSessionPoints).toHaveBeenCalledWith(7, 200);
  });
});