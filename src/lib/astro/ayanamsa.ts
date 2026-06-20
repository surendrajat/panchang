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
// docs/ARCHITECTURE.md §12, but worth including so we don't compound
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
// The Lahiri J2000 anchor (23.85709°) is Swiss Ephemeris's SE_SIDM_LAHIRI —
// the value Swiss Ephemeris documents as the official Indian Astronomical
// Ephemeris realization (in use since 1985), and what astro.com and Jagannatha
// Hora compute. (ProKerala matches our LAGNA but uses Drik's higher ayanamsa
// value for positions — see lagna.ts.) Verified directly with pyswisseph across
// 1950–2050 (our IAU-2006 precession rate matches Swiss-Eph's to <0.01′, so a
// single base anchor reproduces it everywhere). This is the SAME accuracy-first
// choice we make for the kundli LAGNA (see jyotish/lagna.ts): match the
// independent gold standard, not any one panchang site.
//
// ⚠ "Lahiri" has several numerical realizations within ~0.6′. Notably,
// drikpanchang.com uses a value ~0.40′ HIGHER (24.213073° vs our 24.20634° on
// 2025-01-01). We do NOT follow Drik's here — the 0.40′ shifts sidereal
// positions by 0.40′ and nakshatra/yoga end times by ~45 s, which is below
// practical significance but is still a measurable bias. (Two earlier values
// were wrong and must not be restored: 23.8635° = Drik's variant; 23.8267° =
// a transcription of Drik's rounded *display text*, 2.2′ low.)
// KP, Raman, and Yukteshwar are likewise pinned to Swiss Ephemeris's
// realizations at J2000 (see COEFFS below) — not approximations.
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

const LAHIRI_J2000_DEG = 23.85709;
const IAU_PRECESSION_T = 5028.796195; // arcsec/century
const IAU_PRECESSION_T_SQ = 1.1054348; // arcsec/century²

const COEFFS: Record<AyanamsaSystem, AyanamsaCoeffs> = {
  lahiri: {
    baseDegreesAtJ2000: LAHIRI_J2000_DEG,
    precessionArcsecPerCenturyT: IAU_PRECESSION_T,
    precessionArcsecPerCenturyTSq: IAU_PRECESSION_T_SQ,
  },
  // KP, Raman, and Yukteshwar are pinned to Swiss Ephemeris's realizations
  // (SE_SIDM_KRISHNAMURTI / _RAMAN / _YUKTESHWAR) at J2000 and carried by the
  // same IAU-2006 precession — the same accuracy-first choice as Lahiri. Each
  // matches Swiss-Eph to <0.01′ across 1900–2100. (Earlier values were
  // independent realizations that drifted from Swiss-Eph by up to ~3′ for Raman
  // and ~7′ for Yukteshwar, whose literal 54″/yr rate was the worst offender.)
  kp: {
    baseDegreesAtJ2000: 23.76024, // SE_SIDM_KRISHNAMURTI (≈ Lahiri − 5.8′)
    precessionArcsecPerCenturyT: IAU_PRECESSION_T,
    precessionArcsecPerCenturyTSq: IAU_PRECESSION_T_SQ,
  },
  raman: {
    baseDegreesAtJ2000: 22.410791, // SE_SIDM_RAMAN
    precessionArcsecPerCenturyT: IAU_PRECESSION_T,
    precessionArcsecPerCenturyTSq: IAU_PRECESSION_T_SQ,
  },
  yukteshwar: {
    baseDegreesAtJ2000: 22.478803, // SE_SIDM_YUKTESHWAR
    precessionArcsecPerCenturyT: IAU_PRECESSION_T,
    precessionArcsecPerCenturyTSq: IAU_PRECESSION_T_SQ,
  },
  true_chitra: {
    // True Chitra-paksha: ayanamsa such that the ecliptic longitude of Spica
    // (Chitra) is exactly 180° sidereal. Anchored to Swiss Ephemeris's
    // SE_SIDM_TRUE_CITRA at J2000 (23.84002°, ~1′ below Lahiri) and carried
    // forward by the same IAU precession. Matches Swiss-Eph's dynamic
    // TRUE_CITRA to ≤14″ over 1900–2100 (~1″ near J2000); the residual is
    // nutation, which the true node tracks and this smooth polynomial omits.
    baseDegreesAtJ2000: 23.84002,
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
  const arcsec = c.precessionArcsecPerCenturyT * T + c.precessionArcsecPerCenturyTSq * T * T;
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
