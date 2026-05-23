// Compute-result cache. Keyed by date + location + options +
// CALCULATION_VERSION.
//
// CALCULATION_VERSION must be bumped whenever any of the following
// change in a way that affects computed values:
//   - ayanamsa polynomial (src/lib/astro/ayanamsa.ts)
//   - sunrise/sunset model (src/lib/astro/sunrise.ts)
//   - tithi/nakshatra/yoga/karana boundary math
//   - masa / paksha / adhika detection
//   - festival rule logic (src/lib/panchanga/festivals/*, tiebreakers.ts)
//
// On a version mismatch, cached entries are silently ignored (they'll
// be overwritten on next compute) — no migration needed because every
// value is a pure function of the cache-key inputs.
//
// LRU semantics: max 1000 entries; we evict oldest createdAt when over
// the cap. We also auto-evict entries older than 30 days at startup.

import { db, type CachedPanchangaRow } from './db';
import type { Location, Panchanga, PanchangaOptions } from '$lib/panchanga';

export const CALCULATION_VERSION = 2;

const MAX_ENTRIES = 1000;
const MAX_AGE_DAYS = 30;
const MS_PER_DAY = 86_400_000;

export function cacheKey(date: Date, location: Location, options: PanchangaOptions): string {
  const ymd = date.toISOString().slice(0, 10);
  const loc = `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)},${location.timezone}`;
  const opts = `${options.ayanamsa}/${options.monthSystem}/${options.topocentric ? 't' : 'g'}/${options.sunriseHorizon}`;
  return `v${CALCULATION_VERSION}|${ymd}|${loc}|${opts}`;
}

export async function getCached(key: string): Promise<Panchanga | null> {
  const row = await db().cachedPanchangas.get(key);
  return row?.data ?? null;
}

export async function putCached(key: string, data: Panchanga): Promise<void> {
  const row: CachedPanchangaRow = { cacheKey: key, data, createdAt: new Date() };
  await db().cachedPanchangas.put(row);
  await trimIfNeeded();
}

export async function evictStale(): Promise<number> {
  const cutoff = new Date(Date.now() - MAX_AGE_DAYS * MS_PER_DAY);
  return db().cachedPanchangas.where('createdAt').below(cutoff).delete();
}

async function trimIfNeeded(): Promise<void> {
  const count = await db().cachedPanchangas.count();
  if (count <= MAX_ENTRIES) return;
  const excess = count - MAX_ENTRIES;
  const oldest = await db().cachedPanchangas.orderBy('createdAt').limit(excess).primaryKeys();
  await db().cachedPanchangas.bulkDelete(oldest);
}

export async function clearAll(): Promise<void> {
  await db().cachedPanchangas.clear();
}
