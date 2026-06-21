// Rigorous verification of the full kundli data against Swiss Ephemeris
// (pyswisseph 2.10, Moshier theory, SIDM_LAHIRI) across 1925–2040. Swiss
// Ephemeris is the gold-standard library used by astro.com, Jagannatha Hora,
// and ProKerala, so this pins every graha — not just the lagna — to an
// independent, authoritative reference.
//
// Agreement is ≤~0.75′ everywhere. Of that, a constant ~0.39′ is the Lahiri
// AYANAMSA variant: our ayanamsa follows Drik Panchang's computational value
// (23.8635° at J2000, which keeps the panchanga's nakshatra/tithi end times
// matching Drik), while Swiss Ephemeris's SE_SIDM_LAHIRI is 0.39′ lower
// (23.857° at J2000, the value tagged "official Indian government"). The
// remaining ~0.3′ is astronomy-engine vs Moshier theory. Both are far below
// birth-time uncertainty (0.75′ ≈ 3 s of birth time). The mean nodes carry
// ONLY the 0.39′ ayanamsa offset — i.e. our mean Rahu/Ketu equals Swiss
// Ephemeris's to <0.01′ before ayanamsa.

import { describe, it, expect } from 'vitest';
import { computeGrahas, vimshottariMahadashas, grahaSiderealLongitude, type GrahaKey } from '$lib/jyotish';
import { dateToJulian } from '$lib/astro';

// [iso(UTC), sun, moon, mars, mercury, jupiter, venus, saturn, rahu, ketu]
// sidereal Lahiri longitudes, degrees. From scripts run against pyswisseph.
const SWE: [string, number, number, number, number, number, number, number, number, number][] = [
  ['1925-03-10T08:15:00Z', 326.4494, 143.4405, 28.3817, 330.928, 264.3367, 315.0744, 201.2831, 109.2034, 289.2034],
  ['1947-08-14T18:30:00Z', 117.989, 93.9835, 67.4562, 103.6743, 205.8777, 112.5612, 110.473, 35.0697, 215.0697],
  ['1965-11-20T14:30:00Z', 214.6877, 183.1753, 251.3967, 235.2295, 66.2957, 261.7376, 317.1479, 41.4626, 221.4626],
  ['1980-01-01T12:00:00Z', 256.6489, 66.1606, 140.4809, 245.1449, 136.6135, 288.4382, 153.4166, 128.2941, 308.2941],
  ['1990-08-15T05:00:00Z', 118.395, 48.93, 27.4869, 145.4459, 95.6066, 97.8426, 266.1479, 282.7535, 102.7535],
  ['2000-01-01T00:00:00Z', 256.006, 193.4402, 303.7223, 247.2586, 1.3799, 217.1082, 16.5526, 101.2139, 281.2139],
  ['2020-12-21T18:00:00Z', 246.1924, 333.5612, 359.0614, 247.1016, 276.3376, 223.4391, 276.3392, 55.2554, 235.2554],
  ['2040-06-15T06:00:00Z', 60.3405, 120.4014, 119.2553, 74.9345, 148.6121, 64.4614, 160.8821, 38.191, 218.191],
];
const KEYS: GrahaKey[] = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];
const NAK = 360 / 27;
const sep = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
};
const TOL_ARCMIN = 1.5; // measured max ≤0.75′; 2× margin (incl. the Lahiri variant)

describe('grahas vs Swiss Ephemeris (1925–2040, Lahiri)', () => {
  for (const row of SWE) {
    const jd = dateToJulian(new Date(row[0]));
    for (let i = 0; i < KEYS.length; i++) {
      const k = KEYS[i];
      it(`${row[0]} · ${k} within ${TOL_ARCMIN}′`, () => {
        const mine = grahaSiderealLongitude(k, jd, 'lahiri', 'mean');
        expect(sep(mine, row[i + 1] as number) * 60).toBeLessThan(TOL_ARCMIN);
      });
    }
  }
});

describe("Moon nakshatra index agrees with Swiss Ephemeris' Moon", () => {
  for (const row of SWE) {
    it(row[0], () => {
      const moon = computeGrahas(new Date(row[0]), 'lahiri', 'mean').find((g) => g.key === 'moon')!;
      const sweNak = Math.floor(row[2] / NAK) + 1; // row[2] = Swiss Eph Moon
      expect(moon.nakshatra).toBe(sweNak);
    });
  }
});

describe('Vimshottari dasha — derived correctly from the verified Moon', () => {
  // Canonical order from Ketu (lord of Ashwini) and the 120-year spans.
  const ORDER: GrahaKey[] = ['ketu', 'venus', 'sun', 'moon', 'mars', 'rahu', 'jupiter', 'saturn', 'mercury'];
  const YEARS: Record<string, number> = { ketu: 7, venus: 20, sun: 6, moon: 10, mars: 7, rahu: 18, jupiter: 16, saturn: 19, mercury: 17 };
  for (const row of SWE) {
    it(row[0], () => {
      const birth = new Date(row[0]);
      const moonLon = grahaSiderealLongitude('moon', dateToJulian(birth), 'lahiri', 'mean');
      const nak = Math.floor(moonLon / NAK) + 1;
      const expectedLord = ORDER[(nak - 1) % 9];
      const fraction = (moonLon % NAK) / NAK;

      const periods = vimshottariMahadashas(birth, moonLon);
      // running mahadasha is the nakshatra lord
      expect(periods[0].lord).toBe(expectedLord);
      // its start is back-dated by exactly fraction × lordYears
      const elapsedYears = (birth.getTime() - periods[0].start.getTime()) / (365.25 * 86_400_000);
      expect(elapsedYears).toBeCloseTo(fraction * YEARS[expectedLord], 2);
    });
  }
});

// True (osculating) Rahu vs Swiss Ephemeris SE_TRUE_NODE. The true node is
// the instantaneous orbital node (what Drik's kundli + most modern Vedic
// software use); it differs from the mean node by up to ±1.5°. Our osculating
// node (from the Moon's state vector) matches Swiss Ephemeris to ≤1.2′.
describe('true Rahu (osculating node) vs Swiss Ephemeris SE_TRUE_NODE', () => {
  const SWE_TRUE: [string, number][] = [
    ['1925-03-10T08:15:00Z', 110.5885],
    ['1947-08-14T18:30:00Z', 35.7426],
    ['1965-11-20T14:30:00Z', 41.2988],
    ['1980-01-01T12:00:00Z', 126.8094],
    ['1990-08-15T05:00:00Z', 283.5023],
    ['2000-01-01T00:00:00Z', 100.1256],
    ['2020-12-21T18:00:00Z', 55.7231],
    ['2040-06-15T06:00:00Z', 39.1757],
  ];
  for (const [iso, trueRahu] of SWE_TRUE) {
    it(`${iso} within 1.5′`, () => {
      const mine = grahaSiderealLongitude('rahu', dateToJulian(new Date(iso)), 'lahiri', 'true');
      expect(sep(mine, trueRahu) * 60).toBeLessThan(1.5);
    });
  }
});
