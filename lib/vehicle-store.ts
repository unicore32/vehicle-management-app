import { getDatabase } from './database/client';

export type Vehicle = {
  id: number;
  display_name: string;
  is_active: 0 | 1;
  created_at: number;
  updated_at: number;
};

export type UpsertVehicleInput = {
  displayName: string;
};

function normalizeDisplayName(displayName: string): string {
  return displayName.trim();
}

function validateDisplayName(displayName: string): string {
  const normalized = normalizeDisplayName(displayName);
  if (normalized.length === 0) {
    throw new Error('車両名を入力してください');
  }
  return normalized;
}

export async function getVehicle(vehicleId: number): Promise<Vehicle | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Vehicle>(
    'SELECT * FROM vehicles WHERE id = ?',
    vehicleId,
  );
}

export async function getVehicles(options?: {
  includeInactive?: boolean;
}): Promise<Vehicle[]> {
  const db = await getDatabase();
  if (options?.includeInactive) {
    return db.getAllAsync<Vehicle>(
      'SELECT * FROM vehicles ORDER BY is_active DESC, updated_at DESC, id DESC',
    );
  }

  return db.getAllAsync<Vehicle>(
    'SELECT * FROM vehicles WHERE is_active = 1 ORDER BY updated_at DESC, id DESC',
  );
}

export async function createVehicle(input: UpsertVehicleInput): Promise<number> {
  const db = await getDatabase();
  const now = Date.now();
  const displayName = validateDisplayName(input.displayName);
  const result = await db.runAsync(
    `INSERT INTO vehicles (display_name, is_active, created_at, updated_at)
     VALUES (?, 1, ?, ?)`,
    displayName,
    now,
    now,
  );
  return result.lastInsertRowId;
}

export async function updateVehicle(
  vehicleId: number,
  input: UpsertVehicleInput,
): Promise<void> {
  const db = await getDatabase();
  const displayName = validateDisplayName(input.displayName);
  await db.runAsync(
    `UPDATE vehicles
     SET display_name = ?, updated_at = ?
     WHERE id = ?`,
    displayName,
    Date.now(),
    vehicleId,
  );
}

export async function setVehicleActive(
  vehicleId: number,
  isActive: boolean,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE vehicles
     SET is_active = ?, updated_at = ?
     WHERE id = ?`,
    isActive ? 1 : 0,
    Date.now(),
    vehicleId,
  );
}