// Independent verification of the panchanga's sunrise against Swiss Ephemeris
// (pyswisseph 2.10, upper limb + refraction) — NOT Drik. Confirms the rise/set
// model is accurate in its own right, not merely tuned to drikpanchang.com.
// Sunrise is ayanamsa-independent, so this isolates the horizon/refraction model.
import { describe, it, expect } from 'vitest';
import { computePanchanga, type Location } from '$lib/panchanga';

const CASES: [string, Location, string][] = [
  ['Delhi', { name: 'D', latitude: 28 + 38 / 60 + 8 / 3600, longitude: 77 + 13 / 60 + 28 / 3600, altitude: 216, timezone: 'Asia/Kolkata' }, '2026-06-20T23:53:39Z'],
  ['Bengaluru', { name: 'B', latitude: 12.9716, longitude: 77.5946, altitude: 920, timezone: 'Asia/Kolkata' }, '2026-06-21T00:24:48Z'],
  ['New York', { name: 'N', latitude: 40.7142, longitude: -74.0064, altitude: 10, timezone: 'America/New_York' }, '2026-06-21T09:24:46Z'],
  ['London', { name: 'L', latitude: 51.5074, longitude: -0.1278, altitude: 11, timezone: 'Europe/London' }, '2026-06-21T03:42:45Z'],
];

describe('panchanga sunrise vs Swiss Ephemeris (2026-06-21)', () => {
  for (const [name, loc, swe] of CASES) {
    it(`${name} within 30 s`, () => {
      const p = computePanchanga(new Date('2026-06-21T12:00:00Z'), loc);
      const diff = Math.abs(p.sunrise!.getTime() - new Date(swe).getTime()) / 1000;
      expect(diff).toBeLessThan(30);
    });
  }
});
