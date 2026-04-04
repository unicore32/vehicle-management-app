import * as SQLite from 'expo-sqlite';
import {
    APP_LOGGING_ENABLED_DEFAULT,
    AUTO_PAUSE_THRESHOLD_S_DEFAULT,
    getAppState,
    getAppStateSync,
    getAutoPauseEnabled,
    getAutoPauseEnabledSync,
    getAutoPauseThresholdS,
    getAutoPauseThresholdSSync,
    getDebugLoggingEnabled,
    getGpsLoggingEnabled,
    getGpxFilenamePrefix,
    getRecordingIntervalS,
    RECORDING_INTERVAL_S_DEFAULT,
    setAppState,
    setAppStateSync,
    setAutoPauseEnabled,
    setAutoPauseThresholdS,
    setDebugLoggingEnabled,
    setGpsLoggingEnabled,
    setGpxFilenamePrefix,
    setRecordingIntervalS,
} from '../../lib/app-state-store';
import { __resetDatabaseForTest } from '../../lib/database/client';

// ─── モックDB ──────────────────────────────────────────────────────────────────

function createMockDb() {
  return {
    execAsync: jest.fn().mockResolvedValue(undefined),
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    // 同期 API
    runSync: jest.fn(),
    getFirstSync: jest.fn().mockReturnValue(null),
    getAllSync: jest.fn().mockReturnValue([]),
    execSync: jest.fn(),
    closeSync: jest.fn(),
  };
}

type MockDb = ReturnType<typeof createMockDb>;
let mockDb: MockDb;

beforeEach(() => {
  mockDb = createMockDb();
  __resetDatabaseForTest();
  (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(mockDb);
});

// ─── getAppState ───────────────────────────────────────────────────────────────

describe('getAppState', () => {
  it('returns null when key does not exist', async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);
    const result = await getAppState('missing_key');
    expect(result).toBeNull();
  });

  it('returns value when key exists', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ value: '300' });
    const result = await getAppState('auto_pause_threshold_s');
    expect(result).toBe('300');
    expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining('SELECT value FROM app_state'),
      'auto_pause_threshold_s',
    );
  });
});

// ─── setAppState ───────────────────────────────────────────────────────────────

describe('setAppState', () => {
  it('calls runAsync with UPSERT statement', async () => {
    await setAppState('auto_pause_threshold_s', '600');
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO app_state'),
      'auto_pause_threshold_s',
      '600',
    );
  });
});

// ─── getAutoPauseThresholdS ────────────────────────────────────────────────────

// ─── getRecordingIntervalS ─────────────────────────────────────────────────────

describe('getRecordingIntervalS', () => {
  it('returns default when key is not set', async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);
    const result = await getRecordingIntervalS();
    expect(result).toBe(RECORDING_INTERVAL_S_DEFAULT);
  });

  it('returns parsed number when key exists', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ value: '4' });
    const result = await getRecordingIntervalS();
    expect(result).toBe(4);
  });

  it('returns default for out-of-range value', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ value: '0' });
    const result = await getRecordingIntervalS();
    expect(result).toBe(RECORDING_INTERVAL_S_DEFAULT);
  });
});

describe('setRecordingIntervalS', () => {
  it('persists the interval as a string', async () => {
    await setRecordingIntervalS(6);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO app_state'),
      'recording_interval_s',
      '6',
    );
  });
});

describe('getAutoPauseThresholdS', () => {
  it('returns default when key is not set', async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);
    const result = await getAutoPauseThresholdS();
    expect(result).toBe(AUTO_PAUSE_THRESHOLD_S_DEFAULT);
  });

  it('returns parsed number when key exists', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ value: '120' });
    const result = await getAutoPauseThresholdS();
    expect(result).toBe(120);
  });

  it('returns default for non-numeric value', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ value: 'not_a_number' });
    const result = await getAutoPauseThresholdS();
    expect(result).toBe(AUTO_PAUSE_THRESHOLD_S_DEFAULT);
  });

  it('returns default for zero', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ value: '0' });
    const result = await getAutoPauseThresholdS();
    expect(result).toBe(AUTO_PAUSE_THRESHOLD_S_DEFAULT);
  });
});

// ─── setAutoPauseThresholdS ────────────────────────────────────────────────────

describe('setAutoPauseThresholdS', () => {
  it('persists the threshold as a string', async () => {
    await setAutoPauseThresholdS(180);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO app_state'),
      'auto_pause_threshold_s',
      '180',
    );
  });
});

// ─── getAutoPauseEnabled ───────────────────────────────────────────────────────

describe('getAutoPauseEnabled', () => {
  it('returns true when key is not set', async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);
    expect(await getAutoPauseEnabled()).toBe(true);
  });

  it('returns false when value is "0"', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ value: '0' });
    expect(await getAutoPauseEnabled()).toBe(false);
  });

  it('returns true when value is "1"', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ value: '1' });
    expect(await getAutoPauseEnabled()).toBe(true);
  });
});

// ─── setAutoPauseEnabled ───────────────────────────────────────────────────────

describe('setAutoPauseEnabled', () => {
  it('writes "1" when enabled', async () => {
    await setAutoPauseEnabled(true);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO app_state'),
      'auto_pause_enabled',
      '1',
    );
  });

  it('writes "0" when disabled', async () => {
    await setAutoPauseEnabled(false);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO app_state'),
      'auto_pause_enabled',
      '0',
    );
  });
});

// ─── getGpxFilenamePrefix / setGpxFilenamePrefix ──────────────────────────────

describe('getGpxFilenamePrefix', () => {
  it('returns "trip" when key is not set', async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);
    expect(await getGpxFilenamePrefix()).toBe('trip');
  });

  it('returns stored prefix', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ value: 'drive' });
    expect(await getGpxFilenamePrefix()).toBe('drive');
  });
});

describe('setGpxFilenamePrefix', () => {
  it('persists the prefix', async () => {
    await setGpxFilenamePrefix('run');
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO app_state'),
      'gpx_filename_prefix',
      'run',
    );
  });
});

describe('getDebugLoggingEnabled', () => {
  it('returns default when key is not set', async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);
    const result = await getDebugLoggingEnabled();
    expect(result).toBe(APP_LOGGING_ENABLED_DEFAULT);
  });

  it('returns true when value is "1"', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ value: '1' });
    const result = await getDebugLoggingEnabled();
    expect(result).toBe(true);
  });

  it('returns false when value is "0"', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ value: '0' });
    const result = await getDebugLoggingEnabled();
    expect(result).toBe(false);
  });
});

describe('setDebugLoggingEnabled', () => {
  it('persists "1" when enabled', async () => {
    await setDebugLoggingEnabled(true);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO app_state'),
      'app_logging_enabled',
      '1',
    );
  });

  it('persists "0" when disabled', async () => {
    await setDebugLoggingEnabled(false);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO app_state'),
      'app_logging_enabled',
      '0',
    );
  });
});

describe('getGpsLoggingEnabled', () => {
  it('returns false when neither new nor legacy key is set', async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);
    const result = await getGpsLoggingEnabled();
    expect(result).toBe(false);
  });

  it('returns true when the new key is "1"', async () => {
    mockDb.getFirstAsync
      .mockResolvedValueOnce({ value: '1' })
      .mockResolvedValueOnce(null);
    const result = await getGpsLoggingEnabled();
    expect(result).toBe(true);
  });

  it('falls back to the legacy key', async () => {
    mockDb.getFirstAsync
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ value: '1' });
    const result = await getGpsLoggingEnabled();
    expect(result).toBe(true);
  });
});

describe('setGpsLoggingEnabled', () => {
  it('persists both new and legacy keys when enabled', async () => {
    await setGpsLoggingEnabled(true);
    expect(mockDb.runAsync).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT INTO app_state'),
      'gps_logging_enabled',
      '1',
    );
    expect(mockDb.runAsync).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO app_state'),
      'debug_logging_enabled',
      '1',
    );
  });

  it('persists both new and legacy keys when disabled', async () => {
    await setGpsLoggingEnabled(false);
    expect(mockDb.runAsync).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT INTO app_state'),
      'gps_logging_enabled',
      '0',
    );
    expect(mockDb.runAsync).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO app_state'),
      'debug_logging_enabled',
      '0',
    );
  });
});

// ─── 同期 API ──────────────────────────────────────────────────────────────────

describe('getAppStateSync', () => {
  it('returns null when row not found', () => {
    mockDb.getFirstSync.mockReturnValue(null);
    const result = getAppStateSync(mockDb as unknown as SQLite.SQLiteDatabase, 'key');
    expect(result).toBeNull();
  });

  it('returns value when row found', () => {
    mockDb.getFirstSync.mockReturnValue({ value: 'hello' });
    const result = getAppStateSync(mockDb as unknown as SQLite.SQLiteDatabase, 'key');
    expect(result).toBe('hello');
  });

  it('returns null on exception', () => {
    mockDb.getFirstSync.mockImplementation(() => { throw new Error('db error'); });
    const result = getAppStateSync(mockDb as unknown as SQLite.SQLiteDatabase, 'key');
    expect(result).toBeNull();
  });
});

describe('setAppStateSync', () => {
  it('calls runSync with UPSERT statement', () => {
    setAppStateSync(mockDb as unknown as SQLite.SQLiteDatabase, 'key', 'val');
    expect(mockDb.runSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO app_state'),
      'key',
      'val',
    );
  });
});

describe('getAutoPauseThresholdSSync', () => {
  it('returns default when not set', () => {
    mockDb.getFirstSync.mockReturnValue(null);
    expect(getAutoPauseThresholdSSync(mockDb as unknown as SQLite.SQLiteDatabase)).toBe(AUTO_PAUSE_THRESHOLD_S_DEFAULT);
  });

  it('returns parsed value', () => {
    mockDb.getFirstSync.mockReturnValue({ value: '90' });
    expect(getAutoPauseThresholdSSync(mockDb as unknown as SQLite.SQLiteDatabase)).toBe(90);
  });
});

describe('getAutoPauseEnabledSync', () => {
  it('returns true when not set', () => {
    mockDb.getFirstSync.mockReturnValue(null);
    expect(getAutoPauseEnabledSync(mockDb as unknown as SQLite.SQLiteDatabase)).toBe(true);
  });

  it('returns false when value is "0"', () => {
    mockDb.getFirstSync.mockReturnValue({ value: '0' });
    expect(getAutoPauseEnabledSync(mockDb as unknown as SQLite.SQLiteDatabase)).toBe(false);
  });
});
