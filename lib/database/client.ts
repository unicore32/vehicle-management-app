import * as SQLite from 'expo-sqlite';
import {
  CREATE_APP_STATE_TABLE,
  CREATE_DEBUG_LOGS_CREATED_AT_INDEX,
  CREATE_DEBUG_LOGS_TABLE,
  CREATE_SESSIONS_STARTED_AT_INDEX,
  CREATE_SESSIONS_STATUS_INDEX,
  CREATE_SESSIONS_TABLE,
  CREATE_SESSION_GAPS_SESSION_INDEX,
  CREATE_SESSION_GAPS_TABLE,
  CREATE_SESSION_POINTS_SESSION_INDEX,
  CREATE_SESSION_POINTS_TABLE,
} from './schema';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * SQLite データベースのシングルトンインスタンスを返す。
 * 初回呼び出し時に全テーブルとインデックスを自動作成する。
 *
 * ⚠️ バックグラウンドタスクからは呼ばない。
 *    別 JS コンテキストでは非同期キューが初期化されないため
 *    openDatabaseSync + 同期 API を直接使うこと。
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db !== null) return db;
  db = await SQLite.openDatabaseAsync('gps_logger.db');

  // foreign key 制約を有効化（expo-sqlite はデフォルト無効）
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // テーブル & インデックスを冪等に作成
  await db.execAsync(CREATE_SESSIONS_TABLE);
  await db.execAsync(CREATE_SESSIONS_STATUS_INDEX);
  await db.execAsync(CREATE_SESSIONS_STARTED_AT_INDEX);
  await db.execAsync(CREATE_SESSION_POINTS_TABLE);
  await db.execAsync(CREATE_SESSION_POINTS_SESSION_INDEX);
  await db.execAsync(CREATE_SESSION_GAPS_TABLE);
  await db.execAsync(CREATE_SESSION_GAPS_SESSION_INDEX);
  await db.execAsync(CREATE_APP_STATE_TABLE);
  await db.execAsync(CREATE_DEBUG_LOGS_TABLE);
  await db.execAsync(CREATE_DEBUG_LOGS_CREATED_AT_INDEX);

  return db;
}

/** テスト用: DB インスタンスをリセットする（本番コードからは呼ばない） */
export function __resetDatabaseForTest(): void {
  db = null;
}
