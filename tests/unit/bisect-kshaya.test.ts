// Coverage for two primitives the audit found UNtested: the bisection root that
// every tithi/nakshatra/yoga/karana end-time depends on, and the kshaya-masa
// branch (a real but rare lunar-calendar case never positively asserted).
import { describe, it, expect } from 'vitest';
import { bisectAngularCrossing } from '$lib/panchanga/bisect';
import { dateToJulian } from '$lib/astro';
import { computePanchanga, type Location } from '$lib/panchanga';

const J2000 = 2451545.0;
const DELHI: Location = { name: 'Delhi', latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata' };

describe('bisectAngularCrossing (shared root of all end-times)', () => {
  it('finds a linear crossing to sub-second precision', () => {
    const rate = 12; // deg/day
    const fn = (jd: number) => 10 + rate * (jd - J2000); // 10° at J2000, reaches 22° at +1 day
    const gotJD = dateToJulian(bisectAngularCrossing(fn, J2000, 10, 22, 5));
    expect(Math.abs(gotJD - (J2000 + 1))).toBeLessThan(1e-5); // < ~1 second
  });

  it('handles a 360->0 wraparound (start 350°, target 10°)', () => {
    const rate = 12;
    const fn = (jd: number) => (350 + rate * (jd - J2000)) % 360; // wraps past 360
    // target 10 unwraps to 370 → reached at +20/12 days.
    const gotJD = dateToJulian(bisectAngularCrossing(fn, J2000, 350, 10, 5));
    expect(Math.abs(gotJD - (J2000 + 20 / rate))).toBeLessThan(1e-5);
  });

  it('expands the bracket when the crossing is just beyond maxDays', () => {
    const fn = (jd: number) => 10 + 1 * (jd - J2000); // slow: reaches 18° only at +8 days
    const gotJD = dateToJulian(bisectAngularCrossing(fn, J2000, 10, 18, 5)); // maxDays 5 → expands to 10
    expect(Math.abs(gotJD - (J2000 + 8))).toBeLessThan(1e-4);
  });
});

describe('Kshaya masa — positively asserted (1983 Pausha-Magha lost month)', () => {
  it('some day in the 1983 lost-month window has masa.isKshaya = true', () => {
    // The only kshaya masa of 1950-2100; sweep Dec 1982 → Mar 1983.
    let found = false;
    outer: for (const [y, m] of [
      [1982, 11],
      [1983, 0],
      [1983, 1],
      [1983, 2],
    ] as const) {
      for (let d = 1; d <= 28; d++) {
        if (computePanchanga(new Date(Date.UTC(y, m, d, 6)), DELHI).masa.isKshaya) {
          found = true;
          break outer;
        }
      }
    }
    expect(found).toBe(true);
  });
});
