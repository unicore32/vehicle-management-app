import { getDatabase } from './database/client';

// ─── 型定義 ───────────────────────────────────────────────────────────────────

export type SessionStatus = 'recording' | 'paused' | 'finished';

export type Session = {
  id: number;
  started_at: number;
  ended_at: number | null;
  status: SessionStatus;
  vehicle_id: number | null;
  odometer_start_km: number | null;
  odometer_end_km: number | null;
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
  vehicle_display_name?: string | null;
};

export type SessionStats = {
  distance_m: number;
  moving_time_s: number;
  avg_speed: number;
  max_speed: number;
  point_count: number;
};

export type CreatedSession = {
  id: number;
  started_at: number;
};

export type StartSessionInput = {
  vehicleId?: number | null;
  odometerStartKm?: number | null;
};

export type StopSessionInput = {
  odometerEndKm?: number | null;
};

export type UpdateSessionVehicleInfoInput = {
  vehicleId: number | null;
  odometerStartKm: number | null;
  odometerEndKm: number | null;
};

const SESSION_SELECT = `
  SELECT sessions.*, vehicles.display_name AS vehicle_display_name
  FROM sessions
  LEFT JOIN vehicles ON vehicles.id = sessions.vehicle_id
`;

function normalizeOdometerKm(value: number | null | undefined): number | null {
  if (value == null) return null;
  if (!Number.isInteger(value) || value < 0) {
    throw new Error('メーター距離は 0 以上の整数で入力してください');
  }
  return value;
}

function normalizeVehicleSessionInput<T extends {
  vehicleId?: number | null;
  odometerStartKm?: number | null;
  odometerEndKm?: number | null;
}>(input?: T) {
  const vehicleId = input?.vehicleId ?? null;
  if (vehicleId === null) {
    return {
      vehicleId: null,
      odometerStartKm: null,
      odometerEndKm: null,
    };
  }

  const odometerStartKm = normalizeOdometerKm(input?.odometerStartKm);
  const odometerEndKm = normalizeOdometerKm(input?.odometerEndKm);

  if (
    odometerStartKm !== null &&
    odometerEndKm !== null &&
    odometerEndKm < odometerStartKm
  ) {
    throw new Error('終了メーター距離は開始メーター距離以上にしてください');
  }

  return {
    vehicleId,
    odometerStartKm,
    odometerEndKm,
  };
}

type SessionVehicleValidationRow = {
  vehicle_id: number | null;
  odometer_start_km: number | null;
};

async function validateStopSessionInput(
  sessionId: number,
  input?: StopSessionInput,
): Promise<number | null> {
  const odometerEndKm = normalizeOdometerKm(input?.odometerEndKm);
  if (odometerEndKm === null) {
    return null;
  }

  const db = await getDatabase();
  const session = await db.getFirstAsync<SessionVehicleValidationRow>(
    `SELECT vehicle_id, odometer_start_km
     FROM sessions
     WHERE id = ?`,
    sessionId,
  );

  if (session === null) {
    throw new Error('対象のセッションが見つかりません');
  }

  if (session.vehicle_id === null) {
    throw new Error('車両未選択のセッションには終了メーター距離を保存できません');
  }

  if (
    session.odometer_start_km !== null &&
    odometerEndKm < session.odometer_start_km
  ) {
    throw new Error('終了メーター距離は開始メーター距離以上にしてください');
  }

  return odometerEndKm;
}

// ─── 書き込み ─────────────────────────────────────────────────────────────────

/**
 * 新しいセッションを作成して ID を返す。
 * GPS 記録開始時に呼ぶ。
 */
export async function createSession(input?: StartSessionInput): Promise<number> {
  return (await createSessionRecord(input)).id;
}

/**
 * 新しいセッションを作成し、ID と started_at を返す。
 * 開始直後の UI が points 到着を待たずに安定表示できるようにする。
 */
export async function createSessionRecord(input?: StartSessionInput): Promise<CreatedSession> {
  const db = await getDatabase();
  const now = Date.now();
  const normalized = normalizeVehicleSessionInput(input);
  const result = await db.runAsync(
    `INSERT INTO sessions
       (started_at, status, vehicle_id, odometer_start_km, odometer_end_km, is_background_active,
        distance_m, moving_time_s, avg_speed, max_speed, point_count,
        created_at, updated_at)
     VALUES (?, 'recording', ?, ?, ?, 0, 0, 0, 0, 0, 0, ?, ?)`,
    now,
    normalized.vehicleId,
    normalized.odometerStartKm,
    normalized.odometerEndKm,
    now,
    now,
  );
  return {
    id: result.lastInsertRowId,
    started_at: now,
  };
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
  input?: StopSessionInput,
): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();
  const odometerEndKm = await validateStopSessionInput(sessionId, input);
  await db.runAsync(
    `UPDATE sessions
     SET status       = 'finished',
         ended_at     = ?,
         odometer_end_km = ?,
         distance_m   = ?,
         moving_time_s = ?,
         avg_speed    = ?,
         max_speed    = ?,
         point_count  = ?,
         paused_reason = NULL,
         updated_at   = ?
     WHERE id = ?`,
    now,
    odometerEndKm,
    stats.distance_m,
    stats.moving_time_s,
    stats.avg_speed,
    stats.max_speed,
    stats.point_count,
    now,
    sessionId,
  );
}

export async function updateSessionVehicleInfo(
  sessionId: number,
  input: UpdateSessionVehicleInfoInput,
): Promise<void> {
  const db = await getDatabase();
  const normalized = normalizeVehicleSessionInput(input);
  await db.runAsync(
    `UPDATE sessions
     SET vehicle_id = ?,
         odometer_start_km = ?,
         odometer_end_km = ?,
         updated_at = ?
     WHERE id = ?`,
    normalized.vehicleId,
    normalized.odometerStartKm,
    normalized.odometerEndKm,
    Date.now(),
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
    `${SESSION_SELECT}
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
    `${SESSION_SELECT} WHERE sessions.id = ?`,
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
      `${SESSION_SELECT} ORDER BY sessions.started_at DESC LIMIT ?`,
      limit,
    );
  }
  return db.getAllAsync<Session>(
    `${SESSION_SELECT} ORDER BY sessions.started_at DESC`,
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
