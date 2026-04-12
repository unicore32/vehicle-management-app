import * as SQLite from 'expo-sqlite';
import { __resetDatabaseForTest } from '../../lib/database/client';
import {
  insertSessionPoints,
  getSessionPoints,
  getRecentSessionPoints,
  getLatestSessionPoint,
  getSessionPointCount,
  computeSessionStats,
  computeLiveDistance,
  type SessionPointInput,
} from '../../lib/session-points-store';

// ─── モックDB ─────────────────────────────────────────────────────────────────

function createMockDb() {
  return {
    execAsync: jest.fn().mockResolvedValue(undefined),
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
  };
}

let mockDb: ReturnType<typeof createMockDb>;

beforeEach(() => {
  mockDb = createMockDb();
  __resetDatabaseForTest();
  (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(mockDb);
});

// ─── insertSessionPoints ──────────────────────────────────────────────────────

describe('insertSessionPoints', () => {
  it('inserts each point with a separate runAsync call', async () => {
    const points: SessionPointInput[] = [
      { session_id: 1, latitude: 35.68, longitude: 139.76, altitude: null, accuracy: null, speed: 5.0, timestamp: 1000 },
      { session_id: 1, latitude: 35.69, longitude: 139.77, altitude: 10, accuracy: 5, speed: 6.0, timestamp: 6000 },
    ];

    await insertSessionPoints(points);

    expect(mockDb.runAsync).toHaveBeenCalledTimes(2);
    expect(mockDb.runAsync).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT INTO session_points'),
      1, 35.68, 139.76, null, null, 5.0, 1000,
    );
  });

  it('does nothing for an empty array', async () => {
    await insertSessionPoints([]);
    expect(mockDb.runAsync).not.toHaveBeenCalled();
  });
});

// ─── getSessionPoints ─────────────────────────────────────────────────────────

describe('getSessionPoints', () => {
  it('fetches all points for a session in timestamp ASC order', async () => {
    await getSessionPoints(1);

    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY timestamp ASC'),
      1,
    );
  });

  it('applies LIMIT when specified', async () => {
    await getSessionPoints(1, 50);

    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT ?'),
      1,
      50,
    );
  });
});

describe('getRecentSessionPoints', () => {
  it('fetches the newest points first and returns them in timestamp ASC order', async () => {
    await getRecentSessionPoints(1, 50);

    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY timestamp DESC'),
      1,
      50,
    );
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('recent_points'),
      1,
      50,
    );
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY timestamp ASC'),
      1,
      50,
    );
  });
});

// ─── getLatestSessionPoint ────────────────────────────────────────────────────

describe('getLatestSessionPoint', () => {
  it('queries for the most recent point', async () => {
    await getLatestSessionPoint(1);

    expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY timestamp DESC'),
      1,
    );
  });

  it('returns null when no points exist', async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);
    const result = await getLatestSessionPoint(1);
    expect(result).toBeNull();
  });
});

// ─── getSessionPointCount ─────────────────────────────────────────────────────

describe('getSessionPointCount', () => {
  it('returns the point count for a session', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ count: 123 });
    const count = await getSessionPointCount(1);
    expect(count).toBe(123);
  });

  it('returns 0 when query returns null', async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);
    const count = await getSessionPointCount(1);
    expect(count).toBe(0);
  });
});

// ─── computeSessionStats ─────────────────────────────────────────────────────

describe('computeSessionStats', () => {
  it('returns all-zero stats for zero points', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);

    const stats = await computeSessionStats(1);

    expect(stats).toEqual({ distance_m: 0, moving_time_s: 0, avg_speed: 0, max_speed: 0, point_count: 0 });
  });

  it('returns zero distance for a single point', async () => {
    mockDb.getAllAsync.mockResolvedValue([
      { latitude: 35.68, longitude: 139.76, speed: 5.0, timestamp: 1000 },
    ]);

    const stats = await computeSessionStats(1);

    expect(stats.distance_m).toBe(0);
    expect(stats.point_count).toBe(1);
  });

  it('calculates non-zero distance for two distinct points', async () => {
    // 赤道上で経度 1° ≈ 111,195 m
    mockDb.getAllAsync.mockResolvedValue([
      { latitude: 0, longitude: 0, speed: 1.0, timestamp: 0 },
      { latitude: 0, longitude: 1, speed: 1.0, timestamp: 5_000 },
    ]);

    const stats = await computeSessionStats(1);

    expect(stats.distance_m).toBeGreaterThan(110_000);
    expect(stats.distance_m).toBeLessThan(112_000);
    expect(stats.point_count).toBe(2);
  });

  it('tracks max speed across all points', async () => {
    mockDb.getAllAsync.mockResolvedValue([
      { latitude: 0, longitude: 0,     speed: 5.0,  timestamp: 0      },
      { latitude: 0, longitude: 0.001, speed: 20.0, timestamp: 5_000  },
      { latitude: 0, longitude: 0.002, speed: 8.0,  timestamp: 10_000 },
    ]);

    const stats = await computeSessionStats(1);

    expect(stats.max_speed).toBe(20.0);
  });

  it('counts only moving intervals (speed >= 0.5 m/s) in moving_time_s', async () => {
    // 判定は curr.speed（区間の終端ポイントの速度）を使う
    mockDb.getAllAsync.mockResolvedValue([
      { latitude: 0, longitude: 0,     speed: 0.1, timestamp: 0       }, // src
      { latitude: 0, longitude: 0.001, speed: 0.1, timestamp: 10_000  }, // dst speed < 0.5 → カウントしない
      { latitude: 0, longitude: 0.002, speed: 1.0, timestamp: 20_000  }, // dst speed >= 0.5 → 10秒カウント
    ]);

    const stats = await computeSessionStats(1);

    // 区間 0→10s: curr.speed=0.1 < 0.5 → カウントしない
    // 区間 10→20s: curr.speed=1.0 >= 0.5, gap=10s < 30s → 10秒カウント
    expect(stats.moving_time_s).toBeCloseTo(10, 0);
  });

  it('excludes intervals with gap larger than 30 seconds', async () => {
    mockDb.getAllAsync.mockResolvedValue([
      { latitude: 0, longitude: 0, speed: 2.0, timestamp: 0 },
      { latitude: 0, longitude: 1, speed: 2.0, timestamp: 60_000 }, // 60 秒のギャップ
    ]);

    const stats = await computeSessionStats(1);

    expect(stats.moving_time_s).toBe(0);
  });

  it('returns avg_speed as 0 when moving_time_s is 0', async () => {
    mockDb.getAllAsync.mockResolvedValue([
      { latitude: 0, longitude: 0,    speed: 0.0, timestamp: 0     },
      { latitude: 0, longitude: 0.01, speed: 0.0, timestamp: 5_000 },
    ]);

    const stats = await computeSessionStats(1);

    expect(stats.avg_speed).toBe(0);
  });

  it('avg_speed equals distance / moving_time when moving', async () => {
    mockDb.getAllAsync.mockResolvedValue([
      { latitude: 0, longitude: 0,    speed: 1.0, timestamp: 0      },
      { latitude: 0, longitude: 0.01, speed: 1.0, timestamp: 10_000 },
    ]);

    const stats = await computeSessionStats(1);

    expect(stats.avg_speed).toBeCloseTo(stats.distance_m / stats.moving_time_s, 5);
  });
});

// ─── computeLiveDistance ──────────────────────────────────────────────────────

describe('computeLiveDistance', () => {
  it('returns 0 for no points', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    const km = await computeLiveDistance(1);
    expect(km).toBe(0);
  });

  it('returns distance in km', async () => {
    // 赤道上で経度 1° ≈ 111.195 km
    mockDb.getAllAsync.mockResolvedValue([
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 1 },
    ]);

    const km = await computeLiveDistance(1);

    expect(km).toBeGreaterThan(110);
    expect(km).toBeLessThan(112);
  });

  it('fetches only latitude and longitude columns', async () => {
    await computeLiveDistance(1);

    const sql = (mockDb.getAllAsync.mock.calls[0] as unknown[])[0] as string;
    expect(sql).toContain('SELECT latitude, longitude');
  });
});
