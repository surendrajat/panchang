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

import { db, type CachedPanchangaRow, type CachedFestivalsRow } from './db';
import { civilYMDInZone, MS_PER_DAY } from '$lib/astro';
import type { Location, Panchanga, PanchangaOptions, FestivalOccurrence } from '$lib/panchanga';

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
  const [panchanga, festivals] = await Promise.all([
    db().cachedPanchangas.where('createdAt').below(cutoff).delete(),
    db().cachedFestivals.where('createdAt').below(cutoff).delete(),
  ]);
  return panchanga + festivals;
}

async function trimIfNeeded(): Promise<void> {
  const count = await db().cachedPanchangas.count();
  if (count <= MAX_ENTRIES) return;
  const excess = count - MAX_ENTRIES;
  const oldest = await db().cachedPanchangas.orderBy('createdAt').limit(excess).primaryKeys();
  await db().cachedPanchangas.bulkDelete(oldest);
}

export async function clearAll(): Promise<void> {
  await Promise.all([db().cachedPanchangas.clear(), db().cachedFestivals.clear()]);
}

// ── Festival-year cache ──────────────────────────────────────────────────────
// Keyed by year + location + ayanamsa/monthSystem + CALCULATION_VERSION.
// A full-year festival scan (~365 panchanga evaluations) is expensive;
// results are deterministic for a given key so we cache them indefinitely
// (evictStale() prunes entries older than MAX_AGE_DAYS).

export function festivalCacheKey(
  year: number,
  location: Location,
  opts: { ayanamsa: string; monthSystem: string },
): string {
  const altitude = location.altitude ?? 0;
  const loc = `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)},${altitude.toFixed(1)},${location.timezone}`;
  return `v${CALCULATION_VERSION}|festivals|${year}|${loc}|${opts.ayanamsa}/${opts.monthSystem}`;
}

export async function getFestivalsCached(key: string): Promise<FestivalOccurrence[] | null> {
  const row = await db().cachedFestivals.get(key);
  return row?.data ?? null;
}

export async function putFestivalsCached(key: string, data: FestivalOccurrence[]): Promise<void> {
  const row: CachedFestivalsRow = { cacheKey: key, data, createdAt: new Date() };
  await db().cachedFestivals.put(row);
}
