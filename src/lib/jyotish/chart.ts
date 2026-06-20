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
export function birthInstant(date: string, time: string, timezone: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return civilTimeInZone(y, m, d, timezone, hh, mm, 0);
}

export function computeBirthChart(
  instant: Date,
  location: Location,
  timeKnown: boolean,
  options?: Partial<BirthChartOptions>,
): BirthChart {
  const opts: BirthChartOptions = { ...DEFAULT_CHART_OPTIONS, ...(options ?? {}) };
  // Touch the JD once to fail fast on an invalid instant before the
  // heavier ephemeris work.
  dateToJulian(instant);

  const grahas = computeGrahas(instant, opts.ayanamsa, opts.nodeType);
  const lagna = timeKnown ? computeLagna(instant, location, opts.ayanamsa) : null;

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
