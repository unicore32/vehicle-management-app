import * as SQLite from 'expo-sqlite';
import { CREATE_LOCATIONS_TABLE, CREATE_TIMESTAMP_INDEX } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * SQLite データベースのシングルトンインスタンスを返す。
 * 初回呼び出し時にテーブルとインデックスを自動作成する。
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db !== null) return db;
  db = await SQLite.openDatabaseAsync('gps_logger.db');
  await db.execAsync(CREATE_LOCATIONS_TABLE);
  await db.execAsync(CREATE_TIMESTAMP_INDEX);
  return db;
}

/** テスト用: DB インスタンスをリセットする（本番コードからは呼ばない） */
export function __resetDatabaseForTest(): void {
  db = null;
}
