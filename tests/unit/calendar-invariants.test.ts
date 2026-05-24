// Structural invariants over a 51-year window (2000-2050).
//
// These tests do NOT rely on external reference data. They assert
// properties that must hold for ANY correct Hindu calendar
// implementation, derived from first principles:
//
//   • Makara Sankranti (sun enters Makara / Capricorn, sign 9) must
//     occur exactly once per year and always falls on Jan 14 or Jan 15
//     for the years 2000-2050 (confirmed by astronomical calculation).
//
// Scanning only a 7-day window (Jan 12-18) per year keeps the test
// fast (~1-2 s total) while covering every possible Sankranti date.

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

describe('Makara Sankranti structural invariant (2000–2050)', () => {
  it('appears exactly once and falls on Jan 14 or 15 for every year 2000-2050', () => {
    for (let year = 2000; year <= 2050; year++) {
      // 7-day window around Jan 14; civilMidnightInZone aligns to IST midnight.
      const from = new Date(Date.UTC(year, 0, 12));
      const to = new Date(Date.UTC(year, 0, 18));
      const occ = findFestivals(from, to, DELHI).filter(
        (f) => f.key === 'makara_sankranti',
      );

      expect(occ.length, `${year}: expected exactly 1 makara_sankranti`).toBe(1);

      const civil = ymd(occ[0].date); // "YYYY-MM-DD" in IST
      const day = Number(civil.slice(8, 10));
      expect(
        day === 14 || day === 15,
        `${year}: makara_sankranti on Jan ${day} (civil ${civil}), expected Jan 14 or 15`,
      ).toBe(true);
    }
  });
});
