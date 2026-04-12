import {
    getDebugLoggingEnabledSync,
} from './app-state-store';
import { getMainSyncDatabase } from './database/sync-client';
import {
    appendDebugLogSync,
} from './debug-log-store';

let isAppLogCaptureSetupDone = false;

type ConsoleMethod = 'log' | 'info' | 'warn' | 'error' | 'debug';
type ErrorHandler = (error: Error, isFatal?: boolean) => void;

type GlobalErrorUtils = {
  getGlobalHandler?: () => ErrorHandler;
  setGlobalHandler: (handler: ErrorHandler) => void;
};

type CapturedValue = string | number | boolean | null | undefined | object;

function formatValue(value: CapturedValue): string {
  if (value instanceof Error) {
    return value.stack ?? `${value.name}: ${value.message}`;
  }

  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}

function formatArgs(args: CapturedValue[]): string {
  return args.map(formatValue).join(' ');
}

function persistAppLogIfEnabled(level: ConsoleMethod, args: CapturedValue[]): void {
  try {
    if (typeof args[0] === 'string' && args[0].startsWith('[GPS]')) return;

    const db = getMainSyncDatabase();
    if (!getDebugLoggingEnabledSync(db)) return;

    appendDebugLogSync(db, {
      message: `[APP][${level}] ${formatArgs(args)}`,
    });
  } catch {
    // ベストエフォート
  }
}

function captureError(error: Error, isFatal?: boolean): void {
  persistAppLogIfEnabled('error', [
    `${isFatal ? '[fatal]' : '[uncaught]'} ${error.stack ?? `${error.name}: ${error.message}`}`,
  ]);
}

export function setupAppLogCapture(): void {
  if (isAppLogCaptureSetupDone) return;
  isAppLogCaptureSetupDone = true;

  const originalConsole: Record<ConsoleMethod, (...args: never[]) => void> = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
  };

  (['log', 'info', 'warn', 'error', 'debug'] as const).forEach((method) => {
    console[method] = ((...args: unknown[]) => {
      originalConsole[method](...args as never[]);
      persistAppLogIfEnabled(method, args as CapturedValue[]);
    }) as typeof console[typeof method];
  });

  const errorUtils = (globalThis as unknown as { ErrorUtils?: GlobalErrorUtils }).ErrorUtils;
  if (errorUtils !== undefined) {
    const previous = errorUtils.getGlobalHandler?.();
    errorUtils.setGlobalHandler((error, isFatal) => {
      captureError(error, isFatal);
      previous?.(error, isFatal);
    });
  }
}
