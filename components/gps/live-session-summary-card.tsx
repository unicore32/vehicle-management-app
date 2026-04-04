import { StyleSheet, Text, View } from 'react-native';
import type { SessionPoint } from '../../lib/session-points-store';
import { formatElapsedTimeMs } from '../../lib/time-format';
import { MetricRow } from '../shared/metric-row';

type Props = {
  /** セッション開始時刻（ms） */
  startedAt: number;
  /** 最新 GPS ポイント */
  latestPoint: SessionPoint | null | undefined;
  /** 記録済みポイント数 */
  pointCount: number | undefined;
  /** 記録中かどうか（ラベル色に使用） */
  isRecording: boolean;
};

/** m/s → km/h 変換 */
function mpsToKmh(mps: number): string {
  return (mps * 3.6).toFixed(1);
}

/** 座標を小数点 5 桁で表示 */
function formatCoord(lat: number, lon: number): string {
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

/**
 * 記録中・一時停止中に表示するライブ統計カード。
 * spec: Home > LiveSessionSummaryCard
 *
 * 経過時間はコンポーネント内でリアルタイム更新せず、
 * 親の refetchInterval に合わせた再描画で更新する。
 * 1 秒精度が必要な場合は setInterval を追加する。
 */
export function LiveSessionSummaryCard({
  startedAt,
  latestPoint,
  pointCount,
  isRecording,
}: Props) {
  const elapsed = Date.now() - startedAt;
  const speedKmh = latestPoint?.speed != null
    ? `${mpsToKmh(latestPoint.speed)} km/h`
    : '--- km/h';
  const coords = latestPoint != null
    ? formatCoord(latestPoint.latitude, latestPoint.longitude)
    : '---';

  return (
    <View style={styles.card}>
      <Text style={styles.title}>ライブ統計</Text>

      <View style={styles.elapsed}>
        <Text style={styles.elapsedValue}>{formatElapsedTimeMs(elapsed)}</Text>
        <Text style={styles.elapsedLabel}>経過時間</Text>
      </View>

      <View style={styles.divider} />

      <MetricRow
        label="記録ポイント"
        value={pointCount !== undefined ? `${pointCount.toLocaleString()} 件` : '---'}
        highlight={isRecording}
      />
      <MetricRow label="現在速度" value={speedKmh} />
      <MetricRow label="現在位置" value={coords} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    gap: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
  },
  elapsed: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  elapsedValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#f1f5f9',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  elapsedLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 8,
  },
});
