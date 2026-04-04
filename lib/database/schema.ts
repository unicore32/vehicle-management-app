// ─── sessions ─────────────────────────────────────────────────────────────────

/**
 * sessions テーブル DDL。
 * 1 トリップ = 1 セッション。pause/resume で同一セッションが継続する。
 */
export const CREATE_SESSIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS sessions (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at           INTEGER NOT NULL,
    ended_at             INTEGER,
    status               TEXT    NOT NULL DEFAULT 'recording'
                           CHECK (status IN ('recording', 'paused', 'finished')),
    is_background_active INTEGER NOT NULL DEFAULT 0,
    paused_reason        TEXT,
    distance_m           REAL    NOT NULL DEFAULT 0,
    moving_time_s        REAL    NOT NULL DEFAULT 0,
    avg_speed            REAL    NOT NULL DEFAULT 0,
    max_speed            REAL    NOT NULL DEFAULT 0,
    point_count          INTEGER NOT NULL DEFAULT 0,
    note                 TEXT,
    created_at           INTEGER NOT NULL,
    updated_at           INTEGER NOT NULL
  );
` as const;

export const CREATE_SESSIONS_STATUS_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions (status);
` as const;

export const CREATE_SESSIONS_STARTED_AT_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions (started_at DESC);
` as const;

// ─── session_points ────────────────────────────────────────────────────────────

/**
 * session_points テーブル DDL。
 * バックグラウンドタスクが書き込む生 GPS ポイント。
 * session_id → sessions(id) の CASCADE DELETE で親ごと消える。
 */
export const CREATE_SESSION_POINTS_TABLE = `
  CREATE TABLE IF NOT EXISTS session_points (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    latitude    REAL    NOT NULL,
    longitude   REAL    NOT NULL,
    altitude    REAL,
    accuracy    REAL,
    speed       REAL,
    timestamp   INTEGER NOT NULL,
    created_at  INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
  );
` as const;

export const CREATE_SESSION_POINTS_SESSION_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_session_points_session_ts
    ON session_points (session_id, timestamp);
` as const;

// ─── session_gaps ──────────────────────────────────────────────────────────────

/**
 * session_gaps テーブル DDL。
 * GPS 取得が一時的に失敗した区間を記録し、後から補正できるようにする。
 */
export const CREATE_SESSION_GAPS_TABLE = `
  CREATE TABLE IF NOT EXISTS session_gaps (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id       INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    gap_started_at   INTEGER NOT NULL,
    gap_ended_at     INTEGER NOT NULL,
    reason           TEXT,
    correction_mode  TEXT    NOT NULL DEFAULT 'none'
                       CHECK (correction_mode IN ('none', 'interpolated', 'manual'))
  );
` as const;

export const CREATE_SESSION_GAPS_SESSION_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_session_gaps_session_id
    ON session_gaps (session_id);
` as const;

// ─── app_state ─────────────────────────────────────────────────────────────────

/**
 * app_state テーブル DDL。
 * キー・バリューストア。バックグラウンドタスクとのセッション ID 共有や
 * auto-pause 閾値など、JS コンテキストをまたぐ設定値を保持する。
 *
 * 利用するキー:
 *   active_session_id  : 現在記録中のセッション ID（文字列）
 *   auto_pause_threshold_s : 自動一時停止までの静止秒数（デフォルト 300）
 *   debug_logging_enabled  : デバッグログ保存フラグ（'1' / '0'）
 */
export const CREATE_APP_STATE_TABLE = `
  CREATE TABLE IF NOT EXISTS app_state (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
` as const;

// ─── debug_logs ────────────────────────────────────────────────────────────────

/**
 * debug_logs テーブル DDL。
 * 開発用の GPS デバッグログを時刻順に蓄積する。
 */
export const CREATE_DEBUG_LOGS_TABLE = `
  CREATE TABLE IF NOT EXISTS debug_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at  INTEGER NOT NULL,
    message     TEXT    NOT NULL,
    details     TEXT
  );
` as const;

export const CREATE_DEBUG_LOGS_CREATED_AT_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_debug_logs_created_at
    ON debug_logs (created_at DESC);
` as const;
