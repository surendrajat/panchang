// Shared festival loader. Cache-first; on a miss it computes a calendar year of
// festivals off the main thread in a SINGLETON Web Worker, then caches the
// result. Used by both the Festivals view and an idle background prefetch on app
// load — so the first Festivals open is a cache hit even on a slow phone, where
// the ~365-day computePanchanga walk would otherwise spin for a while.
import { civilTimeInZone } from '$lib/astro';
import type { Location, AyanamsaSystem, MonthSystem, FestivalOccurrence } from '$lib/panchanga';
import { festivalCacheKey, getFestivalsCached, putFestivalsCached } from '$lib/storage';

type FestivalOpts = { ayanamsa: AyanamsaSystem; monthSystem: MonthSystem };

// Monthly recurrences are dropped from the year view (they'd swamp it).
const MONTHLY_KEYS = new Set([
  'ekadashi',
  'pradosh',
  'sankashti_chaturthi',
  'amavasya',
  'purnima',
  'masik_shivaratri',
]);

let worker: Worker | null = null;
let reqId = 0;
// In-flight worker requests keyed by id.
const pending = new Map<
  number,
  { resolve: (r: FestivalOccurrence[]) => void; reject: (e: Error) => void }
>();

function computeInWorker(
  fromMs: number,
  toMs: number,
  loc: Location,
  opts: FestivalOpts,
): Promise<FestivalOccurrence[]> {
  if (typeof Worker === 'undefined') return Promise.reject(new Error('Web Worker unavailable'));
  if (!worker) {
    // The singleton lives for the app's lifetime (reused across the Festivals
    // view and the prefetch) — cheap when idle, no teardown needed.
    worker = new Worker(new URL('../routes/festivals.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (
      e: MessageEvent<{ id: number; results?: FestivalOccurrence[]; error?: string }>,
    ) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      if (e.data.error) p.reject(new Error(e.data.error));
      else p.resolve(e.data.results ?? []);
    };
  }
  const id = ++reqId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker!.postMessage({ id, fromMs, toMs, loc, opts });
  });
}

/** Cache-first festival list for a calendar year (monthly recurrences removed). */
export async function loadFestivals(
  year: number,
  loc: Location,
  opts: FestivalOpts,
): Promise<FestivalOccurrence[]> {
  const key = festivalCacheKey(year, loc, opts);
  const cached = await getFestivalsCached(key);
  if (cached) return cached;
  const from = civilTimeInZone(year, 1, 1, loc.timezone, 12);
  const to = civilTimeInZone(year, 12, 31, loc.timezone, 12);
  const all = await computeInWorker(from.getTime(), to.getTime(), loc, opts);
  const results = all.filter((o) => !MONTHLY_KEYS.has(o.key));
  await putFestivalsCached(key, results);
  return results;
}

/** Fire-and-forget warm-up so a later Festivals open is an instant cache hit. */
export function prefetchFestivals(year: number, loc: Location, opts: FestivalOpts): void {
  void loadFestivals(year, loc, opts).catch(() => {
    /* best-effort; the view will compute on demand if this didn't land */
  });
}
