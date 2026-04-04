import { StyleSheet, Text, View } from 'react-native';
import type { StoredLocation } from '../../lib/location-store';

type Props = {
  count: number | undefined;
  isRecording: boolean;
  latestLocation: StoredLocation | undefined;
};

/**
 * GPS 記録の統計情報（取得件数・最終座標・速度）を表示する。
 */
export function LocationStats({ count, isRecording, latestLocation }: Props) {
  const formattedSpeed =
    latestLocation?.speed != null && latestLocation.speed >= 0
      ? `${(latestLocation.speed * 3.6).toFixed(1)} km/h`
      : '-- km/h';

  const formattedCoords =
    latestLocation != null
      ? `${latestLocation.latitude.toFixed(5)}, ${latestLocation.longitude.toFixed(5)}`
      : '位置情報なし';

  return (
    <View style={styles.container}>
      {/* 件数カード */}
      <View style={[styles.card, isRecording && styles.cardRecording]}>
        <Text style={styles.label}>記録件数</Text>
        <Text style={styles.countValue}>{count ?? 0}</Text>
      </View>

      {/* 座標・速度カード */}
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>最終座標</Text>
          <Text style={styles.monoValue} numberOfLines={1} adjustsFontSizeToFit>
            {formattedCoords}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>速度</Text>
          <Text style={styles.speedValue}>{formattedSpeed}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    width: '100%',
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cardRecording: {
    borderColor: '#16a34a',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#2a2a2a',
    marginVertical: 10,
  },
  label: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  countValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#f1f5f9',
    textAlign: 'right',
    marginTop: 4,
  },
  monoValue: {
    fontSize: 12,
    color: '#e2e8f0',
    fontFamily: 'monospace',
    maxWidth: '65%',
  },
  speedValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f1f5f9',
  },
});
