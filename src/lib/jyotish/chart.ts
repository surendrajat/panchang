// Assemble a full birth chart (kundli) from a birth instant + place.
//
// Houses are whole-sign (bhava = rashi): house 1 is the whole lagna sign,
// house 2 the next, and so on — the dominant North-Indian convention.
// When the birth time is unknown, lagna and houses are null but graha
// rashis and the Moon-based dasha remain valid.

import { civilTimeInZone, dateToJulian } from '$lib/astro';
import type { Location } from '$lib/panchanga/types';
import { computeGrahas } from './grahas';
import { computeLagna } from './lagna';
import { DEFAULT_CHART_OPTIONS } from './types';
import type { BirthChart, BirthChartOptions } from './types';

// Build the UTC birth instant from civil date + time in the birth place's
// IANA time zone. `date` is "YYYY-MM-DD", `time` is "HH:MM" (24h, local).
// A blank or malformed time defaults to NOON — the standard "birth time
// unknown" convention. (Without this, Number('') === 0 would silently produce
// a midnight chart with a meaningless lagna instead of the noon default.)
export function birthInstant(date: string, time: string, timezone: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const hm = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  let hour = hm ? Number(hm[1]) : 12;
  let minute = hm ? Number(hm[2]) : 0;
  // Out-of-range time (e.g. "25:99") is treated as unknown → noon, not silently
  // rolled over into a wrong instant.
  if (hour > 23 || minute > 59) {
    hour = 12;
    minute = 0;
  }
  return civilTimeInZone(y, m, d, timezone, hour, minute, 0);
}

export function computeBirthChart(
  instant: Date,
  location: Location,
  timeKnown: boolean,
  options?: Partial<BirthChartOptions>,
): BirthChart {
  const opts: BirthChartOptions = { ...DEFAULT_CHART_OPTIONS, ...(options ?? {}) };
  // Fail fast on an invalid instant — dateToJulian returns NaN (it does NOT throw)
  // for an Invalid Date, which would otherwise leak a cryptic ephemeris error.
  if (!Number.isFinite(dateToJulian(instant))) {
    throw new RangeError('computeBirthChart: invalid birth instant');
  }

  const grahas = computeGrahas(instant, opts.ayanamsa, opts.nodeType);
  // Lagna (and houses) need the place; validate it so a NaN/out-of-range location
  // can't silently produce a NaN-laced chart (the panchanga path already rejects).
  let lagna: BirthChart['lagna'] = null;
  if (timeKnown) {
    if (
      !Number.isFinite(location.latitude) ||
      Math.abs(location.latitude) > 90 ||
      !Number.isFinite(location.longitude) ||
      Math.abs(location.longitude) > 180
    ) {
      throw new RangeError(
        `computeBirthChart: invalid location ${location.latitude},${location.longitude}`,
      );
    }
    lagna = computeLagna(instant, location, opts.ayanamsa);
  }

  if (lagna) {
    for (const g of grahas) {
      g.house = ((g.rashi - lagna.rashi + 12) % 12) + 1;
    }
  }

  const moon = grahas.find((g) => g.key === 'moon');
  if (!moon) throw new Error('Moon position missing from chart');

  return {
    instant,
    location,
    options: opts,
    lagna,
    grahas,
    moonNakshatra: { index: moon.nakshatra, pada: moon.pada },
    moonRashi: moon.rashi,
  };
}
