import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';

import { interpolateGap } from '../../lib/gap-interpolation';
import { insertSessionPoints } from '../../lib/session-points-store';
import { updateGapCorrectionMode } from '../../lib/session-gaps-store';
import type { SessionGap } from '../../lib/session-gaps-store';
import type { SessionPoint } from '../../lib/session-points-store';

// ─── 型定義 ───────────────────────────────────────────────────────────────────

type Props = {
  gaps: SessionGap[];
  points: SessionPoint[];
  onCorrected: () => void;
};

// ─── ヘルパー ─────────────────────────────────────────────────────────────────

/**
 * 欠損区間の直前・直後の実測ポイントを取得する。
 * 見つからない場合は null を返す。
 */
function findAdjacentPoints(
  gap: SessionGap,
  points: SessionPoint[],
): { before: SessionPoint; after: SessionPoint } | null {
  // gap_started_at 以前の最後のポイント
  let before: SessionPoint | null = null;
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].timestamp <= gap.gap_started_at) {
      before = points[i];
      break;
    }
  }

  // gap_ended_at 以降の最初のポイント
  let after: SessionPoint | null = null;
  for (const p of points) {
    if (p.timestamp >= gap.gap_ended_at) {
      after = p;
      break;
    }
  }

  if (before === null || after === null) return null;
  return { before, after };
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ss = d.getSeconds().toString().padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function formatDurationS(startMs: number, endMs: number): string {
  const s = Math.round((endMs - startMs) / 1_000);
  if (s < 60) return `${s}秒`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}分${rem}秒` : `${m}分`;
}

// ─── コンポーネント ───────────────────────────────────────────────────────────

/**
 * セッション詳細画面下部に表示する欠損区間一覧と補間補正パネル。
 */
export function GapCorrectionPanel({ gaps, points, onCorrected }: Props) {
  const [correcting, setCorrecting] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});

  if (gaps.length === 0) return null;

  async function handleInterpolate(gap: SessionGap) {
    const adjacent = findAdjacentPoints(gap, points);
    if (adjacent === null) {
      setErrors((prev) => ({
        ...prev,
        [gap.id]: '前後のポイントが見つかりません',
      }));
      return;
    }

    setCorrecting(gap.id);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[gap.id];
      return next;
    });

    try {
      const interpolated = interpolateGap(adjacent.before, adjacent.after);
      await insertSessionPoints(interpolated);
      await updateGapCorrectionMode(gap.id, 'interpolated');
      onCorrected();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '補正に失敗しました';
      setErrors((prev) => ({ ...prev, [gap.id]: msg }));
    } finally {
      setCorrecting(null);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>欠損区間</Text>

      {gaps.map((gap) => {
        const isFixed = gap.correction_mode !== 'none';
        const isWorking = correcting === gap.id;
        const errorMsg = errors[gap.id];

        return (
          <View key={gap.id} style={styles.item}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemTime}>
                {formatTime(gap.gap_started_at)} – {formatTime(gap.gap_ended_at)}
              </Text>
              <Text style={styles.itemDuration}>
                {formatDurationS(gap.gap_started_at, gap.gap_ended_at)}
                {gap.reason != null ? `  (${gap.reason})` : ''}
              </Text>
              {errorMsg != null && (
                <Text style={styles.errorText}>{errorMsg}</Text>
              )}
            </View>

            <View style={styles.itemAction}>
              {isFixed ? (
                <View style={styles.fixedBadge}>
                  <Text style={styles.fixedBadgeText}>補正済み</Text>
                </View>
              ) : isWorking ? (
                <ActivityIndicator size="small" color="#3b82f6" />
              ) : (
                <TouchableOpacity
                  style={styles.interpolateButton}
                  onPress={() => handleInterpolate(gap)}
                  testID={`interpolate-gap-${gap.id}`}
                >
                  <Text style={styles.interpolateButtonText}>補間で補正</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemTime: {
    fontSize: 14,
    color: '#e2e8f0',
    fontVariant: ['tabular-nums'],
  },
  itemDuration: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  errorText: {
    fontSize: 11,
    color: '#f87171',
    marginTop: 4,
  },
  itemAction: {
    minWidth: 72,
    alignItems: 'flex-end',
  },
  fixedBadge: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  fixedBadgeText: {
    fontSize: 11,
    color: '#6ee7b7',
    fontWeight: '600',
  },
  interpolateButton: {
    backgroundColor: '#1e3a5f',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  interpolateButtonText: {
    fontSize: 12,
    color: '#93c5fd',
    fontWeight: '600',
  },
});
