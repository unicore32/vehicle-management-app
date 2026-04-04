import { getDatabase } from './database/client';

// ─── 型定義 ───────────────────────────────────────────────────────────────────

export type SessionStatus = 'recording' | 'paused' | 'finished';

export type Session = {
  id: number;
  started_at: number;
  ended_at: number | null;
  status: SessionStatus;
  /** 1 = バックグラウンド記録中 */
  is_background_active: 0 | 1;
  paused_reason: string | null;
  distance_m: number;
  moving_time_s: number;
  avg_speed: number;
  max_speed: number;
  point_count: number;
  note: string | null;
  created_at: number;
  updated_at: number;
};

export type SessionStats = {
  distance_m: number;
  moving_time_s: number;
  avg_speed: number;
  max_speed: number;
  point_count: number;
};

// ─── 書き込み ─────────────────────────────────────────────────────────────────

/**
 * 新しいセッションを作成して ID を返す。
 * GPS 記録開始時に呼ぶ。
 */
export async function createSession(): Promise<number> {
  const db = await getDatabase();
  const now = Date.now();
  const result = await db.runAsync(
    `INSERT INTO sessions
       (started_at, status, is_background_active,
        distance_m, moving_time_s, avg_speed, max_speed, point_count,
        created_at, updated_at)
     VALUES (?, 'recording', 0, 0, 0, 0, 0, 0, ?, ?)`,
    now, now, now,
  );
  return result.lastInsertRowId;
}

/**
 * セッションのステータスを更新する。
 * pause / resume 時に使用。
 */
export async function updateSessionStatus(
  sessionId: number,
  status: SessionStatus,
  pausedReason?: string,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE sessions
     SET status = ?, paused_reason = ?, updated_at = ?
     WHERE id = ?`,
    status,
    pausedReason ?? null,
    Date.now(),
    sessionId,
  );
}

/**
 * セッションを完了状態にして最終集計値を書き込む。
 * 停止ボタン押下後に呼ぶ。
 */
export async function finishSession(
  sessionId: number,
  stats: SessionStats,
): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();
  await db.runAsync(
    `UPDATE sessions
     SET status       = 'finished',
         ended_at     = ?,
         distance_m   = ?,
         moving_time_s = ?,
         avg_speed    = ?,
         max_speed    = ?,
         point_count  = ?,
         paused_reason = NULL,
         updated_at   = ?
     WHERE id = ?`,
    now,
    stats.distance_m,
    stats.moving_time_s,
    stats.avg_speed,
    stats.max_speed,
    stats.point_count,
    now,
    sessionId,
  );
}

/**
 * バックグラウンド記録フラグを更新する。
 * アプリがバックグラウンドに入った / 戻ってきたときに呼ぶ。
 */
export async function setBackgroundActive(
  sessionId: number,
  active: boolean,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE sessions SET is_background_active = ?, updated_at = ? WHERE id = ?`,
    active ? 1 : 0,
    Date.now(),
    sessionId,
  );
}

/**
 * セッションとその全ポイント・ギャップを削除する。
 * CASCADE DELETE により session_points / session_gaps も同時に消える。
 */
export async function deleteSession(sessionId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM sessions WHERE id = ?', sessionId);
}

// ─── 読み取り ─────────────────────────────────────────────────────────────────

/**
 * 現在アクティブな（recording または paused）セッションを返す。
 * 存在しなければ null。
 */
export async function getActiveSession(): Promise<Session | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Session>(
    `SELECT * FROM sessions
     WHERE status IN ('recording', 'paused')
     ORDER BY started_at DESC
     LIMIT 1`,
  );
}

/**
 * 指定 ID のセッションを返す。存在しなければ null。
 */
export async function getSession(sessionId: number): Promise<Session | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Session>(
    'SELECT * FROM sessions WHERE id = ?',
    sessionId,
  );
}

/**
 * セッション一覧を新しい順で返す（セッション一覧画面用）。
 *
 * @param limit 取得件数の上限（省略時は全件）
 */
export async function getSessions(limit?: number): Promise<Session[]> {
  const db = await getDatabase();
  if (limit !== undefined) {
    return db.getAllAsync<Session>(
      'SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?',
      limit,
    );
  }
  return db.getAllAsync<Session>(
    'SELECT * FROM sessions ORDER BY started_at DESC',
  );
}

/**
 * 完了済みセッションの総数を返す（全体サマリー用）。
 */
export async function getFinishedSessionCount(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM sessions WHERE status = 'finished'`,
  );
  return row?.count ?? 0;
}
