// Optional compute-result cache. Keyed by date + location + options +
// CALCULATION_VERSION + CACHE_BUST. The helpers are tested and the Settings
// screen can clear the table, but daily panchanga calculations currently
// compute directly (only festival-year results are actively cached).
//
// Two invalidation levers — bump either to force fresh computation:
//   CALCULATION_VERSION — increment when algorithm math changes and cached
//     values would be incorrect (ayanamsa, sunrise model, tithi boundaries,
//     festival rules). Old entries become orphans cleaned up by evictStale().
//   CACHE_BUST — increment to force-invalidate all client caches without any
//     algorithm change (e.g. display/naming fix, data correction). This is
//     the recommended way to push a global cache clear via a code deploy when
//     no computation logic actually changed.
//
// Both values are embedded in every cache key, so mismatched entries are
// silently ignored and overwritten — no migration needed.
//
// TTLs: festival-year cache expires after MAX_FESTIVAL_AGE_DAYS (1 day) so
// stale entries don't accumulate across calendar years. Daily panchanga
// entries live longer (MAX_PANCHANGA_AGE_DAYS = 30).

import { db, type CachedPanchangaRow, type CachedFestivalsRow } from './db';
import { civilYMDInZone, MS_PER_DAY } from '$lib/astro';
import type { Location, Panchanga, PanchangaOptions, FestivalOccurrence } from '$lib/panchanga';

export const CALCULATION_VERSION = 3;
// Bump to force-invalidate all client caches on the next deploy without
// changing CALCULATION_VERSION (e.g. display name fix, data correction).
export const CACHE_BUST = 1;

const MAX_ENTRIES = 1000;
const MAX_PANCHANGA_AGE_DAYS = 30;
// Festival-year caches are heavier (365-day scan) but also larger and
// potentially stale after a deploy. 1-day TTL keeps storage lean while
// still eliminating recomputation on back-navigation within the same day.
const MAX_FESTIVAL_AGE_DAYS = 1;

export function cacheKey(date: Date, location: Location, options: PanchangaOptions): string {
  const { year, month, day } = civilYMDInZone(date, location.timezone);
  const ymd = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const altitude = location.altitude ?? 0;
  const loc = `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)},${altitude.toFixed(1)},${location.timezone}`;
  const opts = `${options.ayanamsa}/${options.monthSystem}/${options.topocentric ? 't' : 'g'}/${options.sunriseHorizon}`;
  return `v${CALCULATION_VERSION}|b${CACHE_BUST}|${ymd}|${loc}|${opts}`;
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
  const panchangaCutoff = new Date(Date.now() - MAX_PANCHANGA_AGE_DAYS * MS_PER_DAY);
  const festivalCutoff = new Date(Date.now() - MAX_FESTIVAL_AGE_DAYS * MS_PER_DAY);
  const [panchanga, festivals] = await Promise.all([
    db().cachedPanchangas.where('createdAt').below(panchangaCutoff).delete(),
    db().cachedFestivals.where('createdAt').below(festivalCutoff).delete(),
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
  return `v${CALCULATION_VERSION}|b${CACHE_BUST}|festivals|${year}|${loc}|${opts.ayanamsa}/${opts.monthSystem}`;
}

export async function getFestivalsCached(key: string): Promise<FestivalOccurrence[] | null> {
  const row = await db().cachedFestivals.get(key);
  return row?.data ?? null;
}

export async function putFestivalsCached(key: string, data: FestivalOccurrence[]): Promise<void> {
  const row: CachedFestivalsRow = { cacheKey: key, data, createdAt: new Date() };
  await db().cachedFestivals.put(row);
}
