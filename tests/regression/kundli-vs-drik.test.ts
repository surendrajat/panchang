// Regression: how the kundli engine RELATES to Drik Panchang. Every Drik
// number below is verbatim from drikpanchang.com (its sidereal planetary-
// positions page / lagna), captured for the stated instant + city.
//
// We deliberately differ from Drik in two bounded, fully-explained ways — and
// this file locks BOTH to exact magnitudes so any *other* drift is caught:
//   1. Grahas: we use Swiss-Eph's SE_SIDM_LAHIRI ayanamsa, ~0.38′ below Drik's
//      Lahiri variant, so each Drik graha is ~0.38′ lower in sidereal longitude
//      than ours — a clean constant, nothing else (astro/ayanamsa.ts).
//   2. Lagna: Drik applies the sidereal/solar factor to longitude (the "Local
//      Mean Time" method); we use the geometric rising point (lagna.ts). The
//      gap is ∝ longitude and sign-flips across hemispheres.
// Accuracy itself is pinned to the gold standard in kundli-vs-swisseph.test.ts;
// here we pin the *relationship* to Drik. Do not loosen these bands.

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
// Signed shortest difference a − b in degrees, range (−180, 180].
function signedSep(a: number, b: number): number {
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}
// DMS → decimal degrees. The degree's sign applies to the WHOLE value, so
// [-74, 0, 21] is −74°0′21″ = −74.00583 (not −74 + 21/3600 = −73.994). This
// matters for western/southern coordinates — getting it wrong shifts the lagna.
function dms([d, m, s]: [number, number, number]): number {
  return (d < 0 ? -1 : 1) * (Math.abs(d) + m / 60 + s / 3600);
}
function loc(name: string, lat: [number, number, number], lon: [number, number, number], tz = 'Asia/Kolkata'): Location {
  return { name, latitude: dms(lat), longitude: dms(lon), altitude: 0, timezone: tz };
}

// The only systematic difference from Drik's published grahas is the ayanamsa
// offset: Drik's Lahiri is ~0.38′ higher ⟹ its sidereal longitudes are ~0.38′
// LOWER than ours. So (ours − Drik) ≈ +0.38′ for every graha. The band [0.25,
// 0.50] is 0.38′ ± the ≤0.04′ theory residual + margin — tight enough that any
// non-ayanamsa drift (a broken graha, wrong node) falls outside it.
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
    it(`${key}: ours − Drik = +0.38′ ayanamsa offset only`, () => {
      const mine = grahaSiderealLongitude(key, jd, 'lahiri', 'mean');
      const gap = signedSep(mine, DRIK[key]) * 60; // ours − Drik, arcmin
      expect(gap).toBeGreaterThan(0.25);
      expect(gap).toBeLessThan(0.5);
    });
  }

  it('Saturn, Rahu, Ketu are retrograde; Sun & Moon are not', () => {
    const g = computeBirthChart(inst, DELHI, true).grahas;
    const r = (k: GrahaKey) => g.find((x) => x.key === k)!.retrograde;
    expect([r('saturn'), r('rahu'), r('ketu')]).toEqual([true, true, true]);
    expect([r('sun'), r('moon')]).toEqual([false, false]);
  });
});

// We deliberately do NOT replicate drikpanchang.com's lagna: it applies the
// sidereal/solar factor to longitude (the "Local Mean Time" method), which
// deviates from the Government of India / Swiss-Ephemeris standard that our
// engine (and ProKerala, astro.com, Jagannatha Hora) use. These cases keep
// Drik's published lagna to prove the deviation is exactly that: small and
// PROPORTIONAL to longitude — it grows with |longitude| and flips sign in the
// western hemisphere. Drik is the outlier; our value is the standard one.
describe('lagna deviates from drikpanchang.com by the bounded longitude term', () => {
  // [label, location, iso, drikAbsDeg, expected signed gap (accurate − drik) ′]
  const CASES: [string, Location, string, number, number][] = [
    ['Delhi +77°E', loc('Delhi', [28, 38, 8], [77, 13, 28]), '1990-08-15T06:30:00+05:30', abs(4, 6, 10, 18), -11],
    ['Kolkata +88°E', loc('Kolkata', [22, 33, 45], [88, 21, 46]), '1990-08-15T06:30:00+05:30', abs(4, 14, 55, 8), -13],
    ['New York −74°W', loc('New York', [40, 42, 51], [-74, 0, 21], 'America/New_York'), '1990-08-15T06:30:00-04:00', abs(4, 2, 13, 4), +10],
  ];
  for (const [label, location, iso, drik, expectGap] of CASES) {
    it(`${label}: accurate − Drik ≈ ${expectGap}′ (∝ longitude, sign-flips W)`, () => {
      const mine = computeLagna(new Date(iso), location, 'lahiri').longitude;
      const gap = signedSep(mine, drik) * 60;
      expect(Math.sign(gap)).toBe(Math.sign(expectGap)); // hemisphere sign
      expect(Math.abs(gap - expectGap)).toBeLessThan(3); // matches the documented deviation
    });
  }
});

// The 'swiss' (default, accurate) lagna is the true rising point. These
// expected values were produced by running Swiss Ephemeris itself
// (pyswisseph 2.10, swe.houses_ex(jd_ut, lat, lon, FLG_SIDEREAL) with
// SIDM_LAHIRI) — the same library astro.com and Jagannatha Hora use. This
// pins our default method to the gold-standard ephemeris; Drik (above)
// deviates from these by the documented longitude term.
//
// Cross-checked live, at the degree level, against ProKerala (a major Vedic
// site) for Delhi 1990-08-15 06:30 IST: ProKerala gives Ascendant Leo 5°59′,
// matching this 'swiss' value (Leo 6°00′) to ~1′ — while Drik shows Leo 6°10′.
// i.e. ProKerala + Swiss Ephemeris + this engine agree; Drik is the outlier.
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
    it(`${label} matches Swiss Ephemeris within 0.3′`, () => {
      const mine = computeLagna(new Date(iso), location, 'lahiri').longitude;
      // ~0.24′ everywhere — the astronomy-engine vs Swiss-Eph sidereal-time
      // difference (≈1 s of birth time), the irreducible floor for the lagna.
      expect(sep(mine, swissEph) * 60).toBeLessThan(0.3);
    });
  }
});
