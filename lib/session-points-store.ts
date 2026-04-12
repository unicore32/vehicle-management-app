import { getDatabase } from './database/client';
import type { SessionStats } from './session-store';

// ─── 型定義 ───────────────────────────────────────────────────────────────────

export type SessionPoint = {
  id: number;
  session_id: number;
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  speed: number | null;
  timestamp: number;
  created_at: number;
};

export type SessionPointInput = Omit<SessionPoint, 'id' | 'created_at'>;

// ─── 距離計算 ─────────────────────────────────────────────────────────────────

/**
 * 2 点間のハバーサイン距離（メートル）。
 */
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6_371_000; // 地球半径 [m]
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── 書き込み ─────────────────────────────────────────────────────────────────

/**
 * @skill record_gps_trace
 * @description GPS ポイントをセッションに紐付けて保存する。
 *   メインアプリ（非同期 API）用。バックグラウンドタスクは
 *   location-task.ts 内の同期版を使うこと。
 *
 * @param points 書き込むポイントの配列
 */
export async function insertSessionPoints(
  points: SessionPointInput[],
): Promise<void> {
  if (points.length === 0) return;
  const db = await getDatabase();
  for (const p of points) {
    await db.runAsync(
      `INSERT INTO session_points
         (session_id, latitude, longitude, altitude, accuracy, speed, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      p.session_id,
      p.latitude,
      p.longitude,
      p.altitude,
      p.accuracy,
      p.speed,
      p.timestamp,
    );
  }
}

// ─── 読み取り ─────────────────────────────────────────────────────────────────

/**
 * @skill query_location_history
 * @description 指定セッションのポイントを時系列昇順で返す。
 *
 * @param sessionId 対象セッション ID
 * @param limit 取得件数の上限（省略時は全件）
 */
export async function getSessionPoints(
  sessionId: number,
  limit?: number,
): Promise<SessionPoint[]> {
  const db = await getDatabase();
  if (limit !== undefined) {
    return db.getAllAsync<SessionPoint>(
      `SELECT * FROM session_points
       WHERE session_id = ?
       ORDER BY timestamp ASC
       LIMIT ?`,
      sessionId,
      limit,
    );
  }
  return db.getAllAsync<SessionPoint>(
    `SELECT * FROM session_points
     WHERE session_id = ?
     ORDER BY timestamp ASC`,
    sessionId,
  );
}

/**
 * 指定セッションの最新ポイントを時系列昇順で返す。
 * 地図表示で「現在地付近の直近軌跡」を優先したい場合に使う。
 */
export async function getRecentSessionPoints(
  sessionId: number,
  limit: number,
): Promise<SessionPoint[]> {
  const db = await getDatabase();
  return db.getAllAsync<SessionPoint>(
    `SELECT * FROM (
       SELECT * FROM session_points
       WHERE session_id = ?
       ORDER BY timestamp DESC
       LIMIT ?
     ) recent_points
     ORDER BY timestamp ASC`,
    sessionId,
    limit,
  );
}

/**
 * 指定セッションの最新ポイントを 1 件返す。
 */
export async function getLatestSessionPoint(
  sessionId: number,
): Promise<SessionPoint | null> {
  const db = await getDatabase();
  return db.getFirstAsync<SessionPoint>(
    `SELECT * FROM session_points
     WHERE session_id = ?
     ORDER BY timestamp DESC
     LIMIT 1`,
    sessionId,
  );
}

/**
 * 指定セッションのポイント数を返す（ライブカウント用）。
 */
export async function getSessionPointCount(sessionId: number): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM session_points WHERE session_id = ?',
    sessionId,
  );
  return row?.count ?? 0;
}

/**
 * 指定セッションの累積走行距離（km）をリアルタイムで計算して返す。
 * 全ポイントの lat/lon のみを取得して JS でハバーサイン計算する。
 * stop 時の精確な距離算出は computeSessionStats を使うこと。
 */
export async function computeLiveDistance(sessionId: number): Promise<number> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ latitude: number; longitude: number }>(
    `SELECT latitude, longitude FROM session_points
     WHERE session_id = ?
     ORDER BY timestamp ASC`,
    sessionId,
  );

  let distM = 0;
  for (let i = 1; i < rows.length; i++) {
    distM += haversineDistance(
      rows[i - 1].latitude, rows[i - 1].longitude,
      rows[i].latitude,     rows[i].longitude,
    );
  }
  return distM / 1_000; // → km
}

// ─── 統計計算 ─────────────────────────────────────────────────────────────────

/** 停止判定の最低速度閾値（m/s）= 約 1.8 km/h */
const MIN_MOVING_SPEED_MS = 0.5;

/** この秒数以上のポイント間隔は移動時間に含めない（GPS 途切れ判定） */
const MAX_MOVING_GAP_S = 30;

/**
 * セッションの最終統計を計算して返す。
 * 停止ボタン押下後、finishSession() に渡す。
 *
 * - distance_m  : 連続ポイント間のハバーサイン距離の合計
 * - moving_time_s : 速度が閾値以上かつポイント間隔が MAX_MOVING_GAP_S 未満の区間の合計
 * - avg_speed   : distance_m / moving_time_s（0除算は 0 に丸める）
 * - max_speed   : ポイントの speed の最大値
 * - point_count : 総ポイント数
 */
export async function computeSessionStats(
  sessionId: number,
): Promise<SessionStats> {
  const db = await getDatabase();
  const points = await db.getAllAsync<SessionPoint>(
    `SELECT * FROM session_points
     WHERE session_id = ?
     ORDER BY timestamp ASC`,
    sessionId,
  );

  if (points.length === 0) {
    return { distance_m: 0, moving_time_s: 0, avg_speed: 0, max_speed: 0, point_count: 0 };
  }

  let distance_m = 0;
  let moving_time_s = 0;
  let max_speed = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    distance_m += haversineDistance(
      prev.latitude, prev.longitude,
      curr.latitude, curr.longitude,
    );

    const timeDiff = (curr.timestamp - prev.timestamp) / 1_000;
    const speed = curr.speed ?? 0;

    if (timeDiff < MAX_MOVING_GAP_S && speed >= MIN_MOVING_SPEED_MS) {
      moving_time_s += timeDiff;
    }

    if (speed > max_speed) max_speed = speed;
  }

  const avg_speed = moving_time_s > 0 ? distance_m / moving_time_s : 0;

  return {
    distance_m,
    moving_time_s,
    avg_speed,
    max_speed,
    point_count: points.length,
  };
}
