// Lagna (ascendant) — the rising sidereal degree of the ecliptic at the
// birth instant and place. This is the one piece of astronomy the
// panchanga layer didn't already need.
//
//   RAMC = local sidereal time (deg) = GAST·15 + longitudeEast·k
//   ε    = obliquity of the ecliptic
//   λ_asc(tropical) = atan2( cos RAMC, −(sin RAMC·cos ε + tan φ·sin ε) )
//   λ_asc(sidereal) = λ_asc(tropical) − ayanamsa
//
// The atan2 form already selects the rising (eastern) intersection.
//
// ── Two ascendant conventions (the `method` argument) ──
// Verified against Drik Panchang's sidereal positions page across both
// hemispheres (Delhi +77°, Kolkata +88°, New York −74°) and the full day.
// All nine grahas match Drik to ≤0.04′. The ascendant has two conventions:
//
//   'swiss' — local sidereal time = GST·15 + λ (longitude added directly).
//     This is the geometrically rigorous rising point — what Swiss
//     Ephemeris's swe_houses, astro.com, Jagannatha Hora, and
//     astronomy-engine's own (validated) horizon transform all compute.
//     The accurate value, and our default.
//
//   'drik'  — local sidereal time = GST·15 + λ·SIDEREAL_RATIO. Drik forms
//     LST by treating the longitude like elapsed mean time and applying
//     the sidereal acceleration. This reproduces Drik Panchang's lagna to
//     ≤0.2′ at every test point. It differs from 'swiss' by a longitude-
//     proportional term — up to ~13′ at Indian longitudes (≈0.9 min of
//     birth time, inside birth-time uncertainty), flipping sign in the
//     western hemisphere.
//
// Both are proven in tests/regression/kundli-vs-drik.test.ts.

import { dateToJulian, gastHoursAtJD, ayanamsa, JD_J2000 } from '$lib/astro';
import type { AyanamsaSystem, Location } from '$lib/panchanga/types';
import type { Lagna, LagnaMethod } from './types';

const DEG = Math.PI / 180;
const JULIAN_CENTURY_DAYS = 36525;
// Ratio of the mean sidereal day to the mean solar day (IAU).
const SIDEREAL_RATIO = 1.002737909;

function norm360(d: number): number {
  return ((d % 360) + 360) % 360;
}

// Mean obliquity of the ecliptic (IAU 1980), degrees. Nutation in
// obliquity (< 9″) is far below birth-time uncertainty, so mean is fine.
function meanObliquityDeg(jd: number): number {
  const T = (jd - JD_J2000) / JULIAN_CENTURY_DAYS;
  return 23.439291111 - 0.0130041667 * T - 1.638889e-7 * T * T + 5.036111e-7 * T * T * T;
}

export function computeLagna(
  instant: Date,
  location: Location,
  system: AyanamsaSystem,
  method: LagnaMethod = 'swiss',
): Lagna {
  const jd = dateToJulian(instant);
  const lonFactor = method === 'drik' ? SIDEREAL_RATIO : 1;
  const ramc = norm360(gastHoursAtJD(jd) * 15 + location.longitude * lonFactor) * DEG;
  const eps = meanObliquityDeg(jd) * DEG;
  const phi = location.latitude * DEG;

  const y = Math.cos(ramc);
  const x = -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps));
  const tropical = norm360(Math.atan2(y, x) / DEG);
  const sidereal = norm360(tropical - ayanamsa(jd, system));

  const rashi = Math.floor(sidereal / 30);
  return { longitude: sidereal, rashi, degInRashi: sidereal - rashi * 30 };
}
