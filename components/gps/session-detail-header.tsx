import { View, Text, StyleSheet } from 'react-native';
import type { Session } from '../../lib/session-store';

type Props = {
  session: Session;
};

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function SessionDetailHeader({ session }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.date}>{formatDateTime(session.started_at)}</Text>
      {session.ended_at !== null && (
        <Text style={styles.subtitle}>
          〜 {formatDateTime(session.ended_at)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 4,
  },
  date: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
  },
});
