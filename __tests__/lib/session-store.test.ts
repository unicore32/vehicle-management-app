import * as SQLite from 'expo-sqlite';
import { __resetDatabaseForTest } from '../../lib/database/client';
import {
  createSession,
  updateSessionStatus,
  finishSession,
  setBackgroundActive,
  deleteSession,
  getActiveSession,
  getSession,
  getSessions,
  getFinishedSessionCount,
  type Session,
  type SessionStats,
} from '../../lib/session-store';

// ─── モックDB ヘルパー ──────────────────────────────────────────────────────────

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

// ─── createSession ─────────────────────────────────────────────────────────────

describe('createSession', () => {
  it('inserts a new session row and returns the inserted ID', async () => {
    mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 42, changes: 1 });

    const id = await createSession();

    expect(id).toBe(42);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO sessions'),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('creates session with recording status by default', async () => {
    await createSession();

    const sql = (mockDb.runAsync.mock.calls[0] as unknown[])[0] as string;
    expect(sql).toContain("'recording'");
  });
});

// ─── updateSessionStatus ──────────────────────────────────────────────────────

describe('updateSessionStatus', () => {
  it('updates status to paused with reason', async () => {
    await updateSessionStatus(5, 'paused', 'user_pause');

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE sessions'),
      'paused',
      'user_pause',
      expect.any(Number),
      5,
    );
  });

  it('sets paused_reason to null when not provided', async () => {
    await updateSessionStatus(5, 'recording');

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE sessions'),
      'recording',
      null,
      expect.any(Number),
      5,
    );
  });
});

// ─── finishSession ────────────────────────────────────────────────────────────

describe('finishSession', () => {
  it('marks session as finished and writes final stats', async () => {
    const stats: SessionStats = {
      distance_m: 1500,
      moving_time_s: 300,
      avg_speed: 5,
      max_speed: 15,
      point_count: 60,
    };

    await finishSession(3, stats);

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('finished'),
      expect.any(Number), // ended_at
      1500,
      300,
      5,
      15,
      60,
      expect.any(Number), // updated_at
      3,
    );
  });
});

// ─── setBackgroundActive ──────────────────────────────────────────────────────

describe('setBackgroundActive', () => {
  it('sets is_background_active to 1 when true', async () => {
    await setBackgroundActive(7, true);

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('is_background_active'),
      1,
      expect.any(Number),
      7,
    );
  });

  it('sets is_background_active to 0 when false', async () => {
    await setBackgroundActive(7, false);

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('is_background_active'),
      0,
      expect.any(Number),
      7,
    );
  });
});

// ─── deleteSession ────────────────────────────────────────────────────────────

describe('deleteSession', () => {
  it('deletes the session row by ID', async () => {
    await deleteSession(10);

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      'DELETE FROM sessions WHERE id = ?',
      10,
    );
  });
});

// ─── getActiveSession ─────────────────────────────────────────────────────────

describe('getActiveSession', () => {
  it('returns the session when one is active', async () => {
    const session: Partial<Session> = { id: 1, status: 'recording' };
    mockDb.getFirstAsync.mockResolvedValue(session);

    const result = await getActiveSession();

    expect(result).toEqual(session);
    const sql = (mockDb.getFirstAsync.mock.calls[0] as unknown[])[0] as string;
    expect(sql).toContain("status IN ('recording', 'paused')");
  });

  it('returns null when no active session exists', async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);

    const result = await getActiveSession();

    expect(result).toBeNull();
  });
});

// ─── getSession ───────────────────────────────────────────────────────────────

describe('getSession', () => {
  it('returns session by ID', async () => {
    const session: Partial<Session> = { id: 2, status: 'finished' };
    mockDb.getFirstAsync.mockResolvedValue(session);

    const result = await getSession(2);

    expect(result).toEqual(session);
    expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
      'SELECT * FROM sessions WHERE id = ?',
      2,
    );
  });

  it('returns null for non-existent session', async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);
    const result = await getSession(999);
    expect(result).toBeNull();
  });
});

// ─── getSessions ─────────────────────────────────────────────────────────────

describe('getSessions', () => {
  it('fetches all sessions ordered by started_at DESC', async () => {
    const sessions: Partial<Session>[] = [{ id: 2 }, { id: 1 }];
    mockDb.getAllAsync.mockResolvedValue(sessions);

    const result = await getSessions();

    expect(result).toEqual(sessions);
    const sql = (mockDb.getAllAsync.mock.calls[0] as unknown[])[0] as string;
    expect(sql).toContain('ORDER BY started_at DESC');
  });

  it('applies LIMIT when specified', async () => {
    await getSessions(10);

    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT ?'),
      10,
    );
  });
});

// ─── getFinishedSessionCount ──────────────────────────────────────────────────

describe('getFinishedSessionCount', () => {
  it('returns the count of finished sessions', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ count: 7 });

    const count = await getFinishedSessionCount();

    expect(count).toBe(7);
  });

  it('returns 0 when no rows returned', async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);

    const count = await getFinishedSessionCount();

    expect(count).toBe(0);
  });
});
