import { StyleSheet, View, Text } from 'react-native';

type Props = {
  label: string;
  value: string;
  /** 値を強調表示するかどうか（記録中の件数など） */
  highlight?: boolean;
};

/**
 * ラベルと値を横並びで表示する汎用行コンポーネント。
 * LiveSessionSummaryCard・SessionDetailStats などで使用する。
 */
export function MetricRow({ label, value, highlight = false }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, highlight && styles.valueHighlight]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  label: {
    fontSize: 13,
    color: '#94a3b8',
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  valueHighlight: {
    color: '#22c55e',
  },
});
