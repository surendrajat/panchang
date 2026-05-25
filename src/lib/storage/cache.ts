// Optional compute-result cache. Keyed by date + location + options +
// CALCULATION_VERSION. The helpers are tested and the Settings screen can clear
// the table, but route-level calculations currently compute directly.
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
// LRU semantics: max 1000 entries; putCached() evicts oldest createdAt when
// over the cap. evictStale() is available to remove entries older than 30 days
// when the cache is wired into startup.

import { db, type CachedPanchangaRow } from './db';
import { civilYMDInZone, MS_PER_DAY } from '$lib/astro';
import type { Location, Panchanga, PanchangaOptions } from '$lib/panchanga';

export const CALCULATION_VERSION = 3;

const MAX_ENTRIES = 1000;
const MAX_AGE_DAYS = 30;

export function cacheKey(date: Date, location: Location, options: PanchangaOptions): string {
  const { year, month, day } = civilYMDInZone(date, location.timezone);
  const ymd = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const altitude = location.altitude ?? 0;
  const loc = `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)},${altitude.toFixed(1)},${location.timezone}`;
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
