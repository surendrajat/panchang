/// <reference lib="webworker" />
// Compute a year of festivals off the main thread, so the Festivals view can
// show an animated spinner instead of freezing during the ~1s first-load
// calculation (cache misses only — repeat visits hit IndexedDB on the main
// thread and never reach the worker).
import { findFestivals } from '$lib/panchanga';
import type { Location, AyanamsaSystem, MonthSystem } from '$lib/panchanga';

interface Req {
  id: number;
  fromMs: number;
  toMs: number;
  loc: Location;
  opts: { ayanamsa: AyanamsaSystem; monthSystem: MonthSystem };
}

self.onmessage = (e: MessageEvent<Req>) => {
  const { id, fromMs, toMs, loc, opts } = e.data;
  try {
    // annualOnly: this worker only ever feeds the annual Festivals list, which
    // drops the monthly recurrences — so skip computing them (saves ~half the
    // per-day festival-evaluation cost).
    const results = findFestivals(new Date(fromMs), new Date(toMs), loc, opts, {
      annualOnly: true,
    });
    (self as unknown as Worker).postMessage({ id, results });
  } catch (err) {
    (self as unknown as Worker).postMessage({
      id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
