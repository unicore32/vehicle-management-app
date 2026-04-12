import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { useCurrentLocation } from '../../hooks/use-current-location';

describe('useCurrentLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps the last known location when disabled', async () => {
    let nextLocation: Parameters<typeof Location.watchPositionAsync>[1] | null = null;

    jest.mocked(Location.getCurrentPositionAsync).mockResolvedValue({
      coords: {
        latitude: 35.6804,
        longitude: 139.769,
        altitude: null,
        accuracy: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    } as Awaited<ReturnType<typeof Location.getCurrentPositionAsync>>);

    jest.mocked(Location.watchPositionAsync).mockImplementation(async (_options, callback) => {
      nextLocation = callback;
      return { remove: jest.fn() } as unknown as Location.LocationSubscription;
    });

    const { result, rerender } = renderHook<ReturnType<typeof useCurrentLocation>, { enabled: boolean }>(
      ({ enabled }) => useCurrentLocation(enabled),
      { initialProps: { enabled: true } },
    );

    await waitFor(() => expect(Location.getCurrentPositionAsync).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(Location.watchPositionAsync).toHaveBeenCalledTimes(1));

    expect(result.current.location).toEqual({
      latitude: 35.6804,
      longitude: 139.769,
    });

    await act(async () => {
      nextLocation?.({
        coords: {
          latitude: 35.681236,
          longitude: 139.767125,
          altitude: null,
          accuracy: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      });
    });

    expect(result.current.location).toEqual({
      latitude: 35.681236,
      longitude: 139.767125,
    });

    rerender({ enabled: false });

    await waitFor(() => expect(Location.watchPositionAsync).toHaveBeenCalledTimes(1));

    expect(result.current.location).toEqual({
      latitude: 35.681236,
      longitude: 139.767125,
    });
    expect(result.current.error).toBeNull();
  });
});
