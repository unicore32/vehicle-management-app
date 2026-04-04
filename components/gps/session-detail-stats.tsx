import { StyleSheet, Text, View } from 'react-native';
import type { Session } from '../../lib/session-store';
import { formatDuration } from '../../lib/time-format';
import { MetricRow } from '../shared/metric-row';

type Props = {
  session: Session;
};

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

function mpsToKmh(mps: number): string {
  return `${(mps * 3.6).toFixed(1)} km/h`;
}

// ─── コンポーネント ──────────────────────────────────────────────────────────

export function SessionDetailStats({ session }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>統計</Text>
      <MetricRow label="移動時間" value={formatDuration(session.moving_time_s)} />
      <MetricRow label="距離" value={formatDistance(session.distance_m)} />
      <MetricRow label="平均速度" value={mpsToKmh(session.avg_speed)} />
      <MetricRow label="最高速度" value={mpsToKmh(session.max_speed)} />
      <MetricRow label="ポイント数" value={String(session.point_count)} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
});
