/**
 * locations テーブルの DDL。
 * expo-sqlite の execAsync に渡す CREATE TABLE 文。
 */
export const CREATE_LOCATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS locations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    latitude    REAL    NOT NULL,
    longitude   REAL    NOT NULL,
    altitude    REAL,
    accuracy    REAL,
    speed       REAL,
    timestamp   INTEGER NOT NULL,
    created_at  INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
  );
` as const;

/**
 * 記録件数が増えすぎた際のパフォーマンス対策インデックス。
 * timestamp 降順取得を高速化する。
 */
export const CREATE_TIMESTAMP_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_locations_timestamp ON locations (timestamp DESC);
` as const;
