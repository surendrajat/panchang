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
// ── Why the longitude carries the sidereal/solar factor `k` ──
// We verified this engine against Drik Panchang's sidereal planetary-
// positions page across both hemispheres (Delhi +77°, Kolkata +88°,
// New York −74°) and across the full day. All nine grahas match Drik to
// ≤0.04′. The ascendant, however, differs from the *pure-geometry*
// ascendant (k = 1 — what Swiss Ephemeris's swe_houses and
// astronomy-engine's horizon transform compute: armc = GST·15 + λ) by a
// term that is exactly proportional to longitude: Drik forms local
// sidereal time as GST + λ·(sidereal/solar ratio), i.e. it treats the
// longitude like elapsed mean time and applies the sidereal acceleration.
// Adopting `k = SIDEREAL_RATIO` reproduces Drik to ≤0.2′ at every test
// point; with k = 1 the gap grows to ~13′ at Indian longitudes and flips
// sign in the western hemisphere.
//
// We deliberately MATCH DRIK here so the whole kundli is consistent with
// the rest of this Drik-calibrated app (festivals, ayanamsa) and with the
// source users check against. The pure-geometry value (k = 1) differs by
// at most ~13′ (≈0.9 min of birth time) — well inside birth-time
// uncertainty — so nothing real is lost by matching Drik. Proven in
// tests/regression/kundli-vs-drik.test.ts.

import { dateToJulian, gastHoursAtJD, ayanamsa, JD_J2000 } from '$lib/astro';
import type { AyanamsaSystem, Location } from '$lib/panchanga/types';
import type { Lagna } from './types';

const DEG = Math.PI / 180;
const JULIAN_CENTURY_DAYS = 36525;
// Ratio of the mean sidereal day to the mean solar day (IAU). Drik applies
// this to the observer's longitude when forming local sidereal time.
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
): Lagna {
  const jd = dateToJulian(instant);
  const ramc = norm360(gastHoursAtJD(jd) * 15 + location.longitude * SIDEREAL_RATIO) * DEG;
  const eps = meanObliquityDeg(jd) * DEG;
  const phi = location.latitude * DEG;

  const y = Math.cos(ramc);
  const x = -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps));
  const tropical = norm360(Math.atan2(y, x) / DEG);
  const sidereal = norm360(tropical - ayanamsa(jd, system));

  const rashi = Math.floor(sidereal / 30);
  return { longitude: sidereal, rashi, degInRashi: sidereal - rashi * 30 };
}
