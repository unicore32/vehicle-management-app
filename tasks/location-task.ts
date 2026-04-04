/**
 * バックグラウンド位置情報タスク。
 *
 * ⚠️ このファイルはアプリのエントリーポイント（app/_layout.tsx）から
 *    import されることで、OS 起動後の再開時にもタスクが復元される。
 *
 * ⚠️ SQLite について（重要）:
 *    expo-task-manager のバックグラウンドタスクは独立した JS コンテキストで実行される。
 *    openDatabaseAsync の非同期キューはそのコンテキストでは初期化されず
 *    NativeDatabase.execAsync/prepareAsync が NullPointerException を起こす。
 *    → openDatabaseSync + 同期 API を使うことで回避する。
 */
import * as TaskManager from 'expo-task-manager';
import * as SQLite from 'expo-sqlite';
import type * as Location from 'expo-location';
import { CREATE_LOCATIONS_TABLE } from '../lib/database/schema';
import { LOCATION_TASK_NAME } from '../constants/task-names';

type LocationTaskData = {
  locations: Location.LocationObject[];
};

type TaskExecutorBody<T> = {
  data: T;
  error: TaskManager.TaskManagerError | null;
};

/**
 * バックグラウンドタスク専用の位置情報保存関数。
 * 同期 API を使用し、メインアプリの非同期キューとの競合を回避する。
 * 必ず finally で closeSync() を呼び、ネイティブ接続を解放する。
 */
function persistLocationsSync(locations: Location.LocationObject[]): void {
  const db = SQLite.openDatabaseSync('gps_logger.db');
  try {
    db.execSync(CREATE_LOCATIONS_TABLE);

    for (const location of locations) {
      db.runSync(
        `INSERT INTO locations (latitude, longitude, altitude, accuracy, speed, timestamp)
         VALUES (?, ?, ?, ?, ?, ?)`,
        location.coords.latitude,
        location.coords.longitude,
        location.coords.altitude ?? null,
        location.coords.accuracy ?? null,
        location.coords.speed ?? null,
        location.timestamp,
      );
    }
  } finally {
    db.closeSync();
  }
}

TaskManager.defineTask(
  LOCATION_TASK_NAME,
  async ({ data, error }: TaskExecutorBody<LocationTaskData>) => {
    if (error) {
      console.error('[LocationTask] バックグラウンドタスクエラー:', error.message);
      return;
    }

    const { locations } = data;
    try {
      persistLocationsSync(locations);
    } catch (e) {
      console.error('[LocationTask] 位置情報の保存に失敗:', e);
    }
  },
);
