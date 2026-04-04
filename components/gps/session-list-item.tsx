import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Session } from '../../lib/session-store';
import { formatDuration } from '../../lib/time-format';

// ─── ユーティリティ ──────────────────────────────────────────────────────────

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatDistance(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${Math.round(m)} m`;
}

// ─── コンポーネント ──────────────────────────────────────────────────────────

type Props = {
  session: Session;
  onPress?: () => void;
};

export function SessionListItem({ session, onPress }: Props) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.left}>
        <Text style={styles.date}>{formatDate(session.started_at)}</Text>
        <Text style={styles.duration}>{formatDuration(session.moving_time_s)}</Text>
      </View>
      <Text style={styles.distance}>{formatDistance(session.distance_m)}</Text>
    </Pressable>
  );
}

// ─── スタイル ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111827',
    marginHorizontal: 16,
    marginVertical: 4,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  left: {
    gap: 3,
  },
  date: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  duration: {
    fontSize: 12,
    color: '#94a3b8',
    fontVariant: ['tabular-nums'],
  },
  distance: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f1f5f9',
  },
});
