// CRUD for saved birth profiles (kundli + matching). Mirrors the
// saved-locations module. Newest first.

import { db, type BirthProfile } from './db';

export async function listBirthProfiles(): Promise<BirthProfile[]> {
  return db().birthProfiles.orderBy('createdAt').reverse().toArray();
}

export async function addBirthProfile(
  profile: Omit<BirthProfile, 'id' | 'createdAt'>,
): Promise<number> {
  return (await db().birthProfiles.add({ ...profile, createdAt: new Date() })) as number;
}

export async function deleteBirthProfile(id: number): Promise<void> {
  await db().birthProfiles.delete(id);
}
