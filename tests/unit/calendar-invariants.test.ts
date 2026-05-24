// Structural invariants over a 100-year window (1976-2075).
//
// These tests do NOT rely on external reference data. They assert
// properties that must hold for ANY correct Hindu calendar
// implementation, derived from first principles:
//
//   • Makara Sankranti (sun enters Makara / Capricorn, sign 9) must
//     occur exactly once per year. The exact civil date (Jan 14 or
//     Jan 15 in IST) is determined by when the tropical solar year
//     aligns with the sidereal zodiac boundary, factoring in the
//     current ayanamsa. Due to slow precession this date is drifting
//     gradually later: Jan 15 events become more frequent post-2040.
//
// The JAN_15_YEARS set below was derived by running findFestivals
// against the Jan 12-18 window for every year 1976-2075 and recording
// which civil dates (IST) the engine computes. All other years in the
// range are Jan 14. The set is hardcoded so any change to the
// sankranti computation immediately breaks this test.
//
// Scanning only a 7-day window (Jan 12-18) per year keeps the test
// fast (~2 s total) while covering every possible Sankranti date.

import { describe, it, expect } from 'vitest';
import { findFestivals } from '$lib/panchanga';

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

// Years in 1976-2075 where Makara Sankranti falls on Jan 15 in IST.
// All other years in the range fall on Jan 14.
// Derived from astronomy-engine + current Lahiri ayanamsa; matches
// published Drik dates for all Drik-verified fixture years.
const JAN_15_YEARS = new Set([
  1976, 1980, 1984, 1988, 1992, 1996, 2000, 2004, 2007, 2008, 2011, 2012, 2015, 2016, 2019, 2020,
  2023, 2024, 2027, 2028, 2031, 2032, 2035, 2036, 2039, 2040, 2043, 2044, 2046, 2047, 2048, 2050,
  2051, 2052, 2054, 2055, 2056, 2058, 2059, 2060, 2062, 2063, 2064, 2066, 2067, 2068, 2070, 2071,
  2072, 2074, 2075,
]);

describe('Makara Sankranti structural invariant (1976–2075)', () => {
  it('appears exactly once and falls on the expected Jan 14/15 date for every year 1976-2075', () => {
    for (let year = 1976; year <= 2075; year++) {
      // 7-day window around Jan 14; civilMidnightInZone aligns to IST midnight.
      const from = new Date(Date.UTC(year, 0, 12));
      const to = new Date(Date.UTC(year, 0, 18));
      const occ = findFestivals(from, to, DELHI).filter((f) => f.key === 'makara_sankranti');

      expect(occ.length, `${year}: expected exactly 1 makara_sankranti`).toBe(1);

      const civil = ymd(occ[0].date); // "YYYY-MM-DD" in IST
      const day = Number(civil.slice(8, 10));
      const expectedDay = JAN_15_YEARS.has(year) ? 15 : 14;
      expect(
        day,
        `${year}: makara_sankranti on Jan ${day} (civil ${civil}), expected Jan ${expectedDay}`,
      ).toBe(expectedDay);
    }
  });
});
