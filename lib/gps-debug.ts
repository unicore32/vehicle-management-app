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
 * 開発時のみ GPS 関連のデバッグログを出力する。
 * 本番ビルドでは何も出力しない。
 */
export function gpsDebug(message: string, details?: DebugDetails): void {
  if (!__DEV__) return;

  if (details === undefined) {
    console.debug(`[GPS] ${message}`);
    persistDebugLogIfEnabled(message);
    return;
  }

  console.debug(`[GPS] ${message}`, details);
  persistDebugLogIfEnabled(message, details);
}
