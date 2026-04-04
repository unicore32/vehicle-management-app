import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { LOCATION_TASK_NAME } from '../constants/task-names';

// ─── Skill 実装 ───────────────────────────────────────────────────────────────

/**
 * @skill manage_background_service
 * @description バックグラウンド GPS 記録を開始する。
 *   Android では expo-location の foregroundService オプションが
 *   Foreground Service 通知を自動発行し OS によるプロセスキルを防ぐ。
 *   （expo-notifications は不要: expo-location が内部で管理する）
 *
 *   前景・バックグラウンド位置情報の両権限を要求し、
 *   いずれか未付与の場合は Error をスローする。
 *
 * @throws {Error} 位置情報権限が拒否された場合
 * @returns {Promise<void>}
 */
export async function startBackgroundLocationService(): Promise<void> {
  // ── 前景権限の要求 ──────────────────────────────────────────────────────────
  const { status: fgStatus } =
    await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') {
    throw new Error(
      '前景位置情報の許可が必要です。設定から位置情報アクセスを許可してください。',
    );
  }

  // ── バックグラウンド権限の要求 ─────────────────────────────────────────────
  const { status: bgStatus } =
    await Location.requestBackgroundPermissionsAsync();
  if (bgStatus !== 'granted') {
    throw new Error(
      'バックグラウンド位置情報の許可が必要です。設定から「常に許可」を選択してください。',
    );
  }

  // ── バックグラウンドタスクの開始 ───────────────────────────────────────────
  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 5_000,   // 5 秒ごと（車・バイク向け）
    distanceInterval: 10,  // または 10 m 移動ごと
    // Android: expo-location が内部でチャンネルを作成し Foreground Service 通知を発行する
    // development build が必要（Expo Go 非対応）
    foregroundService: {
      notificationTitle: 'GPS 記録中',
      notificationBody: 'バックグラウンドで走行ログを記録しています',
      notificationColor: '#0a7ea4',
    },
    // Android: アクティビティ認識による自動一時停止を無効化
    // 停車中でも一定間隔で位置を記録し続ける
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true, // iOS: バックグラウンド使用中インジケーター
  });
}

/**
 * @skill manage_background_service
 * @description バックグラウンド GPS 記録を停止する。
 *   タスクが未登録の場合は何もしない（冪等性を保証）。
 * @returns {Promise<void>}
 */
export async function stopBackgroundLocationService(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(
    LOCATION_TASK_NAME,
  );
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
}

/**
 * バックグラウンド記録が現在アクティブかどうかを返す。
 */
export async function isRecordingActive(): Promise<boolean> {
  return TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
}
