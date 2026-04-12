import * as SQLite from 'expo-sqlite';
import {
  CREATE_APP_STATE_TABLE,
  CREATE_DEBUG_LOGS_CREATED_AT_INDEX,
  CREATE_DEBUG_LOGS_TABLE,
} from './schema';

let db: SQLite.SQLiteDatabase | null = null;
let schemaReady = false;

function ensureSchema(database: SQLite.SQLiteDatabase): void {
  if (schemaReady) return;
  database.execSync(CREATE_APP_STATE_TABLE);
  database.execSync(CREATE_DEBUG_LOGS_TABLE);
  database.execSync(CREATE_DEBUG_LOGS_CREATED_AT_INDEX);
  schemaReady = true;
}

/**
 * メイン JS コンテキスト専用の永続的な同期 DB 接続を返す。
 * openDatabaseSync は一度だけ呼ばれ、closeSync() は呼ばない。
 * close しないことで openDatabaseAsync 側の NativeDatabase を壊さない。
 *
 * ⚠️ バックグラウンドタスクからは呼ばないこと。
 *    バックグラウンドタスクは tasks/location-task.ts の taskDb を使うこと。
 */
export function getMainSyncDatabase(): SQLite.SQLiteDatabase {
  if (db === null) {
    db = SQLite.openDatabaseSync('gps_logger.db');
    schemaReady = false;
  }
  ensureSchema(db);
  return db;
}
