import * as SQLite from 'expo-sqlite';
import { getDatabase } from './database/client';

// ─── キー定数 ──────────────────────────────────────────────────────────────────

/** 自動一時停止までの静止秒数（デフォルト 300）*/
export const APP_STATE_KEY_AUTO_PAUSE_THRESHOLD = 'auto_pause_threshold_s' as const;

/** GPS 記録間隔（秒） */
export const APP_STATE_KEY_RECORDING_INTERVAL = 'recording_interval_s' as const;

/** 自動一時停止の有効フラグ（'1' = 有効、'0' = 無効）*/
export const APP_STATE_KEY_AUTO_PAUSE_ENABLED = 'auto_pause_enabled' as const;

/** GPX ファイル名プレフィックス */
export const APP_STATE_KEY_GPX_FILENAME_PREFIX = 'gpx_filename_prefix' as const;

/** アプリ/エラーログ保存フラグ */
export const APP_STATE_KEY_APP_LOGGING_ENABLED = 'app_logging_enabled' as const;

/** GPS ログ保存フラグ */
export const APP_STATE_KEY_GPS_LOGGING_ENABLED = 'gps_logging_enabled' as const;

/** 旧 GPS デバッグログ保存フラグ（互換用） */
export const APP_STATE_KEY_LEGACY_DEBUG_LOGGING_ENABLED = 'debug_logging_enabled' as const;

/** GPS 欠損区間と判定するタイムスタンプ差の閾値（秒）*/
export const APP_STATE_KEY_GAP_THRESHOLD = 'gap_threshold_s' as const;

// ─── デフォルト値 ──────────────────────────────────────────────────────────────

export const AUTO_PAUSE_THRESHOLD_S_DEFAULT = 300;
export const RECORDING_INTERVAL_S_DEFAULT = 2;
export const RECORDING_INTERVAL_S_MIN = 1;
export const RECORDING_INTERVAL_S_MAX = 30;
export const AUTO_PAUSE_SPEED_THRESHOLD_MPS = 0.5;
export const AUTO_PAUSE_MIN_POINTS = 5;

export const GAP_THRESHOLD_S_DEFAULT = 10;
export const GAP_THRESHOLD_S_MIN = 5;
export const GAP_THRESHOLD_S_MAX = 300;

export const APP_LOGGING_ENABLED_DEFAULT = false;
export const GPS_LOGGING_ENABLED_DEFAULT = false;

// ─── 非同期 API（メインアプリ用） ─────────────────────────────────────────────

/**
 * app_state テーブルから値を取得する。
 * キーが存在しなければ null を返す。
 */
export async function getAppState(key: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_state WHERE key = ?',
    key,
  );
  return row?.value ?? null;
}

/**
 * app_state テーブルに値を保存（UPSERT）する。
 */
export async function setAppState(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO app_state (key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value,
  );
}

/**
 * auto_pause_threshold_s の現在値を秒単位で返す。
 * 未設定の場合はデフォルト値を返す。
 */
export async function getAutoPauseThresholdS(): Promise<number> {
  const raw = await getAppState(APP_STATE_KEY_AUTO_PAUSE_THRESHOLD);
  if (raw === null) return AUTO_PAUSE_THRESHOLD_S_DEFAULT;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : AUTO_PAUSE_THRESHOLD_S_DEFAULT;
}

/**
 * auto_pause_threshold_s を更新する。
 */
export async function setAutoPauseThresholdS(seconds: number): Promise<void> {
  await setAppState(APP_STATE_KEY_AUTO_PAUSE_THRESHOLD, String(seconds));
}

/**
 * recording_interval_s の現在値を秒単位で返す。
 * 未設定の場合はデフォルト値を返す。
 */
export async function getRecordingIntervalS(): Promise<number> {
  const raw = await getAppState(APP_STATE_KEY_RECORDING_INTERVAL);
  if (raw === null) return RECORDING_INTERVAL_S_DEFAULT;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= RECORDING_INTERVAL_S_MIN && parsed <= RECORDING_INTERVAL_S_MAX
    ? parsed
    : RECORDING_INTERVAL_S_DEFAULT;
}

/**
 * recording_interval_s を更新する。
 */
export async function setRecordingIntervalS(seconds: number): Promise<void> {
  await setAppState(APP_STATE_KEY_RECORDING_INTERVAL, String(seconds));
}

/**
 * 自動一時停止が有効かどうかを返す。
 * 未設定の場合は有効（true）とする。
 */
export async function getAutoPauseEnabled(): Promise<boolean> {
  const raw = await getAppState(APP_STATE_KEY_AUTO_PAUSE_ENABLED);
  return raw !== '0';
}

/**
 * 自動一時停止の有効フラグを更新する。
 */
export async function setAutoPauseEnabled(enabled: boolean): Promise<void> {
  await setAppState(APP_STATE_KEY_AUTO_PAUSE_ENABLED, enabled ? '1' : '0');
}

/**
 * GPX ファイル名プレフィックスを返す。
 * 未設定の場合は 'trip' を返す。
 */
export async function getGpxFilenamePrefix(): Promise<string> {
  return (await getAppState(APP_STATE_KEY_GPX_FILENAME_PREFIX)) ?? 'trip';
}

/**
 * GPX ファイル名プレフィックスを更新する。
 */
export async function setGpxFilenamePrefix(prefix: string): Promise<void> {
  await setAppState(APP_STATE_KEY_GPX_FILENAME_PREFIX, prefix);
}

/**
 * アプリ/エラーログ保存が有効かどうかを返す。
 * 未設定の場合は無効（false）とする。
 */
export async function getDebugLoggingEnabled(): Promise<boolean> {
  const raw = await getAppState(APP_STATE_KEY_APP_LOGGING_ENABLED);
  if (raw === null) return APP_LOGGING_ENABLED_DEFAULT;
  return raw === '1';
}

/**
 * アプリ/エラーログ保存の有効フラグを更新する。
 */
export async function setDebugLoggingEnabled(enabled: boolean): Promise<void> {
  await setAppState(APP_STATE_KEY_APP_LOGGING_ENABLED, enabled ? '1' : '0');
}

/**
 * GPS ログ保存が有効かどうかを返す。
 * 未設定の場合は旧キーを含めて無効（false）とする。
 */
export async function getGpsLoggingEnabled(): Promise<boolean> {
  const raw = await getAppState(APP_STATE_KEY_GPS_LOGGING_ENABLED);
  if (raw !== null) return raw === '1';
  const legacy = await getAppState(APP_STATE_KEY_LEGACY_DEBUG_LOGGING_ENABLED);
  if (legacy !== null) return legacy === '1';
  return GPS_LOGGING_ENABLED_DEFAULT;
}

/**
 * GPS ログ保存の有効フラグを更新する。
 * 互換のため旧キーも同時に更新する。
 */
export async function setGpsLoggingEnabled(enabled: boolean): Promise<void> {
  const value = enabled ? '1' : '0';
  await setAppState(APP_STATE_KEY_GPS_LOGGING_ENABLED, value);
  await setAppState(APP_STATE_KEY_LEGACY_DEBUG_LOGGING_ENABLED, value);
}

// ─── 同期 API（バックグラウンドタスク専用） ────────────────────────────────────

/**
 * バックグラウンドタスク用: 同期 API で app_state を読む。
 * DB インスタンスは呼び出し元が openDatabaseSync で取得して渡すこと。
 */
export function getAppStateSync(db: SQLite.SQLiteDatabase, key: string): string | null {
  try {
    const row = db.getFirstSync<{ value: string }>(
      'SELECT value FROM app_state WHERE key = ?',
      key,
    );
    return row?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * バックグラウンドタスク用: 同期 API で app_state を書く（UPSERT）。
 */
export function setAppStateSync(db: SQLite.SQLiteDatabase, key: string, value: string): void {
  db.runSync(
    `INSERT INTO app_state (key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value,
  );
}

/**
 * バックグラウンドタスク用: auto_pause_threshold_s を同期で取得。
 * 未設定・解析失敗時はデフォルト値を返す。
 */
export function getAutoPauseThresholdSSync(db: SQLite.SQLiteDatabase): number {
  const raw = getAppStateSync(db, APP_STATE_KEY_AUTO_PAUSE_THRESHOLD);
  if (raw === null) return AUTO_PAUSE_THRESHOLD_S_DEFAULT;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : AUTO_PAUSE_THRESHOLD_S_DEFAULT;
}

/**
 * バックグラウンドタスク用: 自動一時停止が有効かを同期で取得。
 * 未設定時は有効（true）。
 */
export function getAutoPauseEnabledSync(db: SQLite.SQLiteDatabase): boolean {
  return getAppStateSync(db, APP_STATE_KEY_AUTO_PAUSE_ENABLED) !== '0';
}

// ─── gap_threshold_s ───────────────────────────────────────────────────────────

/**
 * GPS 欠損区間と判定する閾値を秒単位で返す。
 * 未設定の場合はデフォルト値を返す。
 */
export async function getGapThresholdS(): Promise<number> {
  const raw = await getAppState(APP_STATE_KEY_GAP_THRESHOLD);
  if (raw === null) return GAP_THRESHOLD_S_DEFAULT;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= GAP_THRESHOLD_S_MIN
    ? parsed
    : GAP_THRESHOLD_S_DEFAULT;
}

/**
 * GPS 欠損区間判定閾値を更新する。
 */
export async function setGapThresholdS(seconds: number): Promise<void> {
  await setAppState(APP_STATE_KEY_GAP_THRESHOLD, String(seconds));
}

/**
 * バックグラウンドタスク用: gap_threshold_s を同期で取得。
 * 未設定・解析失敗時はデフォルト値を返す。
 */
export function getGapThresholdSSync(db: SQLite.SQLiteDatabase): number {
  const raw = getAppStateSync(db, APP_STATE_KEY_GAP_THRESHOLD);
  if (raw === null) return GAP_THRESHOLD_S_DEFAULT;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= GAP_THRESHOLD_S_MIN
    ? parsed
    : GAP_THRESHOLD_S_DEFAULT;
}

/**
 * バックグラウンド / 同期コンテキスト用: アプリ/エラーログ保存が有効かどうかを返す。
 */
export function getDebugLoggingEnabledSync(db: SQLite.SQLiteDatabase): boolean {
  return getAppStateSync(db, APP_STATE_KEY_APP_LOGGING_ENABLED) === '1';
}

/**
 * バックグラウンド / 同期コンテキスト用: GPS ログ保存が有効かどうかを返す。
 */
export function getGpsLoggingEnabledSync(db: SQLite.SQLiteDatabase): boolean {
  const current = getAppStateSync(db, APP_STATE_KEY_GPS_LOGGING_ENABLED);
  if (current !== null) return current === '1';
  const legacy = getAppStateSync(db, APP_STATE_KEY_LEGACY_DEBUG_LOGGING_ENABLED);
  if (legacy !== null) return legacy === '1';
  return GPS_LOGGING_ENABLED_DEFAULT;
}
