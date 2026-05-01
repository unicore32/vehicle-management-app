import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View, type AppStateStatus, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SESSION_POINTS_QUERY_KEY, VEHICLES_QUERY_KEY } from '../constants/task-names';
import { useCurrentLocation } from '../hooks/use-current-location';
import {
    useLiveDistance,
    useLiveLatestPoint,
    useLiveSessionPoints,
} from '../hooks/use-live-session';
import { useSessionRecording } from '../hooks/use-session-recording';
import { getSession, setBackgroundActive } from '../lib/session-store';
import { getVehicles } from '../lib/vehicle-store';

import { BackgroundStatusBanner } from '../components/gps/background-status-banner';
import { ErrorBanner } from '../components/gps/error-banner';
import { RouteMap } from '../components/gps/route-map';
import { SessionVehicleModal } from '../components/gps/session-vehicle-modal';
import { formatElapsedTimeMs } from '../lib/time-format';

// ─── ユーティリティ ──────────────────────────────────────────────────────────

function mpsToKmh(mps: number): string {
  return (mps * 3.6).toFixed(1);
}

function formatDistance(km: number | undefined): string {
  if (km === undefined) return '--- km';
  return km >= 1 ? `${km.toFixed(2)} km` : `${(km * 1000).toFixed(0)} m`;
}

function parseOdometerInput(value: string): number | null {
  const normalized = value.trim();
  if (normalized.length === 0) return null;
  if (!/^\d+$/.test(normalized)) {
    throw new Error('メーター距離は 0 以上の整数で入力してください');
  }

  return Number(normalized);
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
  const { data: vehicles = [] } = useQuery({
    queryKey: [VEHICLES_QUERY_KEY, 'active'],
    queryFn: () => getVehicles(),
    staleTime: 30_000,
  });
  const { data: activeSessionSummary } = useQuery({
    queryKey: ['session_home_summary', activeSessionId],
    queryFn: () => getSession(activeSessionId as number),
    enabled: activeSessionId !== null,
    staleTime: 5_000,
  });

  // ── ライブデータ ───────────────────────────────────────────────────────────
  const { data: points = [] }  = useLiveSessionPoints(activeSessionId, isRecording);
  const { data: latestPoint }  = useLiveLatestPoint(activeSessionId, isRecording);
  const { data: distanceKm }   = useLiveDistance(activeSessionId, isRecording);

  const [showStartModal, setShowStartModal] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [startOdometerInput, setStartOdometerInput] = useState('');
  const [stopOdometerInput, setStopOdometerInput] = useState('');
  const [startModalError, setStartModalError] = useState<string | null>(null);
  const [stopModalError, setStopModalError] = useState<string | null>(null);

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

  const openStartModal = useCallback(() => {
    setSelectedVehicleId(null);
    setStartOdometerInput('');
    setStartModalError(null);
    setShowStartModal(true);
  }, []);

  const openStopModal = useCallback(() => {
    setStopOdometerInput(
      activeSessionSummary?.odometer_end_km !== null && activeSessionSummary?.odometer_end_km !== undefined
        ? String(activeSessionSummary.odometer_end_km)
        : '',
    );
    setStopModalError(null);
    setShowStopModal(true);
  }, [activeSessionSummary]);

  const handleStartConfirm = useCallback(async () => {
    try {
      const odometerStartKm = selectedVehicleId === null
        ? null
        : parseOdometerInput(startOdometerInput);
      await start({
        vehicleId: selectedVehicleId,
        odometerStartKm,
      });
      setShowStartModal(false);
    } catch (e) {
      setStartModalError(e instanceof Error ? e.message : '開始メーター距離を確認してください');
    }
  }, [selectedVehicleId, startOdometerInput, start]);

  const handleStopConfirm = useCallback(async () => {
    try {
      const odometerEndKm = activeSessionSummary?.vehicle_id == null
        ? null
        : parseOdometerInput(stopOdometerInput);
      await stop({ odometerEndKm });
      setShowStopModal(false);
    } catch (e) {
      setStopModalError(e instanceof Error ? e.message : '終了メーター距離を確認してください');
    }
  }, [activeSessionSummary?.vehicle_id, stop, stopOdometerInput]);

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

        {activeSessionSummary?.vehicle_display_name !== null &&
          activeSessionSummary?.vehicle_display_name !== undefined && (
            <View style={styles.vehiclePill}>
              <Text style={styles.vehiclePillText}>
                車両: {activeSessionSummary.vehicle_display_name}
              </Text>
            </View>
          )}

        {/* コントロールボタン */}
        <View style={styles.controls}>
          {status === 'idle' && (
            <ControlButton label="● 記録を開始" color="green" onPress={openStartModal} />
          )}
          {status === 'recording' && (
            <>
              <ControlButton label="⏸ 一時停止" color="amber" onPress={pause} half />
              <ControlButton label="■ 停止・完了" color="red" onPress={openStopModal} half />
            </>
          )}
          {status === 'paused' && (
            <>
              <ControlButton label="▶ 再開" color="green" onPress={resume} half />
              <ControlButton label="■ 完了" color="red" onPress={openStopModal} half />
            </>
          )}
          {isLoading && (
            <View style={[styles.btn, styles.btnGray]}>
              <Text style={styles.btnText}>処理中...</Text>
            </View>
          )}
        </View>

      </View>

      <SessionVehicleModal
        visible={showStartModal}
        title='記録を開始'
        confirmLabel='開始する'
        description='必要なら車両と開始メーター距離を入力してください。未選択のまま開始することもできます。'
        vehicles={vehicles}
        selectedVehicleId={selectedVehicleId}
        startOdometerValue={startOdometerInput}
        errorMessage={startModalError}
        extraActionLabel={vehicles.length === 0 ? '車両を追加' : '車両管理を開く'}
        onSelectVehicle={(vehicleId) => {
          setSelectedVehicleId(vehicleId);
          if (vehicleId === null) {
            setStartOdometerInput('');
          }
          setStartModalError(null);
        }}
        onChangeStartOdometer={(value) => {
          setStartOdometerInput(value);
          setStartModalError(null);
        }}
        onConfirm={handleStartConfirm}
        onCancel={() => setShowStartModal(false)}
        onExtraAction={() => {
          setShowStartModal(false);
          router.push('/vehicles');
        }}
      />

      <SessionVehicleModal
        visible={showStopModal}
        title='記録を完了'
        confirmLabel='保存して完了'
        description={
          activeSessionSummary?.vehicle_display_name != null
            ? `車両: ${activeSessionSummary.vehicle_display_name}`
            : 'このセッションには車両が紐づいていません。'
        }
        vehicles={vehicles}
        selectedVehicleId={activeSessionSummary?.vehicle_id ?? null}
        endOdometerValue={stopOdometerInput}
        errorMessage={stopModalError}
        vehicleSelectionDisabled
        onSelectVehicle={() => {}}
        onChangeEndOdometer={(value) => {
          setStopOdometerInput(value);
          setStopModalError(null);
        }}
        onConfirm={handleStopConfirm}
        onCancel={() => setShowStopModal(false)}
      />
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
  vehiclePill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(15, 118, 110, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.32)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  vehiclePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ccfbf1',
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
