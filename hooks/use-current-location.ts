import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export type CurrentLocation = {
  latitude: number;
  longitude: number;
};

const LOCATION_UPDATE_INTERVAL_MS = 2_000;

export function useCurrentLocation(enabled: boolean) {
  const [location, setLocation] = useState<CurrentLocation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    async function start() {
      if (!enabled) {
        setLocation(null);
        setError(null);
        return;
      }

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') {
          setError('現在地の表示には位置情報の許可が必要です');
          setLocation(null);
          return;
        }

        setError(null);
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: LOCATION_UPDATE_INTERVAL_MS,
            distanceInterval: 0,
          },
          (next) => {
            setLocation({
              latitude: next.coords.latitude,
              longitude: next.coords.longitude,
            });
          },
        );
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '現在地の取得に失敗しました');
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [enabled]);

  return { location, error };
}
