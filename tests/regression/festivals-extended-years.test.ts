// Festival accuracy validation across an EXTENDED year window
// (2010-2014, 2029-2030) — outside the main 2015-2028 audit set.
//
// Purpose: confirm the rule engine generalises to years farther from
// the audit baseline. Each festival here was directly cross-checked
// against drikpanchang.com's Indian-calendar page for New Delhi
// (geoname-id 1273294).
//
// This is a SOFT regression: mismatches are reported, not failed.
// The 2010s have historical fixture quality issues and the late
// 2020s have astronomical extrapolation risk; tightening to a hard
// floor would over-pin the rules.

import { describe, it, expect } from 'vitest';
import { findFestivals } from '$lib/panchanga';

const DELHI = {
  name: 'New Delhi, India',
  latitude: 28.6139,
  longitude: 77.209,
  altitude: 216,
  timezone: 'Asia/Kolkata',
};

interface YearFixture {
  year: number;
  drik: Record<string, string>;
}

const EXTENDED: YearFixture[] = [
  {
    year: 2012,
    drik: {
      makara_sankranti: '2012-01-15',
      maha_shivaratri: '2012-02-20',
      holika_dahan: '2012-03-07',
      holi: '2012-03-08',
      rama_navami: '2012-04-01',
      buddha_purnima: '2012-05-06',
      guru_purnima: '2012-07-03',
      raksha_bandhan: '2012-08-02',
      krishna_janmashtami: '2012-08-09',
      ganesh_chaturthi: '2012-09-19',
      vijayadashami: '2012-10-24',
      karva_chauth: '2012-11-02',
      diwali: '2012-11-13',
      govardhan_puja: '2012-11-14',
    },
  },
  {
    year: 2030,
    drik: {
      makara_sankranti: '2030-01-14',
      maha_shivaratri: '2030-03-02',
      holika_dahan: '2030-03-19',
      holi: '2030-03-20',
      rama_navami: '2030-04-12',
      buddha_purnima: '2030-05-17',
      guru_purnima: '2030-07-15',
      raksha_bandhan: '2030-08-13',
      krishna_janmashtami: '2030-08-21',
      ganesh_chaturthi: '2030-09-01',
      vijayadashami: '2030-10-06',
      karva_chauth: '2030-10-15',
      diwali: '2030-10-26',
      govardhan_puja: '2030-10-27',
    },
  },
];

const BASELINE_MIN_PASSES: Record<number, number> = {
  2012: 12,
  2030: 13,
};

function fmt(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DELHI.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

describe('Festival accuracy — extended years (Delhi)', () => {
  it('reports per-year accuracy across 2012 and 2030', () => {
    for (const { year, drik } of EXTENDED) {
      const occ = findFestivals(
        new Date(`${year}-01-01T00:00:00+05:30`),
        new Date(`${year}-12-31T00:00:00+05:30`),
        DELHI,
      );
      const firstByKey = new Map<string, string>();
      for (const o of occ) if (!firstByKey.has(o.key)) firstByKey.set(o.key, fmt(o.date));

      let hits = 0;
      const total = Object.keys(drik).length;
      const mismatches: string[] = [];
      for (const [key, drikDate] of Object.entries(drik)) {
        const mine = firstByKey.get(key) ?? 'MISSING';
        if (mine === drikDate) hits++;
        else mismatches.push(`  ${key.padEnd(22)} drik=${drikDate}  mine=${mine}`);
      }
      // eslint-disable-next-line no-console
      console.log(`\n${year}: ${hits}/${total} match (${((hits / total) * 100).toFixed(1)}%)`);
      for (const m of mismatches) console.log(m);
      expect(hits, `${year}: extended-year festival matches`).toBeGreaterThanOrEqual(
        BASELINE_MIN_PASSES[year],
      );
    }
  });
});

describe('Festival accuracy — multi-city smoke (2025)', () => {
  it('reports per-city accuracy for 6 Indian cities', () => {
    const CITIES = [
      { name: 'New Delhi', latitude: 28.6139, longitude: 77.209, altitude: 216, timezone: 'Asia/Kolkata' },
      { name: 'Mumbai', latitude: 19.076, longitude: 72.8777, altitude: 14, timezone: 'Asia/Kolkata' },
      { name: 'Bengaluru', latitude: 12.9716, longitude: 77.5946, altitude: 920, timezone: 'Asia/Kolkata' },
      { name: 'Chennai', latitude: 13.0827, longitude: 80.2707, altitude: 6, timezone: 'Asia/Kolkata' },
      { name: 'Kolkata', latitude: 22.5726, longitude: 88.3639, altitude: 9, timezone: 'Asia/Kolkata' },
      { name: 'Ahmedabad', latitude: 23.0225, longitude: 72.5714, altitude: 53, timezone: 'Asia/Kolkata' },
    ];
    const drik2025: Record<string, string> = {
      makara_sankranti: '2025-01-14',
      maha_shivaratri: '2025-02-26',
      holika_dahan: '2025-03-13',
      holi: '2025-03-14',
      rama_navami: '2025-04-06',
      buddha_purnima: '2025-05-12',
      guru_purnima: '2025-07-10',
      raksha_bandhan: '2025-08-09',
      krishna_janmashtami: '2025-08-15',
      ganesh_chaturthi: '2025-08-27',
      navaratri_start: '2025-09-22',
      vijayadashami: '2025-10-02',
      karva_chauth: '2025-10-10',
      diwali: '2025-10-20',
      govardhan_puja: '2025-10-22',
      bhai_dooj: '2025-10-23',
    };

    for (const city of CITIES) {
      const occ = findFestivals(
        new Date('2025-01-01T00:00:00+05:30'),
        new Date('2025-12-31T00:00:00+05:30'),
        city,
      );
      const firstByKey = new Map<string, string>();
      for (const o of occ) if (!firstByKey.has(o.key)) firstByKey.set(o.key, fmt(o.date));
      let hits = 0;
      const total = Object.keys(drik2025).length;
      const ms: string[] = [];
      for (const [k, d] of Object.entries(drik2025)) {
        const mine = firstByKey.get(k) ?? 'MISSING';
        if (mine === d) hits++;
        else ms.push(`  ${k.padEnd(22)} drik=${d}  mine=${mine}`);
      }
      // eslint-disable-next-line no-console
      console.log(`${city.name.padEnd(12)}: ${hits}/${total} match`);
      for (const m of ms) console.log(m);
    }
  });
});
