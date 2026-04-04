import { StyleSheet, Text, View } from 'react-native';
import type { SessionSummary } from '../../hooks/use-session-list';
import { formatDuration } from '../../lib/time-format';

// ─── ユーティリティ ──────────────────────────────────────────────────────────

function formatDistance(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${Math.round(m)} m`;
}

// ─── コンポーネント ──────────────────────────────────────────────────────────

type Props = {
  summary: SessionSummary;
};

export function SessionListHeader({ summary }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>トータル</Text>
      <View style={styles.row}>
        <SummaryCell label="セッション" value={`${summary.totalCount} 回`} />
        <View style={styles.divider} />
        <SummaryCell label="総距離" value={formatDistance(summary.totalDistanceM)} />
        <View style={styles.divider} />
        <SummaryCell label="総移動時間" value={formatDuration(summary.totalMovingTimeS)} />
      </View>
    </View>
  );
}

type SummaryCellProps = {
  label: string;
  value: string;
};

function SummaryCell({ label, value }: SummaryCellProps) {
  return (
    <View style={styles.cell}>
      <Text style={styles.cellValue}>{value}</Text>
      <Text style={styles.cellLabel}>{label}</Text>
    </View>
  );
}

// ─── スタイル ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 10,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  cellValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  cellLabel: {
    fontSize: 10,
    color: '#94a3b8',
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});
