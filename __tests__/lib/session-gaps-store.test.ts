import * as SQLite from 'expo-sqlite';
import { __resetDatabaseForTest } from '../../lib/database/client';
import {
  insertSessionGap,
  updateGapCorrectionMode,
  getSessionGaps,
  type SessionGapInput,
} from '../../lib/session-gaps-store';

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

// ─── insertSessionGap ────────────────────────────────────────────────────────

describe('insertSessionGap', () => {
  it('inserts a gap row and returns the inserted ID', async () => {
    mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 7, changes: 1 });

    const gap: SessionGapInput = {
      session_id: 1,
      gap_started_at: 1000,
      gap_ended_at: 5000,
      reason: 'gps_timeout',
      correction_mode: 'none',
    };

    const id = await insertSessionGap(gap);

    expect(id).toBe(7);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO session_gaps'),
      1, 1000, 5000, 'gps_timeout', 'none',
    );
  });

  it('inserts null reason when not provided', async () => {
    const gap: SessionGapInput = {
      session_id: 2,
      gap_started_at: 2000,
      gap_ended_at: 8000,
      reason: null,
      correction_mode: 'none',
    };

    await insertSessionGap(gap);

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO session_gaps'),
      2, 2000, 8000, null, 'none',
    );
  });
});

// ─── updateGapCorrectionMode ─────────────────────────────────────────────────

describe('updateGapCorrectionMode', () => {
  it('updates correction_mode to interpolated', async () => {
    await updateGapCorrectionMode(3, 'interpolated');

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      'UPDATE session_gaps SET correction_mode = ? WHERE id = ?',
      'interpolated',
      3,
    );
  });

  it('updates correction_mode to manual', async () => {
    await updateGapCorrectionMode(5, 'manual');

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      'UPDATE session_gaps SET correction_mode = ? WHERE id = ?',
      'manual',
      5,
    );
  });
});

// ─── getSessionGaps ───────────────────────────────────────────────────────────

describe('getSessionGaps', () => {
  it('fetches gaps for a session ordered by gap_started_at ASC', async () => {
    await getSessionGaps(1);

    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY gap_started_at ASC'),
      1,
    );
  });

  it('returns empty array when no gaps exist', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    const result = await getSessionGaps(1);
    expect(result).toEqual([]);
  });

  it('returns gap rows when they exist', async () => {
    const gaps = [
      { id: 1, session_id: 1, gap_started_at: 1000, gap_ended_at: 5000, reason: 'gps_timeout', correction_mode: 'none' },
    ];
    mockDb.getAllAsync.mockResolvedValue(gaps);

    const result = await getSessionGaps(1);

    expect(result).toEqual(gaps);
  });
});
