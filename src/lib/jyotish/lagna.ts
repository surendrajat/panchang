// Lagna (ascendant) — the rising sidereal degree of the ecliptic at the
// birth instant and place. This is the one piece of astronomy the
// panchanga layer didn't already need.
//
//   RAMC = local sidereal time (deg) = GAST·15 + longitudeEast
//   ε    = obliquity of the ecliptic
//   λ_asc(tropical) = atan2( cos RAMC, −(sin RAMC·cos ε + tan φ·sin ε) )
//   λ_asc(sidereal) = λ_asc(tropical) − ayanamsa
//
// The atan2 form already selects the rising (eastern) intersection.
//
// ── Why longitude is added directly (and a note on Drik Panchang) ──
// LST = GST + longitude is the standard, geometrically rigorous formula —
// the rising point actually on the eastern horizon. It is what:
//   • the Government of India standard uses (Indian Astronomical Ephemeris:
//     LST = GMST + longitude/15), with the Lahiri/Chitrapaksha ayanamsa,
//   • Swiss Ephemeris (swe_houses), astro.com, and Jagannatha Hora compute,
//   • astronomy-engine's own validated horizon transform produces, and
//   • ProKerala returns (verified live: Leo 5°59′ for Delhi 1990-08-15 06:30).
//
// drikpanchang.com is the OUTLIER: it forms LST as GST + longitude·(sidereal/
// solar ratio) — applying the sidereal acceleration to the longitude (the old
// "Local Mean Time" table method). That shifts its lagna by a longitude-
// proportional term, up to ~13′ at Indian longitudes (it flips sign in the
// western hemisphere). We deliberately do NOT replicate that deviation; we
// match the Government of India / Swiss Ephemeris standard. The grahas are
// unaffected — they match every source (incl. Drik) to ≤0.04′.
// Proven in tests/regression/kundli-vs-drik.test.ts (run via pyswisseph).

import { dateToJulian, gastHoursAtJD, ayanamsa, JD_J2000 } from '$lib/astro';
import type { AyanamsaSystem, Location } from '$lib/panchanga/types';
import type { Lagna } from './types';

const DEG = Math.PI / 180;
const JULIAN_CENTURY_DAYS = 36525;

function norm360(d: number): number {
  return ((d % 360) + 360) % 360;
}

// Mean obliquity of the ecliptic (IAU 1980), degrees. Nutation in
// obliquity (< 9″) is far below birth-time uncertainty, so mean is fine.
function meanObliquityDeg(jd: number): number {
  const T = (jd - JD_J2000) / JULIAN_CENTURY_DAYS;
  return 23.439291111 - 0.0130041667 * T - 1.638889e-7 * T * T + 5.036111e-7 * T * T * T;
}

export function computeLagna(instant: Date, location: Location, system: AyanamsaSystem): Lagna {
  const jd = dateToJulian(instant);
  const ramc = norm360(gastHoursAtJD(jd) * 15 + location.longitude) * DEG;
  const eps = meanObliquityDeg(jd) * DEG;
  const phi = location.latitude * DEG;

  const y = Math.cos(ramc);
  const x = -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps));
  const tropical = norm360(Math.atan2(y, x) / DEG);
  const sidereal = norm360(tropical - ayanamsa(jd, system));

  const rashi = Math.floor(sidereal / 30);
  return { longitude: sidereal, rashi, degInRashi: sidereal - rashi * 30 };
}
