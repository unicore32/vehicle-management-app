import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View, type AppStateStatus, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SESSION_POINTS_QUERY_KEY } from '../constants/task-names';
import { useCurrentLocation } from '../hooks/use-current-location';
import {
    useLiveDistance,
    useLiveLatestPoint,
    useLiveSessionPoints,
} from '../hooks/use-live-session';
import { useSessionRecording } from '../hooks/use-session-recording';
import { setBackgroundActive } from '../lib/session-store';

import { BackgroundStatusBanner } from '../components/gps/background-status-banner';
import { ErrorBanner } from '../components/gps/error-banner';
import { RouteMap } from '../components/gps/route-map';
import { formatElapsedTimeMs } from '../lib/time-format';

// ─── ユーティリティ ──────────────────────────────────────────────────────────

function mpsToKmh(mps: number): string {
  return (mps * 3.6).toFixed(1);
}

function formatDistance(km: number | undefined): string {
  if (km === undefined) return '--- km';
  return km >= 1 ? `${km.toFixed(2)} km` : `${(km * 1000).toFixed(0)} m`;
}

// ─── コンポーネント ──────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    status,
    activeSessionId,
    activeSessionStartedAt,
    error,
    start,
    pause,
    resume,
    stop,
  } = useSessionRecording();

  const isRecording = status === 'recording';
  const isActive    = status === 'recording' || status === 'paused';
  const isLoading   = status === 'loading';
  const { bottom }  = useSafeAreaInsets();
  const { location: currentLocation } = useCurrentLocation(true);

  // ── ライブデータ ───────────────────────────────────────────────────────────
  const { data: points = [] }  = useLiveSessionPoints(activeSessionId, isRecording);
  const { data: latestPoint }  = useLiveLatestPoint(activeSessionId, isRecording);
  const { data: distanceKm }   = useLiveDistance(activeSessionId, isRecording);

  // 経過時間を 1 秒ごとに再描画（アクティブセッション中のみ）
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => forceUpdate((n) => n + 1), 1_000);
    return () => clearInterval(id);
  }, [isActive]);

  // ── バックグラウンド検知 ──────────────────────────────────────────────────
  const appStateRef     = useRef<AppStateStatus>(AppState.currentState);
  const [isBg, setIsBg] = useState(false);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(0);

  const handleAppStateChange = useCallback(
    (nextState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (activeSessionId === null) return;

      if (prev === 'active' && nextState !== 'active' && isRecording) {
        setIsBg(true);
        setBackgroundActive(activeSessionId, true).catch(() => {});
      } else if (prev !== 'active' && nextState === 'active') {
        setIsBg(false);
        setBackgroundActive(activeSessionId, false).catch(() => {});
        if (isActive) {
          queryClient.invalidateQueries({
            queryKey: [SESSION_POINTS_QUERY_KEY, activeSessionId],
          }).catch(() => {});
        }
      }
    },
    [activeSessionId, isActive, isRecording, queryClient],
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [handleAppStateChange]);

  const handleBottomPanelLayout = useCallback((event: LayoutChangeEvent) => {
    setBottomPanelHeight(event.nativeEvent.layout.height);
  }, []);

  const elapsedMs = activeSessionStartedAt !== null
    ? Math.max(0, Date.now() - activeSessionStartedAt)
    : 0;

  // ── レンダリング ──────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>

      {/* 地図：画面全体に広がる */}
      <RouteMap
        points={points}
        currentLocation={currentLocation}
        style={StyleSheet.absoluteFill}
        recenterBottomOffset={bottomPanelHeight}
      />

      {/* 上部オーバーレイ：ステータスバッジ + バナー類 */}
      <SafeAreaView edges={['top']} pointerEvents="box-none" style={styles.topOverlay}>
        <View style={styles.topContent} pointerEvents="box-none">
          <View style={styles.topButtons} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.listButton}
              onPress={() => router.push('/sessions')}
              activeOpacity={0.75}
            >
              <Text style={styles.listButtonText}>≡</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.listButton}
              onPress={() => router.push('/settings')}
              activeOpacity={0.75}
            >
              <Text style={styles.listButtonText}>⚙</Text>
            </TouchableOpacity>
          </View>
          {isBg && isRecording && <BackgroundStatusBanner isBackgroundActive />}
          {error !== null && <ErrorBanner message={error} />}
        </View>
      </SafeAreaView>

      {/* ボトムパネル */}
      <View
        style={[styles.bottomPanel, { paddingBottom: Math.max(bottom, 16) }]}
        onLayout={handleBottomPanelLayout}
      >
        {/* ライブ統計（アクティブ時のみ） */}
        {isActive && (
          <View style={styles.statsRow}>
            <StatCell
              label="経過"
              value={formatElapsedTimeMs(elapsedMs)}
              mono
            />
            <View style={styles.statsDivider} />
            <StatCell
              label="速度"
              value={latestPoint?.speed != null ? `${mpsToKmh(latestPoint.speed)} km/h` : '---'}
            />
            <View style={styles.statsDivider} />
            <StatCell
              label="移動距離"
              value={formatDistance(distanceKm)}
            />
          </View>
        )}

        {/* コントロールボタン */}
        <View style={styles.controls}>
          {status === 'idle' && (
            <ControlButton label="● 記録を開始" color="green" onPress={start} />
          )}
          {status === 'recording' && (
            <>
              <ControlButton label="⏸ 一時停止" color="amber" onPress={pause} half />
              <ControlButton label="■ 停止・完了" color="red" onPress={stop} half />
            </>
          )}
          {status === 'paused' && (
            <>
              <ControlButton label="▶ 再開" color="green" onPress={resume} half />
              <ControlButton label="■ 完了" color="red" onPress={stop} half />
            </>
          )}
          {isLoading && (
            <View style={[styles.btn, styles.btnGray]}>
              <Text style={styles.btnText}>処理中...</Text>
            </View>
          )}
        </View>

      </View>
    </View>
  );
}

// ─── 小コンポーネント ────────────────────────────────────────────────────────

type StatCellProps = {
  label: string;
  value: string;
  mono?: boolean;
};

function StatCell({ label, value, mono }: StatCellProps) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statValue, mono && styles.statValueMono]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

type ControlButtonProps = {
  label: string;
  color: 'green' | 'amber' | 'red';
  onPress: () => void;
  half?: boolean;
};

const BTN_COLORS = {
  green: '#15803d',
  amber: '#b45309',
  red:   '#991b1b',
} as const;

function ControlButton({ label, color, onPress, half }: ControlButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: BTN_COLORS[color] }, half && styles.btnHalf]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.btnText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── スタイル ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0d1117',
  },

  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topContent: {
    padding: 12,
    gap: 8,
  },
  topButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  listButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listButtonText: {
    fontSize: 20,
    color: '#f1f5f9',
    lineHeight: 24,
  },

  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(13, 17, 23, 0.92)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.12)',
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statsDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  statValueMono: {
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
  },

  controls: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnHalf: {
    flex: 1,
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  btnGray: {
    backgroundColor: '#374151',
  },
});
