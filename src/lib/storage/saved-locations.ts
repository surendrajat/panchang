import { db, type SavedLocation } from './db';

export async function listSavedLocations(): Promise<SavedLocation[]> {
  return db().savedLocations.toArray();
}

export async function addSavedLocation(loc: Omit<SavedLocation, 'id'>): Promise<number> {
  return db().savedLocations.add(loc as SavedLocation);
}

export async function deleteSavedLocation(id: number): Promise<void> {
  await db().savedLocations.delete(id);
}

export async function setDefaultLocation(id: number): Promise<void> {
  const all = await db().savedLocations.toArray();
  await db().transaction('rw', db().savedLocations, async () => {
    for (const row of all) {
      if (row.id === undefined) continue;
      await db().savedLocations.update(row.id, { isDefault: row.id === id });
    }
  });
}
