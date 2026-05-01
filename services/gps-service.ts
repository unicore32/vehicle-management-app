import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { LOCATION_TASK_NAME } from '../constants/task-names';
import { getRecordingIntervalS, RECORDING_INTERVAL_S_DEFAULT } from '../lib/app-state-store';
import { gpsDebug } from '../lib/gps-debug';
import { computeSessionStats } from '../lib/session-points-store';
import type { CreatedSession } from '../lib/session-store';
import {
    createSessionRecord,
    finishSession,
    getActiveSession,
    type StartSessionInput,
    type StopSessionInput,
    updateSessionStatus,
} from '../lib/session-store';

// ─── 権限チェック ─────────────────────────────────────────────────────────────

async function requestLocationPermissions(): Promise<void> {
  const { status: fgStatus } =
    await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') {
    throw new Error(
      '前景位置情報の許可が必要です。設定から位置情報アクセスを許可してください。',
    );
  }

  const { status: bgStatus } =
    await Location.requestBackgroundPermissionsAsync();
  if (bgStatus !== 'granted') {
    throw new Error(
      'バックグラウンド位置情報の許可が必要です。設定から「常に許可」を選択してください。',
    );
  }
}

// ─── バックグラウンドタスク制御 ───────────────────────────────────────────────

async function startLocationUpdates(): Promise<void> {
  const recordingIntervalS = await getRecordingIntervalS().catch(() => RECORDING_INTERVAL_S_DEFAULT);
  gpsDebug('starting location updates', { taskName: LOCATION_TASK_NAME });
  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: recordingIntervalS * 1_000,
    distanceInterval: 10,  // または 10 m 移動ごと
    foregroundService: {
      notificationTitle: 'GPS 記録中',
      notificationBody: 'バックグラウンドで走行ログを記録しています',
      notificationColor: '#0a7ea4',
    },
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
  });
}

async function stopLocationUpdates(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (isRegistered) {
    gpsDebug('stopping location updates', { taskName: LOCATION_TASK_NAME });
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
}

// ─── セッションライフサイクル ─────────────────────────────────────────────────

/**
 * @skill manage_background_service
 * @description 新しいセッションを作成してバックグラウンド GPS 記録を開始する。
 *
 * @returns 作成したセッションの ID と開始時刻
 * @throws 位置情報権限が拒否された場合
 */
export async function startRecordingService(input?: StartSessionInput): Promise<CreatedSession> {
  await requestLocationPermissions();
  const session = await createSessionRecord(input);
  gpsDebug('recording started', { sessionId: session.id });
  await startLocationUpdates();
  return session;
}

/**
 * @skill manage_background_service
 * @description 現在のセッションを一時停止する。
 *   セッションは残ったまま、バックグラウンドタスクのみ停止する。
 *
 * @param sessionId 対象セッション ID
 */
export async function pauseRecordingService(sessionId: number): Promise<void> {
  await stopLocationUpdates();
  await updateSessionStatus(sessionId, 'paused', 'user_pause');
  gpsDebug('recording paused', { sessionId, reason: 'user_pause' });
}

/**
 * @skill manage_background_service
 * @description 一時停止中のセッションを再開する。
 *
 * @param sessionId 対象セッション ID
 */
export async function resumeRecordingService(sessionId: number): Promise<void> {
  await requestLocationPermissions();
  await updateSessionStatus(sessionId, 'recording');
  await startLocationUpdates();
  gpsDebug('recording resumed', { sessionId });
}

/**
 * @skill manage_background_service
 * @description セッションを完了して GPS 記録を終了する。
 *   最終統計を計算して sessions テーブルに書き込む。
 *
 * @param sessionId 対象セッション ID
 */
export async function stopRecordingService(
  sessionId: number,
  input?: StopSessionInput,
): Promise<void> {
  await stopLocationUpdates();
  const stats = await computeSessionStats(sessionId);
  await finishSession(sessionId, stats, input);
  gpsDebug('recording stopped', { sessionId, stats });
}

/**
 * バックグラウンドタスクが現在登録（実行中）かどうかを返す。
 * アプリ起動時の状態復元に使用する。
 */
export async function isBackgroundTaskRunning(): Promise<boolean> {
  return TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
}

/**
 * アクティブセッション（recording / paused）が存在すれば返す。
 * アプリ起動時のクラッシュリカバリに使用する。
 */
export { getActiveSession };
