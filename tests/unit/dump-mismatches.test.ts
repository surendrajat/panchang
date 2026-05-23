// Diagnostic — print only the year/festival pairs where our computed
// date diverges from the expected fixture. Used to study remaining gaps.

import { describe, it } from 'vitest';
import { findFestivals } from '$lib/panchanga';
import { FESTIVAL_FIXTURES } from '../fixtures/festivals-multi-year';

const DELHI = {
  name: 'New Delhi, India',
  latitude: 28.6139,
  longitude: 77.209,
  altitude: 216,
  timezone: 'Asia/Kolkata',
};

function ymd(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: DELHI.timezone }).format(d);
}

describe('mismatches dump', () => {
  it('list all divergences', () => {
    const years = new Set<number>();
    for (const f of FESTIVAL_FIXTURES) for (const y of Object.keys(f.expected)) years.add(Number(y));
    const computed = new Map<number, Map<string, string>>();
    for (const year of Array.from(years).sort()) {
      const occ = findFestivals(
        new Date(Date.UTC(year, 0, 1)),
        new Date(Date.UTC(year, 11, 31)),
        DELHI,
        { monthSystem: 'purnimanta' },
      );
      const m = new Map<string, string>();
      for (const o of occ) if (!m.has(o.key)) m.set(o.key, ymd(o.date));
      computed.set(year, m);
    }
    for (const f of FESTIVAL_FIXTURES) {
      for (const [yearStr, expected] of Object.entries(f.expected)) {
        const year = Number(yearStr);
        const actual = computed.get(year)?.get(f.key) ?? 'MISSING';
        if (actual !== expected) {
          // eslint-disable-next-line no-console
          console.log(`${f.key.padEnd(22)} ${year}  expected=${expected}  mine=${actual}`);
        }
      }
    }
  });
});
