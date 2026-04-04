import { getDatabase } from './database/client';

// ─── 型定義 ───────────────────────────────────────────────────────────────────

export type CorrectionMode = 'none' | 'interpolated' | 'manual';

export type SessionGap = {
  id: number;
  session_id: number;
  gap_started_at: number;
  gap_ended_at: number;
  reason: string | null;
  correction_mode: CorrectionMode;
};

export type SessionGapInput = Omit<SessionGap, 'id'>;

// ─── 書き込み ─────────────────────────────────────────────────────────────────

/**
 * 欠損区間を記録して ID を返す。
 * GPS 取得が一時的に失敗したタイミングで呼ぶ。
 */
export async function insertSessionGap(gap: SessionGapInput): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO session_gaps
       (session_id, gap_started_at, gap_ended_at, reason, correction_mode)
     VALUES (?, ?, ?, ?, ?)`,
    gap.session_id,
    gap.gap_started_at,
    gap.gap_ended_at,
    gap.reason ?? null,
    gap.correction_mode,
  );
  return result.lastInsertRowId;
}

/**
 * 欠損区間の補正モードを更新する。
 * 補間または手動補正完了後に呼ぶ。
 */
export async function updateGapCorrectionMode(
  gapId: number,
  mode: CorrectionMode,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE session_gaps SET correction_mode = ? WHERE id = ?',
    mode,
    gapId,
  );
}

// ─── 読み取り ─────────────────────────────────────────────────────────────────

/**
 * 指定セッションの全欠損区間を時系列昇順で返す。
 */
export async function getSessionGaps(sessionId: number): Promise<SessionGap[]> {
  const db = await getDatabase();
  return db.getAllAsync<SessionGap>(
    `SELECT * FROM session_gaps
     WHERE session_id = ?
     ORDER BY gap_started_at ASC`,
    sessionId,
  );
}
