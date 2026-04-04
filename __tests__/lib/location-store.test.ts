/**
 * @skill record_gps_trace / query_location_history / clear_location_history
 * Unit tests for lib/location-store.ts
 *
 * expo-sqlite は jest.setup.ts でモック済み。
 * 各テスト前に DB シングルトンをリセットして独立性を保つ。
 */
import * as SQLite from 'expo-sqlite';
import { __resetDatabaseForTest } from '../../lib/database/client';
import {
    clearLocations,
    getLocationCount,
    getLocations,
    insertLocation,
    type LocationData,
} from '../../lib/location-store';

// ─── ヘルパー ─────────────────────────────────────────────────────────────────

const makeLocation = (overrides: Partial<LocationData> = {}): LocationData => ({
  latitude: 35.6812,
  longitude: 139.7671,
  altitude: 10.0,
  accuracy: 5.0,
  speed: 13.88, // 50 km/h in m/s
  timestamp: Date.now(),
  ...overrides,
});

// ─── セットアップ ─────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  __resetDatabaseForTest();
});

// ─── insertLocation ───────────────────────────────────────────────────────────

describe('insertLocation', () => {
  it('正常系: 1 件挿入時に runAsync が正しいパラメータで呼ばれる', async () => {
    const location = makeLocation();
    await insertLocation(location);

    const db = await (SQLite.openDatabaseAsync as jest.Mock).mock.results[0].value;
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO locations'),
      [
        location.latitude,
        location.longitude,
        location.altitude,
        location.accuracy,
        location.speed,
        location.timestamp,
      ],
    );
  });

  it('正常系: null フィールド（altitude/accuracy/speed）を含む場合も挿入できる', async () => {
    const location = makeLocation({ altitude: null, accuracy: null, speed: null });
    await expect(insertLocation(location)).resolves.toBeUndefined();
  });

  it('異常系: DB エラー時に例外がスローされる', async () => {
    // openDatabaseAsync を再度呼ばせるためリセット
    __resetDatabaseForTest();
    const mockError = new Error('SQLITE_FULL');
    (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValueOnce({
      execAsync: jest.fn().mockResolvedValue(undefined),
      runAsync: jest.fn().mockRejectedValue(mockError),
      getAllAsync: jest.fn().mockResolvedValue([]),
      getFirstAsync: jest.fn().mockResolvedValue(null),
    });

    const location = makeLocation();
    await expect(insertLocation(location)).rejects.toThrow('SQLITE_FULL');
  });
});

// ─── getLocations ─────────────────────────────────────────────────────────────

describe('getLocations', () => {
  it('正常系: 件数制限なしの場合 LIMIT 句なしのクエリが実行される', async () => {
    await getLocations();

    const db = await (SQLite.openDatabaseAsync as jest.Mock).mock.results[0].value;
    expect(db.getAllAsync).toHaveBeenCalledWith(
      expect.not.stringContaining('LIMIT'),
    );
  });

  it('正常系: limit を指定した場合 LIMIT 句つきクエリが実行される', async () => {
    __resetDatabaseForTest();
    (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValueOnce({
      execAsync: jest.fn().mockResolvedValue(undefined),
      runAsync: jest.fn().mockResolvedValue(undefined),
      getAllAsync: jest.fn().mockResolvedValue([]),
      getFirstAsync: jest.fn().mockResolvedValue(null),
    });

    await getLocations(100);

    const db = await (SQLite.openDatabaseAsync as jest.Mock).mock.results[0].value;
    expect(db.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT'),
      [100],
    );
  });

  it('正常系: getAllAsync が返した配列をそのまま返す', async () => {
    const mockLocations = [
      { id: 1, ...makeLocation(), created_at: Date.now() },
    ];
    __resetDatabaseForTest();
    (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValueOnce({
      execAsync: jest.fn().mockResolvedValue(undefined),
      runAsync: jest.fn().mockResolvedValue(undefined),
      getAllAsync: jest.fn().mockResolvedValue(mockLocations),
      getFirstAsync: jest.fn().mockResolvedValue(null),
    });

    const result = await getLocations();
    expect(result).toEqual(mockLocations);
  });
});

// ─── getLocationCount ─────────────────────────────────────────────────────────

describe('getLocationCount', () => {
  it('正常系: count を数値で返す', async () => {
    __resetDatabaseForTest();
    (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValueOnce({
      execAsync: jest.fn().mockResolvedValue(undefined),
      runAsync: jest.fn().mockResolvedValue(undefined),
      getAllAsync: jest.fn().mockResolvedValue([]),
      getFirstAsync: jest.fn().mockResolvedValue({ count: 42 }),
    });

    const count = await getLocationCount();
    expect(count).toBe(42);
  });

  it('正常系: getFirstAsync が null を返した場合 0 を返す', async () => {
    const count = await getLocationCount(); // mock returns null by default
    expect(count).toBe(0);
  });
});

// ─── clearLocations ───────────────────────────────────────────────────────────

describe('clearLocations', () => {
  it('正常系: DELETE FROM locations が実行される', async () => {
    await clearLocations();

    const db = await (SQLite.openDatabaseAsync as jest.Mock).mock.results[0].value;
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM locations'),
    );
  });
});
