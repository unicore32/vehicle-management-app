import { useRef } from 'react';
import { View, Text, StyleSheet, PanResponder } from 'react-native';

// ─── 型定義 ───────────────────────────────────────────────────────────────────

type Props = {
  minTimestamp: number;
  maxTimestamp: number;
  currentTimestamp: number;
  onSeek: (ts: number) => void;
};

// ─── ユーティリティ ───────────────────────────────────────────────────────────

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// ─── コンポーネント ───────────────────────────────────────────────────────────

/**
 * タイムスタンプベースの水平スライダー。
 *
 * - トラックをタップ / ドラッグしてシーク可能
 * - 現在時刻ラベルをサム上部に表示
 * - 開始 / 終了時刻を両端に表示
 */
export function RoutePlaybackSlider({
  minTimestamp,
  maxTimestamp,
  currentTimestamp,
  onSeek,
}: Props) {
  const trackWidthRef = useRef(0);
  const duration = maxTimestamp - minTimestamp;
  const progress = duration > 0 ? Math.max(0, Math.min(1, (currentTimestamp - minTimestamp) / duration)) : 0;

  const handleSeekAtX = (x: number) => {
    if (trackWidthRef.current <= 0 || duration <= 0) return;
    const ratio = Math.max(0, Math.min(1, x / trackWidthRef.current));
    onSeek(minTimestamp + ratio * duration);
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      handleSeekAtX(e.nativeEvent.locationX);
    },
    onPanResponderMove: (e) => {
      handleSeekAtX(e.nativeEvent.locationX);
    },
  });

  const thumbPercent = `${progress * 100}%` as `${number}%`;

  return (
    <View style={styles.container}>
      {/* 現在時刻ラベル */}
      <Text style={styles.currentTime}>{formatTime(currentTimestamp)}</Text>

      {/* トラック */}
      <View
        style={styles.trackContainer}
        onLayout={(e) => {
          trackWidthRef.current = e.nativeEvent.layout.width;
        }}
        {...panResponder.panHandlers}
        testID='playback-slider-track'
      >
        {/* 背景トラック */}
        <View style={styles.track}>
          {/* 進捗バー */}
          <View style={[styles.progress, { width: thumbPercent }]} />
        </View>

        {/* サム */}
        <View style={[styles.thumbWrapper, { left: thumbPercent }]}>
          <View style={styles.thumb} />
        </View>
      </View>

      {/* 開始 / 終了時刻 */}
      <View style={styles.endLabels}>
        <Text style={styles.endLabel}>{formatTime(minTimestamp)}</Text>
        <Text style={styles.endLabel}>{formatTime(maxTimestamp)}</Text>
      </View>
    </View>
  );
}

// ─── スタイル ─────────────────────────────────────────────────────────────────

const THUMB_SIZE = 16;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  currentTime: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f1f5f9',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  trackContainer: {
    height: THUMB_SIZE + 8,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  thumbWrapper: {
    position: 'absolute',
    transform: [{ translateX: -(THUMB_SIZE / 2) }],
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#3b82f6',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  endLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  endLabel: {
    fontSize: 11,
    color: '#64748b',
    fontVariant: ['tabular-nums'],
  },
});
