import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GapCorrectionPanel } from '../../components/gps/gap-correction-panel';
import { RoutePlaybackSlider } from '../../components/gps/route-playback-slider';
import { RoutePreviewMap } from '../../components/gps/route-preview-map';
import { SessionDetailActions } from '../../components/gps/session-detail-actions';
import { SessionDetailStats } from '../../components/gps/session-detail-stats';
import { SessionVehicleInfo } from '../../components/gps/session-vehicle-info';
import { SessionVehicleModal } from '../../components/gps/session-vehicle-modal';
import { ConfirmDialog } from '../../components/shared/confirm-dialog';
import { ErrorState } from '../../components/shared/error-state';
import { LoadingState } from '../../components/shared/loading-state';
import {
  getTileAttribution,
  getTileAttributionUrl,
  resolveTileServerKey,
} from '../../constants/map-config';
import { SESSION_DETAIL_QUERY_KEY, VEHICLES_QUERY_KEY } from '../../constants/task-names';
import {
  useDeleteSession,
  useSessionDetail,
  useUpdateSessionVehicleInfo,
} from '../../hooks/use-session-detail';
import { useSessionPlayback } from '../../hooks/use-session-playback';
import { exportGpx } from '../../lib/gpx-export';
import { getVehicles } from '../../lib/vehicle-store';

function parseOdometerInput(value: string): number | null {
  const normalized = value.trim();
  if (normalized.length === 0) return null;
  if (!/^\d+$/.test(normalized)) {
    throw new Error('メーター距離は 0 以上の整数で入力してください');
  }

  return Number(normalized);
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

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

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = Number(id);

  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useSessionDetail(sessionId);
  const { mutate: deleteSession, isPending: isDeleting } = useDeleteSession();
  const { mutateAsync: updateVehicleInfo, isPending: isSavingVehicleInfo } = useUpdateSessionVehicleInfo();
  const { data: vehicles = [] } = useQuery({
    queryKey: [VEHICLES_QUERY_KEY, 'all'],
    queryFn: () => getVehicles({ includeInactive: true }),
    staleTime: 30_000,
  });

  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showVehicleEditor, setShowVehicleEditor] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [startOdometerInput, setStartOdometerInput] = useState('');
  const [endOdometerInput, setEndOdometerInput] = useState('');
  const [vehicleEditorError, setVehicleEditorError] = useState<string | null>(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const { height: windowHeight } = useWindowDimensions();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['16%', '48%', '86%'], []);

  const points = data?.points ?? [];
  const gaps = data?.gaps ?? [];

  const playback = useSessionPlayback(points);
  const visiblePoints = points.filter((point) => point.timestamp <= playback.currentTimestamp);
  const attributionCenter: [number, number] =
    visiblePoints.length > 0
      ? [visiblePoints[visiblePoints.length - 1].longitude, visiblePoints[visiblePoints.length - 1].latitude]
      : points.length > 0
        ? [points[0].longitude, points[0].latitude]
        : [139.6917, 35.6895];
  const tileServerKey = resolveTileServerKey(attributionCenter);

  const minTs = points.length > 0 ? points[0].timestamp : 0;
  const maxTs = points.length > 0 ? points[points.length - 1].timestamp : 0;
  const hasPlayback = points.length >= 2 && minTs < maxTs;
  const sheetHeights = [
    Math.round(windowHeight * 0.16),
    Math.round(windowHeight * 0.48),
    Math.round(windowHeight * 0.86),
  ];
  const sheetHeight = sheetHeights[sheetIndex] ?? sheetHeights[0];

  if (isLoading) return <LoadingState />;
  if (isError || data === undefined) return <ErrorState />;

  const { session } = data;

  async function handleExport() {
    setIsExporting(true);
    try {
      await exportGpx(points, session.started_at);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'エクスポートに失敗しました';
      Alert.alert('エクスポートエラー', msg);
    } finally {
      setIsExporting(false);
    }
  }

  function handleGapCorrected() {
    queryClient.invalidateQueries({
      queryKey: [SESSION_DETAIL_QUERY_KEY, sessionId],
    });
  }

  function handleDeleteConfirm() {
    setShowDeleteDialog(false);
    deleteSession(sessionId, {
      onSuccess: () => router.back(),
      onError: () => Alert.alert('エラー', '削除に失敗しました'),
    });
  }

  function openVehicleEditor() {
    setSelectedVehicleId(session.vehicle_id);
    setStartOdometerInput(session.odometer_start_km !== null ? String(session.odometer_start_km) : '');
    setEndOdometerInput(session.odometer_end_km !== null ? String(session.odometer_end_km) : '');
    setVehicleEditorError(null);
    setShowVehicleEditor(true);
  }

  async function handleVehicleEditorConfirm() {
    try {
      const odometerStartKm = selectedVehicleId === null ? null : parseOdometerInput(startOdometerInput);
      const odometerEndKm = selectedVehicleId === null ? null : parseOdometerInput(endOdometerInput);
      await updateVehicleInfo({
        sessionId,
        input: {
          vehicleId: selectedVehicleId,
          odometerStartKm,
          odometerEndKm,
        },
      });
      setShowVehicleEditor(false);
    } catch (e) {
      setVehicleEditorError(e instanceof Error ? e.message : '車両情報の更新に失敗しました');
    }
  }

  return (
    <View style={styles.root}>
      <RoutePreviewMap
        points={points}
        gaps={gaps}
        currentTimestamp={playback.currentTimestamp}
        style={styles.map}
        cameraPaddingBottom={sheetHeight + 40}
        showAttribution={false}
      />

      <View
        pointerEvents='box-none'
        style={styles.attributionOverlay}
      >
        <TouchableOpacity
          style={styles.attribution}
          onPress={() => Linking.openURL(getTileAttributionUrl(tileServerKey))}
          testID='session-map-attribution-link'
        >
          <Text style={styles.attributionText}>{getTileAttribution(tileServerKey)}</Text>
        </TouchableOpacity>
      </View>

      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        onChange={(index) => setSheetIndex(index)}
        enablePanDownToClose={false}
        backgroundStyle={styles.sheet}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <BottomSheetScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.scrollContent}
          nestedScrollEnabled
          showsVerticalScrollIndicator
          bounces={false}
        >
          <View style={styles.summaryCard}>
            <View style={styles.summaryTopRow}>
              <View style={styles.summaryStartBlock}>
                <Text style={styles.summaryStartValue}>{formatDateTime(session.started_at)}</Text>
                <Text style={styles.summaryEndLabel}>
                  ~ {session.ended_at !== null ? formatDateTime(session.ended_at) : '—'}
                </Text>
              </View>

              <Text style={styles.summaryDistanceValue}>{formatDistance(session.distance_m)}</Text>
            </View>
          </View>

          <View style={styles.sectionStack}>
            <View style={styles.playbackPanel}>
              <View style={styles.playbackHeader}>
                <Text style={styles.playbackTitle}>再生</Text>
                <Text style={styles.playbackState}>
                  {hasPlayback ? (playback.isPlaying ? '再生中' : '停止中') : 'データ不足'}
                </Text>
              </View>

              {hasPlayback ? (
                <>
                  <RoutePlaybackSlider
                    minTimestamp={minTs}
                    maxTimestamp={maxTs}
                    currentTimestamp={playback.currentTimestamp}
                    onSeek={playback.seek}
                  />
                  <View style={styles.playbackControls}>
                    <TouchableOpacity
                      style={styles.playButton}
                      onPress={playback.isPlaying ? playback.pause : playback.play}
                      testID='play-pause-button'
                    >
                      {playback.isPlaying ? (
                        <View style={styles.pauseIcon}>
                          <View style={styles.pauseBar} />
                          <View style={styles.pauseBar} />
                        </View>
                      ) : (
                        <View style={styles.playTriangle} />
                      )}
                    </TouchableOpacity>

                    <View style={styles.speedButtons}>
                      {([1, 2, 4, 8] as const).map((speed) => (
                        <TouchableOpacity
                          key={speed}
                          style={[
                            styles.speedButton,
                            playback.playbackSpeed === speed && styles.speedButtonActive,
                          ]}
                          onPress={() => playback.setSpeed(speed)}
                        >
                          <Text
                            style={[
                              styles.speedButtonText,
                              playback.playbackSpeed === speed && styles.speedButtonTextActive,
                            ]}
                          >
                            {speed}x
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.playbackEmpty}>
                  <Text style={styles.playbackEmptyTitle}>再生できるデータがありません</Text>
                  <Text style={styles.playbackEmptyText}>
                    ポイントが 2 件以上あるセッションで再生できます。
                  </Text>
                </View>
              )}
            </View>

            <SessionDetailStats session={session} />
            <SessionVehicleInfo
              session={session}
              onEdit={session.status === 'finished' ? openVehicleEditor : undefined}
            />
            <GapCorrectionPanel
              gaps={gaps}
              points={points}
              onCorrected={handleGapCorrected}
            />

            <View style={styles.footerActions}>
              <SessionDetailActions
                onExport={handleExport}
                onDelete={() => setShowDeleteDialog(true)}
                isExporting={isExporting}
                isDeleting={isDeleting}
              />
            </View>
          </View>
        </BottomSheetScrollView>
      </BottomSheet>

      <ConfirmDialog
        visible={showDeleteDialog}
        title='セッションを削除'
        message='このセッションを削除しますか？この操作は元に戻せません。'
        confirmLabel='削除'
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteDialog(false)}
        destructive
      />

      <SessionVehicleModal
        visible={showVehicleEditor}
        title='車両情報を編集'
        confirmLabel='保存'
        description='完了済みセッションの車両と開始/終了メーター距離を更新します。'
        vehicles={vehicles}
        selectedVehicleId={selectedVehicleId}
        startOdometerValue={startOdometerInput}
        endOdometerValue={endOdometerInput}
        errorMessage={vehicleEditorError}
        isSubmitting={isSavingVehicleInfo}
        onSelectVehicle={(vehicleId) => {
          setSelectedVehicleId(vehicleId);
          if (vehicleId === null) {
            setStartOdometerInput('');
            setEndOdometerInput('');
          }
          setVehicleEditorError(null);
        }}
        onChangeStartOdometer={(value) => {
          setStartOdometerInput(value);
          setVehicleEditorError(null);
        }}
        onChangeEndOdometer={(value) => {
          setEndOdometerInput(value);
          setVehicleEditorError(null);
        }}
        onConfirm={handleVehicleEditorConfirm}
        onCancel={() => setShowVehicleEditor(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  attributionOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 30,
    elevation: 30,
  },
  attribution: {
    alignSelf: 'flex-start',
  },
  attributionText: {
    fontSize: 10,
    color: '#cbd5e1',
    backgroundColor: 'rgba(2, 6, 23, 0.82)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0d1117',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.12)',
    shadowColor: '#000000',
    shadowOpacity: 0.24,
    shadowOffset: { width: 0, height: -8 },
    shadowRadius: 20,
    elevation: 16,
    overflow: 'hidden',
  },
  sheetContent: {
    flex: 1,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 163, 184, 0.35)',
    marginTop: 10,
    marginBottom: 8,
  },
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryStartBlock: {
    flex: 1,
    minWidth: 0,
  },
  summaryStartValue: {
    fontSize: 18,
    color: '#f1f5f9',
    fontWeight: '700',
    lineHeight: 22,
  },
  summaryEndLabel: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748b',
  },
  summaryDistanceValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f1f5f9',
    textAlign: 'right',
    alignSelf: 'center',
    lineHeight: 26,
  },
  playbackPanel: {
    backgroundColor: '#111827',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
  },
  playbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  playbackTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f1f5f9',
    letterSpacing: 0.4,
  },
  playbackState: {
    fontSize: 13,
    color: '#94a3b8',
  },
  playbackEmpty: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 4,
  },
  playbackEmptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  playbackEmptyText: {
    fontSize: 14,
    lineHeight: 18,
  },
  playbackControls: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  playButton: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playTriangle: {
    marginLeft: 3,
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderTopColor: 'transparent',
    borderBottomWidth: 8,
    borderBottomColor: 'transparent',
    borderLeftWidth: 13,
    borderLeftColor: '#ffffff',
  },
  pauseIcon: {
    flexDirection: 'row',
    gap: 4,
  },
  pauseBar: {
    width: 3,
    height: 14,
    backgroundColor: '#ffffff',
    borderRadius: 1,
  },
  speedButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  speedButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#1e293b',
  },
  speedButtonActive: {
    backgroundColor: '#1d4ed8',
  },
  speedButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  speedButtonTextActive: {
    color: '#f1f5f9',
  },
  sheetScroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  sectionStack: {
    gap: 16,
  },
  footerActions: {
    paddingTop: 4,
    paddingBottom: 12,
    backgroundColor: '#0d1117',
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.08)',
  },
});
