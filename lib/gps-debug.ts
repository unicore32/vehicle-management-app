import { getGpsLoggingEnabledSync } from './app-state-store';
import { getMainSyncDatabase } from './database/sync-client';
import { appendDebugLogSync } from './debug-log-store';

type DebugDetails = Record<string, unknown>;

function stringifyDetails(details: DebugDetails): string {
  try {
    return JSON.stringify(details);
  } catch {
    return '[unserializable details]';
  }
}

function persistDebugLogIfEnabled(message: string, details?: DebugDetails): void {
  try {
    const db = getMainSyncDatabase();
    if (!getGpsLoggingEnabledSync(db)) return;

    appendDebugLogSync(db, {
      message,
      details: details === undefined ? null : stringifyDetails(details),
    });
  } catch {
    // デバッグログ保存はベストエフォート
  }
}

/**
 * GPS 関連のデバッグログを出力する。
 * 保存フラグが有効な場合は `debug_logs` にも永続化する。
 */
export function gpsDebug(message: string, details?: DebugDetails): void {
  if (details === undefined) {
    console.debug(`[GPS] ${message}`);
    persistDebugLogIfEnabled(message);
    return;
  }

  console.debug(`[GPS] ${message}`, details);
  persistDebugLogIfEnabled(message, details);
}
