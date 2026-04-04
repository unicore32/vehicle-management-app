import * as SQLite from 'expo-sqlite';
import { getDatabase } from './database/client';
import { CREATE_DEBUG_LOGS_CREATED_AT_INDEX, CREATE_DEBUG_LOGS_TABLE } from './database/schema';

export type DebugLogEntry = {
  id: number;
  created_at: number;
  message: string;
  details: string | null;
};

export type DebugLogInput = {
  message: string;
  details?: string | null;
};

function ensureDebugLogSchemaSync(db: SQLite.SQLiteDatabase): void {
  db.execSync(CREATE_DEBUG_LOGS_TABLE);
  db.execSync(CREATE_DEBUG_LOGS_CREATED_AT_INDEX);
}

export function appendDebugLogSync(db: SQLite.SQLiteDatabase, input: DebugLogInput): void {
  ensureDebugLogSchemaSync(db);
  db.runSync(
    `INSERT INTO debug_logs (created_at, message, details)
     VALUES (?, ?, ?)`,
    Date.now(),
    input.message,
    input.details ?? null,
  );
}

export async function getDebugLogs(limit?: number): Promise<DebugLogEntry[]> {
  const db = await getDatabase();
  if (limit !== undefined) {
    return db.getAllAsync<DebugLogEntry>(
      `SELECT * FROM debug_logs
       ORDER BY created_at DESC
       LIMIT ?`,
      limit,
    );
  }
  return db.getAllAsync<DebugLogEntry>(
    `SELECT * FROM debug_logs
     ORDER BY created_at DESC`,
  );
}

export async function clearDebugLogs(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM debug_logs');
}

export function formatDebugLogEntry(entry: DebugLogEntry): string {
  const timestamp = new Date(entry.created_at).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return entry.details !== null && entry.details.length > 0
    ? `[${timestamp}] ${entry.message} ${entry.details}`
    : `[${timestamp}] ${entry.message}`;
}

export function buildDebugLogExportText(logs: DebugLogEntry[]): string {
  if (logs.length === 0) return 'No debug logs recorded.';
  return logs.map(formatDebugLogEntry).join('\n');
}
