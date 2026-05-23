// Ayanamsa — the angular offset between the tropical zodiac (used by
// astronomy-engine, which gives apparent ecliptic-of-date longitudes)
// and the sidereal zodiac used by Hindu astronomy.
//
// Lahiri is the reference for the Indian Astronomical Ephemeris (IAE)
// and what Drik Panchang publishes against. Our formula uses the IAU
// 2006 general precession polynomial in time T (Julian centuries from
// J2000) — same family Swiss Ephemeris uses for its Lahiri (SE_SIDM_
// LAHIRI). The linear term carries the ~50.29"/year rate; the
// quadratic term contributes ~1″ at ±100 years from J2000 (well
// inside the ±2-minute tithi end-time tolerance from
// ARCHITECTURE.md §12, but worth including so we don't compound
// drift across long-range queries).
//
// References:
//   - Indian Astronomical Ephemeris (Positional Astronomy Centre, Kolkata)
//   - Capitaine, Wallace & Chapront (2003); IAU 2006 precession
//   - Swiss Ephemeris swephlib.c: swi_get_ayanamsa()
//   - Drik Panchang methodology notes (Karthik Raman)

import { JD_J2000 } from './julian';
import type { AyanamsaSystem } from '$lib/panchanga/types';

const SECONDS_PER_DEGREE = 3600;
const JULIAN_CENTURY_DAYS = 36525;

// Reference values: ayanamsa in degrees at J2000.0 (JD 2451545.0)
// plus per-system precession coefficients in arcseconds per Julian
// century (T) and arcseconds per T² for the second-order correction.
//
// The Lahiri J2000 anchor (23.8635°) is back-derived from Drik
// Panchang's computational ayanamsa values read from their 'Other
// Calendars and Epoch' section:
//   2024-10-31 → 24.210700°  (JD 2460614.5)  ⟹ J2000 base 23.8633°
//   2025-01-01 → 24.213073°  (JD 2460676.5)  ⟹ J2000 base 23.8636°
// Mean: 23.8635°. These are the values Drik uses internally (Swiss
// Ephemeris SE_SIDM_LAHIRI). The previous value (23.8267°) had been
// back-derived from a *different* Drik page section (ayanamsa display
// text) which is 2.2 arcminutes lower than their computational value,
// causing nakshatra/yoga end times to be ~4–7 min early vs Drik.
// KP shifts Lahiri by 6′ (Krishnamurti); Raman and Yukteshwar use
// independent reference values.
interface AyanamsaCoeffs {
  baseDegreesAtJ2000: number;
  // Arcseconds per Julian century (T) — the leading-order precession.
  precessionArcsecPerCenturyT: number;
  // Arcseconds per T² — second-order; tiny but kept for accuracy.
  // IAU 2006 general precession in longitude: 1.1054348 "/T² (Capitaine
  // et al. 2003). Set to 0 for systems whose rate is treated as
  // strictly linear (Yukteshwar, Raman) — we don't have the polynomial
  // form for those.
  precessionArcsecPerCenturyTSq: number;
}

const LAHIRI_J2000_DEG = 23.8635;
const IAU_PRECESSION_T = 5028.796195; // arcsec/century
const IAU_PRECESSION_T_SQ = 1.1054348; // arcsec/century²

const COEFFS: Record<AyanamsaSystem, AyanamsaCoeffs> = {
  lahiri: {
    baseDegreesAtJ2000: LAHIRI_J2000_DEG,
    precessionArcsecPerCenturyT: IAU_PRECESSION_T,
    precessionArcsecPerCenturyTSq: IAU_PRECESSION_T_SQ,
  },
  kp: {
    baseDegreesAtJ2000: LAHIRI_J2000_DEG - 6 / 60, // Lahiri minus 6 arcminutes
    precessionArcsecPerCenturyT: IAU_PRECESSION_T,
    precessionArcsecPerCenturyTSq: IAU_PRECESSION_T_SQ,
  },
  raman: {
    baseDegreesAtJ2000: 22.4602,
    precessionArcsecPerCenturyT: IAU_PRECESSION_T,
    precessionArcsecPerCenturyTSq: IAU_PRECESSION_T_SQ,
  },
  yukteshwar: {
    // Yukteshwar's rate (54"/year ≈ 5400"/century) was his original
    // proposal; modern Drik treatments don't add a quadratic term.
    baseDegreesAtJ2000: 22.46389,
    precessionArcsecPerCenturyT: 5400,
    precessionArcsecPerCenturyTSq: 0,
  },
  true_chitra: {
    // True Chitra-paksha: ayanamsa such that ecliptic longitude of
    // Spica (Chitra) is exactly 180° sidereal. We approximate by
    // Lahiri with a small offset for now; a future revision can
    // compute Spica's tropical longitude directly via the star
    // catalog.
    baseDegreesAtJ2000: 23.8625,
    precessionArcsecPerCenturyT: IAU_PRECESSION_T,
    precessionArcsecPerCenturyTSq: IAU_PRECESSION_T_SQ,
  },
};

export function ayanamsa(jd: number, system: AyanamsaSystem = 'lahiri'): number {
  const c = COEFFS[system];
  // T = Julian centuries since J2000. The polynomial below mirrors the
  // IAU 2006 form: PA(T) = a₁·T + a₂·T². Quadratic stays under 2″ over
  // the 1900–2100 window but is a free win in accuracy.
  const T = (jd - JD_J2000) / JULIAN_CENTURY_DAYS;
  const arcsec =
    c.precessionArcsecPerCenturyT * T + c.precessionArcsecPerCenturyTSq * T * T;
  return c.baseDegreesAtJ2000 + arcsec / SECONDS_PER_DEGREE;
}

export function siderealFromTropical(
  tropicalLongitude: number,
  jd: number,
  system: AyanamsaSystem = 'lahiri',
): number {
  const result = tropicalLongitude - ayanamsa(jd, system);
  return ((result % 360) + 360) % 360;
}
