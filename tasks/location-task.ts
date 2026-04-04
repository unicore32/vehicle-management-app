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
 *
 * ⚠️ セッション ID の取得:
 *    メインアプリとこのタスクは別 JS コンテキストなので React state を共有できない。
 *    sessions テーブルの status = 'recording' を直接 SELECT して
 *    アクティブセッションを特定する。
 */
import type * as Location from 'expo-location';
import * as SQLite from 'expo-sqlite';
import * as TaskManager from 'expo-task-manager';
import { LOCATION_TASK_NAME } from '../constants/task-names';
import {
  AUTO_PAUSE_MIN_POINTS,
  AUTO_PAUSE_SPEED_THRESHOLD_MPS,
  getAutoPauseEnabledSync,
  getAutoPauseThresholdSSync,
  getGapThresholdSSync,
} from '../lib/app-state-store';
import {
  CREATE_APP_STATE_TABLE,
  CREATE_DEBUG_LOGS_CREATED_AT_INDEX,
  CREATE_DEBUG_LOGS_TABLE,
  CREATE_SESSIONS_TABLE,
  CREATE_SESSION_GAPS_SESSION_INDEX,
  CREATE_SESSION_GAPS_TABLE,
  CREATE_SESSION_POINTS_SESSION_INDEX,
  CREATE_SESSION_POINTS_TABLE,
} from '../lib/database/schema';
import { gpsDebug } from '../lib/gps-debug';

type LocationTaskData = {
  locations: Location.LocationObject[];
};

type TaskExecutorBody<T> = {
  data: T;
  error: TaskManager.TaskManagerError | null;
};

/**
 * 同期 API でアクティブセッション ID を取得する。
 * sessions テーブルの status = 'recording' を検索する。
 * テーブルが存在しない場合（初回起動直後など）は null を返す。
 */
function getActiveSessionIdSync(db: SQLite.SQLiteDatabase): number | null {
  try {
    const row = db.getFirstSync<{ id: number }>(
      `SELECT id FROM sessions WHERE status = 'recording' ORDER BY started_at DESC LIMIT 1`,
    );
    return row?.id ?? null;
  } catch {
    // テーブル未作成の場合（初回 / DB 破損）は null を返す
    return null;
  }
}


type RecentPoint = { speed: number | null; timestamp: number };

/**
 * セッションの最新ポイントのタイムスタンプを取得する。
 * ポイントが存在しない場合は null を返す。
 */
function getLastPointTimestampSync(
  db: SQLite.SQLiteDatabase,
  sessionId: number,
): number | null {
  try {
    const row = db.getFirstSync<{ timestamp: number }>(
      `SELECT timestamp FROM session_points
       WHERE session_id = ?
       ORDER BY timestamp DESC
       LIMIT 1`,
      sessionId,
    );
    return row?.timestamp ?? null;
  } catch {
    return null;
  }
}

/**
 * 欠損区間を session_gaps に記録する（同期 API）。
 */
function insertGapSync(
  db: SQLite.SQLiteDatabase,
  sessionId: number,
  gapStartedAt: number,
  gapEndedAt: number,
): void {
  gpsDebug('gap detected', { sessionId, gapStartedAt, gapEndedAt });
  db.runSync(
    `INSERT INTO session_gaps
       (session_id, gap_started_at, gap_ended_at, reason, correction_mode)
     VALUES (?, ?, ?, ?, ?)`,
    sessionId,
    gapStartedAt,
    gapEndedAt,
    'gps_timeout',
    'none',
  );
}

/**
 * セッションの直近 N ポイントを取得する（タイムスタンプ降順）。
 */
function getRecentPointsSync(
  db: SQLite.SQLiteDatabase,
  sessionId: number,
  n: number,
): RecentPoint[] {
  try {
    return db.getAllSync<RecentPoint>(
      `SELECT speed, timestamp FROM session_points
       WHERE session_id = ?
       ORDER BY timestamp DESC
       LIMIT ?`,
      sessionId,
      n,
    );
  } catch {
    return [];
  }
}

/**
 * 自動一時停止の条件を満たすか判定する。
 *
 * 条件:
 * 1. MIN_POINTS 個以上の直近ポイントが存在する
 * 2. 全ての speed が AUTO_PAUSE_SPEED_THRESHOLD_MPS 以下（null は 0 として扱う）
 * 3. 最も古いポイントのタイムスタンプから現在までの経過時間が thresholdS を超えている
 */
function shouldAutoPause(
  recentPoints: RecentPoint[],
  thresholdS: number,
  nowMs: number,
): boolean {
  if (recentPoints.length < AUTO_PAUSE_MIN_POINTS) return false;

  const allSlow = recentPoints.every(
    (p) => (p.speed ?? 0) <= AUTO_PAUSE_SPEED_THRESHOLD_MPS,
  );
  if (!allSlow) return false;

  // recentPoints は降順なので最後の要素が最も古い
  const oldestTimestampMs = recentPoints[recentPoints.length - 1].timestamp;
  const elapsedS = (nowMs - oldestTimestampMs) / 1_000;
  return elapsedS >= thresholdS;
}

/**
 * セッションを自動一時停止状態に更新する。
 */
function autoPauseSessionSync(db: SQLite.SQLiteDatabase, sessionId: number): void {
  const now = Date.now();
  db.runSync(
    `UPDATE sessions
     SET status = 'paused', paused_reason = 'auto_stop', updated_at = ?
     WHERE id = ?`,
    now,
    sessionId,
  );
}

/**
 * バックグラウンドタスク専用の位置情報保存関数。
 * 同期 API を使用し、メインアプリの非同期キューとの競合を回避する。
 * 必ず finally で closeSync() を呼び、ネイティブ接続を解放する。
 */
function persistLocationsSync(locations: Location.LocationObject[]): void {
  const db = SQLite.openDatabaseSync('gps_logger.db');
  try {
    // テーブルを冪等に確保（バックグラウンド起動直後でも確実に存在させる）
    // NOTE: expo-sqlite の sync コンテキストでは PRAGMA foreign_keys が
    // NativeDatabase.execSync 側で NPE を起こすことがあるため、ここでは実行しない。
    // main app 側の async 初期化で有効化される前提で、バックグラウンド書き込みを優先する。
    db.execSync(CREATE_SESSIONS_TABLE);
    db.execSync(CREATE_SESSION_POINTS_TABLE);
    db.execSync(CREATE_SESSION_POINTS_SESSION_INDEX);
    db.execSync(CREATE_SESSION_GAPS_TABLE);
    db.execSync(CREATE_SESSION_GAPS_SESSION_INDEX);
    db.execSync(CREATE_APP_STATE_TABLE);
    db.execSync(CREATE_DEBUG_LOGS_TABLE);
    db.execSync(CREATE_DEBUG_LOGS_CREATED_AT_INDEX);

    const sessionId = getActiveSessionIdSync(db);
    if (sessionId === null) {
      gpsDebug('no active session; dropping incoming locations', { count: locations.length });
      return;
    }

    gpsDebug('processing locations', { sessionId, count: locations.length });

    // 欠損区間検出: 直前ポイントとのタイムスタンプ差が閾値以上なら gap を記録する
    const gapThresholdMs = getGapThresholdSSync(db) * 1_000;
    let prevTimestamp = getLastPointTimestampSync(db, sessionId);

    for (const location of locations) {
      if (prevTimestamp !== null && location.timestamp - prevTimestamp >= gapThresholdMs) {
        insertGapSync(db, sessionId, prevTimestamp, location.timestamp);
      }

      db.runSync(
        `INSERT INTO session_points
           (session_id, latitude, longitude, altitude, accuracy, speed, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        sessionId,
        location.coords.latitude,
        location.coords.longitude,
        location.coords.altitude ?? null,
        location.coords.accuracy ?? null,
        location.coords.speed ?? null,
        location.timestamp,
      );

      prevTimestamp = location.timestamp;
    }

    // ── 自動一時停止チェック ──────────────────────────────────────────────────
    if (!getAutoPauseEnabledSync(db)) return;

    const thresholdS = getAutoPauseThresholdSSync(db);
    const recentPoints = getRecentPointsSync(db, sessionId, AUTO_PAUSE_MIN_POINTS);

    if (shouldAutoPause(recentPoints, thresholdS, Date.now())) {
      gpsDebug('auto pause triggered', { sessionId, thresholdS });
      autoPauseSessionSync(db, sessionId);
    }
  } finally {
    db.closeSync();
  }
}

TaskManager.defineTask(
  LOCATION_TASK_NAME,
  async ({ data, error }: TaskExecutorBody<LocationTaskData>) => {
    if (error) {
      gpsDebug('background task error', { message: error.message });
      return;
    }

    const { locations } = data;
    try {
      persistLocationsSync(locations);
    } catch (e) {
      gpsDebug('failed to persist locations', { error: e instanceof Error ? e.message : String(e) });
    }
  },
);
