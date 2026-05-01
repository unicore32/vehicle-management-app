import * as SQLite from 'expo-sqlite';
import {
  CREATE_APP_STATE_TABLE,
  CREATE_DEBUG_LOGS_CREATED_AT_INDEX,
  CREATE_DEBUG_LOGS_TABLE,
  CREATE_SESSIONS_VEHICLE_ID_INDEX,
  CREATE_SESSIONS_STARTED_AT_INDEX,
  CREATE_SESSIONS_STATUS_INDEX,
  CREATE_SESSIONS_TABLE,
  CREATE_SESSION_GAPS_SESSION_INDEX,
  CREATE_SESSION_GAPS_TABLE,
  CREATE_SESSION_POINTS_SESSION_INDEX,
  CREATE_SESSION_POINTS_TABLE,
  CREATE_VEHICLES_ACTIVE_INDEX,
  CREATE_VEHICLES_TABLE,
} from './schema';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * 初期化 Promise を保持することで、並列に getDatabase() が呼ばれても
 * openDatabaseAsync が一度だけ実行されることを保証する。
 */
let dbInitPromise: Promise<SQLite.SQLiteDatabase> | null = null;

type TableInfoRow = {
  name: string;
};

async function hasColumn(
  connection: SQLite.SQLiteDatabase,
  tableName: string,
  columnName: string,
): Promise<boolean> {
  const rows = await connection.getAllAsync<TableInfoRow>(`PRAGMA table_info(${tableName})`);
  return rows.some((row) => row.name === columnName);
}

async function ensureColumn(
  connection: SQLite.SQLiteDatabase,
  tableName: string,
  columnName: string,
  definition: string,
): Promise<void> {
  if (await hasColumn(connection, tableName, columnName)) {
    return;
  }

  await connection.execAsync(
    `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition};`,
  );
}

async function ensureSchemaEvolution(connection: SQLite.SQLiteDatabase): Promise<void> {
  await ensureColumn(connection, 'sessions', 'vehicle_id', 'INTEGER');
  await ensureColumn(connection, 'sessions', 'odometer_start_km', 'INTEGER');
  await ensureColumn(connection, 'sessions', 'odometer_end_km', 'INTEGER');
}

/**
 * SQLite データベースのシングルトンインスタンスを返す。
 * 初回呼び出し時に全テーブルとインデックスを自動作成する。
 *
 * Promise を保持することで、複数の並列呼び出しがあっても
 * openDatabaseAsync は一度だけ実行される（TOCTOU 競合を防止）。
 *
 * ⚠️ バックグラウンドタスクからは呼ばない。
 *    別 JS コンテキストでは非同期キューが初期化されないため
 *    openDatabaseSync + 同期 API を直接使うこと。
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db !== null) return db;
  if (dbInitPromise !== null) return dbInitPromise;

  dbInitPromise = (async () => {
    const connection = await SQLite.openDatabaseAsync('gps_logger.db');

    // WAL mode: 読み取りと書き込みの並列実行を可能にし、
    // バックグラウンドタスクとの SQLITE_BUSY 競合を防ぐ
    await connection.execAsync('PRAGMA journal_mode=WAL;');

    // foreign key 制約を有効化（expo-sqlite はデフォルト無効）
    await connection.execAsync('PRAGMA foreign_keys = ON;');

    // テーブル & インデックスを冪等に作成
    await connection.execAsync(CREATE_VEHICLES_TABLE);
    await connection.execAsync(CREATE_VEHICLES_ACTIVE_INDEX);
    await connection.execAsync(CREATE_SESSIONS_TABLE);
    await ensureSchemaEvolution(connection);
    await connection.execAsync(CREATE_SESSIONS_STATUS_INDEX);
    await connection.execAsync(CREATE_SESSIONS_STARTED_AT_INDEX);
    await connection.execAsync(CREATE_SESSIONS_VEHICLE_ID_INDEX);
    await connection.execAsync(CREATE_SESSION_POINTS_TABLE);
    await connection.execAsync(CREATE_SESSION_POINTS_SESSION_INDEX);
    await connection.execAsync(CREATE_SESSION_GAPS_TABLE);
    await connection.execAsync(CREATE_SESSION_GAPS_SESSION_INDEX);
    await connection.execAsync(CREATE_APP_STATE_TABLE);
    await connection.execAsync(CREATE_DEBUG_LOGS_TABLE);
    await connection.execAsync(CREATE_DEBUG_LOGS_CREATED_AT_INDEX);

    db = connection;
    return connection;
  })();

  return dbInitPromise;
}

/** テスト用: DB インスタンスをリセットする（本番コードからは呼ばない） */
export function __resetDatabaseForTest(): void {
  db = null;
  dbInitPromise = null;
}
