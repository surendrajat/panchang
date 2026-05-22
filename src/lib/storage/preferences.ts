// Preferences read/write helpers. Single row keyed 'singleton'.

import { db, DEFAULT_PREFERENCES, type Preferences } from './db';

export async function loadPreferences(): Promise<Preferences> {
  const row = await db().preferences.get('singleton');
  return row ?? DEFAULT_PREFERENCES;
}

export async function savePreferences(prefs: Preferences): Promise<void> {
  await db().preferences.put({ ...prefs, id: 'singleton' });
}

export async function patchPreferences(patch: Partial<Preferences>): Promise<Preferences> {
  const current = await loadPreferences();
  const next = { ...current, ...patch, id: 'singleton' as const };
  await db().preferences.put(next);
  return next;
}
