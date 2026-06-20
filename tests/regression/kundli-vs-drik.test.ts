// Regression: the kundli engine vs Drik Panchang's sidereal planetary-
// positions page (Lahiri/Chitra Paksha). Every number below is verbatim
// from drikpanchang.com/planet/position/planetary-positions-sidereal.html
// for the stated instant + city (Drik's own displayed coordinates).
//
// Grahas are pure ephemeris + ayanamsa and match Drik to arcseconds. The
// lagna matches Drik's local-sidereal-time convention (see lagna.ts) across
// both hemispheres and the full day. These are hard, data-backed assertions
// — do not loosen them to paper over a future formula change.

import { describe, it, expect } from 'vitest';
import { computeBirthChart, computeLagna, grahaSiderealLongitude, type GrahaKey } from '$lib/jyotish';
import { dateToJulian } from '$lib/astro';
import type { Location } from '$lib/panchanga';

// [sign 0..11, deg, min, sec] → absolute sidereal degrees.
const abs = (s: number, d: number, m: number, sec: number) => s * 30 + d + m / 60 + sec / 3600;
function sep(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360) + 360) % 360;
  return Math.min(d, 360 - d);
}
function loc(name: string, lat: [number, number, number], lon: [number, number, number], tz = 'Asia/Kolkata'): Location {
  return {
    name,
    latitude: lat[0] + lat[1] / 60 + lat[2] / 3600,
    longitude: lon[0] + lon[1] / 60 + lon[2] / 3600,
    altitude: 0,
    timezone: tz,
  };
}

const PLANET_TOL_ARCMIN = 0.2; // grahas matched to ≤0.04′; 5× margin
const LAGNA_TOL_ARCMIN = 1.5; // lagna matched to ≤0.22′; generous margin

describe('grahas vs Drik — New Delhi 1990-08-15 21:06:58 IST', () => {
  const DELHI = loc('New Delhi', [28, 38, 8], [77, 13, 28]);
  const inst = new Date('1990-08-15T21:06:58+05:30');
  const jd = dateToJulian(inst);
  // Drik sidereal positions, verbatim.
  const DRIK: Record<GrahaKey, number> = {
    sun: abs(3, 28, 49, 2),
    moon: abs(1, 25, 14, 7),
    mars: abs(0, 27, 44, 20),
    mercury: abs(4, 25, 46, 52),
    jupiter: abs(3, 5, 41, 56),
    venus: abs(3, 8, 22, 48),
    saturn: abs(8, 26, 7, 13),
    rahu: abs(9, 12, 43, 24),
    ketu: abs(3, 12, 43, 24),
  };
  for (const key of Object.keys(DRIK) as GrahaKey[]) {
    it(`${key} within ${PLANET_TOL_ARCMIN}′`, () => {
      const mine = grahaSiderealLongitude(key, jd, 'lahiri', 'mean');
      expect(sep(mine, DRIK[key]) * 60).toBeLessThan(PLANET_TOL_ARCMIN);
    });
  }

  it('Saturn, Rahu, Ketu are retrograde; Sun & Moon are not', () => {
    const g = computeBirthChart(inst, DELHI, true).grahas;
    const r = (k: GrahaKey) => g.find((x) => x.key === k)!.retrograde;
    expect([r('saturn'), r('rahu'), r('ketu')]).toEqual([true, true, true]);
    expect([r('sun'), r('moon')]).toEqual([false, false]);
  });
});

describe('lagna vs Drik — both hemispheres, full day', () => {
  // [label, location, iso instant, drik lagna absolute deg]
  const CASES: [string, Location, string, number][] = [
    ['Delhi 00:30', loc('Delhi', [28, 38, 8], [77, 13, 28]), '1990-08-15T00:30:00+05:30', abs(1, 15, 58, 49.79)],
    ['Delhi 06:30', loc('Delhi', [28, 38, 8], [77, 13, 28]), '1990-08-15T06:30:00+05:30', abs(4, 6, 10, 18)],
    ['Delhi 12:00', loc('Delhi', [28, 38, 8], [77, 13, 28]), '1990-08-15T12:00:00+05:30', abs(6, 18, 21, 42.46)],
    ['Delhi 17:00', loc('Delhi', [28, 38, 8], [77, 13, 28]), '1990-08-15T17:00:00+05:30', abs(8, 25, 26, 32)],
    ['Delhi 21:06', loc('Delhi', [28, 38, 8], [77, 13, 28]), '1990-08-15T21:06:58+05:30', abs(11, 14, 2, 35)],
    ['Delhi 1975', loc('Delhi', [28, 38, 8], [77, 13, 28]), '1975-08-15T21:11:34+05:30', abs(11, 15, 22, 34)],
    ['Delhi 2026', loc('Delhi', [28, 38, 8], [77, 13, 28]), '2026-08-15T21:11:39+05:30', abs(11, 15, 36, 13)],
    ['Kolkata 06:30', loc('Kolkata', [22, 33, 45], [88, 21, 46]), '1990-08-15T06:30:00+05:30', abs(4, 14, 55, 8)],
    ['New York 06:30', loc('New York', [40, 42, 51], [-74, 0, 21], 'America/New_York'), '1990-08-15T06:30:00-04:00', abs(4, 2, 13, 4)],
  ];
  for (const [label, location, iso, drik] of CASES) {
    it(`${label} 'drik' method within ${LAGNA_TOL_ARCMIN}′`, () => {
      const mine = computeLagna(new Date(iso), location, 'lahiri', 'drik').longitude;
      expect(sep(mine, drik) * 60).toBeLessThan(LAGNA_TOL_ARCMIN);
    });
  }

  it("'swiss' (accurate) method differs from Drik by a longitude-proportional term", () => {
    // The geometric ascendant (Swiss Ephemeris convention) is the default;
    // it should sit a few arcminutes off Drik at Indian longitudes — and the
    // gap must never exceed ~15′ (the documented ≤13′ bound + margin).
    const [, location, iso, drik] = CASES[1]; // Delhi 06:30
    const swiss = computeLagna(new Date(iso), location, 'lahiri', 'swiss').longitude;
    const gap = sep(swiss, drik) * 60;
    expect(gap).toBeGreaterThan(2); // genuinely different from Drik
    expect(gap).toBeLessThan(15); // but small — same sign except near a cusp
  });
});

// The 'swiss' (default, accurate) lagna is the true rising point. These
// expected values were produced by running Swiss Ephemeris itself
// (pyswisseph 2.10, swe.houses_ex(jd_ut, lat, lon, FLG_SIDEREAL) with
// SIDM_LAHIRI) — the same library astro.com and Jagannatha Hora use. This
// pins our default method to the gold-standard ephemeris; Drik (above)
// deviates from these by the documented longitude term.
describe("lagna 'swiss' method vs Swiss Ephemeris (pyswisseph, run directly)", () => {
  const SWISS: [string, Location, string, number][] = [
    ['Delhi 00:30', loc('Delhi', [28, 38, 8], [77, 13, 28]), '1990-08-15T00:30:00+05:30', 45.7698],
    ['Delhi 06:30', loc('Delhi', [28, 38, 8], [77, 13, 28]), '1990-08-15T06:30:00+05:30', 125.995],
    ['Delhi 12:00', loc('Delhi', [28, 38, 8], [77, 13, 28]), '1990-08-15T12:00:00+05:30', 198.1867],
    ['Delhi 17:00', loc('Delhi', [28, 38, 8], [77, 13, 28]), '1990-08-15T17:00:00+05:30', 265.2313],
    ['Delhi 21:06', loc('Delhi', [28, 38, 8], [77, 13, 28]), '1990-08-15T21:06:58+05:30', 343.7568],
    ['Kolkata 06:30', loc('Kolkata', [22, 33, 45], [88, 21, 46]), '1990-08-15T06:30:00+05:30', 134.7041],
    ['New York 06:30', loc('New York', [40, 42, 51], [-74, 0, 21], 'America/New_York'), '1990-08-15T06:30:00-04:00', 122.3826],
  ];
  for (const [label, location, iso, swissEph] of SWISS) {
    it(`${label} matches Swiss Ephemeris within 1′`, () => {
      const mine = computeLagna(new Date(iso), location, 'lahiri', 'swiss').longitude;
      expect(sep(mine, swissEph) * 60).toBeLessThan(1);
    });
  }
});
