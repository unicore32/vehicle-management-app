import { getDatabase } from './database/client';

// ─── 型定義 ───────────────────────────────────────────────────────────────────

export type LocationData = {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  speed: number | null;
  timestamp: number;
};

export type StoredLocation = LocationData & {
  id: number;
  created_at: number;
};

// ─── Skill 実装 ───────────────────────────────────────────────────────────────

/**
 * @skill record_gps_trace
 * @description GPS 座標を expo-sqlite に永続化する。
 *   expo-task-manager のバックグラウンドタスクから呼ばれる。
 * @param {LocationData} location - expo-location から受け取った座標データ
 * @returns {Promise<void>}
 */
export async function insertLocation(location: LocationData): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO locations (latitude, longitude, altitude, accuracy, speed, timestamp)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      location.latitude,
      location.longitude,
      location.altitude,
      location.accuracy,
      location.speed,
      location.timestamp,
    ],
  );
}

/**
 * @skill query_location_history
 * @description 保存済み GPS ログを新しい順で取得する。
 * @param {number} [limit] - 取得件数の上限（省略時は全件）
 * @returns {Promise<StoredLocation[]>}
 *
 * @remarks
 * 大量のログが蓄積された場合のパフォーマンス対策として、
 * 以下のように上限を設定することを推奨:
 * ```ts
 * // 最大件数を有効にする場合は limit を渡す
 * const MAX_RECORDS = 10_000;
 * const locations = await getLocations(MAX_RECORDS);
 * ```
 */
export async function getLocations(limit?: number): Promise<StoredLocation[]> {
  const db = await getDatabase();

  // NOTE: 上限を設けたい場合は以下を有効化してください
  // const effectiveLimit = limit ?? 10_000;
  // return db.getAllAsync<StoredLocation>(
  //   'SELECT * FROM locations ORDER BY timestamp DESC LIMIT ?',
  //   [effectiveLimit],
  // );

  if (limit !== undefined) {
    return db.getAllAsync<StoredLocation>(
      'SELECT * FROM locations ORDER BY timestamp DESC LIMIT ?',
      [limit],
    );
  }
  return db.getAllAsync<StoredLocation>(
    'SELECT * FROM locations ORDER BY timestamp DESC',
  );
}

/**
 * @skill clear_location_history
 * @description 保存済みの全 GPS ログを削除する。
 * @returns {Promise<void>}
 */
export async function clearLocations(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM locations');
}

/**
 * 記録件数を返す（ダッシュボードの件数表示用）。
 */
export async function getLocationCount(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM locations',
  );
  return row?.count ?? 0;
}
