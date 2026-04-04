import { StyleSheet, View, Text } from 'react-native';
import type { RecordingStatus } from '../../hooks/use-session-recording';

const CONFIG: Record<RecordingStatus, { label: string; color: string; bg: string }> = {
  idle:      { label: '待機中',       color: '#94a3b8', bg: '#1e293b' },
  recording: { label: '記録中',       color: '#22c55e', bg: '#052e16' },
  paused:    { label: '一時停止中',   color: '#f59e0b', bg: '#1c1007' },
  loading:   { label: '処理中...',    color: '#94a3b8', bg: '#1e293b' },
};

type Props = {
  status: RecordingStatus;
};

/**
 * 記録状態をバッジ形式で表示するコンポーネント。
 */
export function StatusChip({ status }: Props) {
  const { label, color, bg } = CONFIG[status];
  return (
    <View style={[styles.chip, { backgroundColor: bg, borderColor: color }]}>
      {status === 'recording' && (
        <View testID="status-dot" style={[styles.dot, { backgroundColor: color }]} />
      )}
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
