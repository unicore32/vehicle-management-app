import * as SQLite from 'expo-sqlite';

import { __resetDatabaseForTest } from '../../lib/database/client';
import {
    createVehicle,
    getVehicle,
    getVehicles,
    setVehicleActive,
    updateVehicle,
} from '../../lib/vehicle-store';

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

describe('vehicle-store', () => {
  it('creates a vehicle', async () => {
    mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 7, changes: 1 });

    const id = await createVehicle({ displayName: 'スイフトスポーツ' });

    expect(id).toBe(7);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO vehicles'),
      'スイフトスポーツ',
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('updates a vehicle name', async () => {
    await updateVehicle(5, { displayName: 'アルトワークス' });

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE vehicles'),
      'アルトワークス',
      expect.any(Number),
      5,
    );
  });

  it('archives or restores a vehicle', async () => {
    await setVehicleActive(4, false);

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('is_active = ?'),
      0,
      expect.any(Number),
      4,
    );
  });

  it('fetches only active vehicles by default', async () => {
    await getVehicles();

    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      'SELECT * FROM vehicles WHERE is_active = 1 ORDER BY updated_at DESC, id DESC',
    );
  });

  it('fetches all vehicles when includeInactive is true', async () => {
    await getVehicles({ includeInactive: true });

    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      'SELECT * FROM vehicles ORDER BY is_active DESC, updated_at DESC, id DESC',
    );
  });

  it('fetches a vehicle by id', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ id: 1, display_name: 'ロードスター' });

    const vehicle = await getVehicle(1);

    expect(vehicle).toEqual({ id: 1, display_name: 'ロードスター' });
    expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
      'SELECT * FROM vehicles WHERE id = ?',
      1,
    );
  });
});