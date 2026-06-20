// Vimshottari Dasha — the 120-year planetary period system keyed to the
// Moon's nakshatra at birth. Pure arithmetic, no ephemeris: the only
// astronomical input is the Moon's sidereal longitude, passed in.
//
// The balance of the first mahadasha is set by how far the Moon has
// travelled through its nakshatra: fraction-through-nakshatra equals
// fraction-elapsed-through that nakshatra-lord's period.

import { MS_PER_DAY } from '$lib/astro';
import { nakshatraOf } from './grahas';
import type { DashaPeriod, GrahaKey } from './types';

interface DashaLord {
  lord: GrahaKey;
  years: number;
}

// Canonical order and year-spans, starting from Ketu (the lord of
// Ashwini, nakshatra 1). Sums to 120.
const SEQUENCE: readonly DashaLord[] = [
  { lord: 'ketu', years: 7 },
  { lord: 'venus', years: 20 },
  { lord: 'sun', years: 6 },
  { lord: 'moon', years: 10 },
  { lord: 'mars', years: 7 },
  { lord: 'rahu', years: 18 },
  { lord: 'jupiter', years: 16 },
  { lord: 'saturn', years: 19 },
  { lord: 'mercury', years: 17 },
];
const TOTAL_YEARS = 120;
// A Vimshottari year is conventionally taken as 365.25 days for display.
const DAYS_PER_YEAR = 365.25;

function addYears(date: Date, years: number): Date {
  return new Date(date.getTime() + years * DAYS_PER_YEAR * MS_PER_DAY);
}

// Full mahadasha sequence from the current (birth) period forward through
// one 120-year cycle. The first period is partial — its start is back-
// dated by the elapsed balance so the birth instant falls inside it.
export function vimshottariMahadashas(birth: Date, moonSiderealLongitude: number): DashaPeriod[] {
  const nak = nakshatraOf(moonSiderealLongitude);
  const startIndex = (nak.index - 1) % 9;
  const first = SEQUENCE[startIndex];
  const elapsedYears = nak.fraction * first.years;

  const periods: DashaPeriod[] = [];
  let cursor = addYears(birth, -elapsedYears); // start of the running mahadasha
  for (let i = 0; i < SEQUENCE.length; i++) {
    const lord = SEQUENCE[(startIndex + i) % 9];
    const end = addYears(cursor, lord.years);
    periods.push({ lord: lord.lord, start: cursor, end, years: lord.years });
    cursor = end;
  }
  return periods;
}

// Antardashas (sub-periods) within a mahadasha: same Vimshottari order
// starting from the mahadasha lord, each spanning mahaYears·subYears/120.
export function antardashasOf(maha: DashaPeriod): DashaPeriod[] {
  const startIdx = SEQUENCE.findIndex((d) => d.lord === maha.lord);
  if (startIdx < 0) return [];
  const mahaYears = SEQUENCE[startIdx].years;
  const out: DashaPeriod[] = [];
  let cursor = maha.start;
  for (let i = 0; i < SEQUENCE.length; i++) {
    const sub = SEQUENCE[(startIdx + i) % 9];
    const years = (mahaYears * sub.years) / TOTAL_YEARS;
    const end = addYears(cursor, years);
    out.push({ lord: sub.lord, start: cursor, end, years });
    cursor = end;
  }
  return out;
}

// Which mahadasha is running at `at` (default now). Returns its index in
// the array from vimshottariMahadashas, or -1 if outside the cycle.
export function activeDashaIndex(periods: DashaPeriod[], at: Date): number {
  return periods.findIndex((p) => at >= p.start && at < p.end);
}
