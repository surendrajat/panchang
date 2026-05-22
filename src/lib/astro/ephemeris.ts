// Ephemeris adapter. Wraps astronomy-engine to expose only what the
// panchanga layer needs: geocentric ecliptic-of-date longitudes for the
// Sun and Moon. Swap this file (and ayanamsa.ts) to change the ephemeris
// backend without touching the rest of the code.

import {
  Body,
  GeoMoon,
  Rotation_EQJ_ECT,
  RotateVector,
  SphereFromVector,
  SunPosition,
  MakeTime,
  Illumination,
  MoonPhase as AeMoonPhase,
  type AstroTime,
} from 'astronomy-engine';

import { dateToJulian, JD_UNIX_EPOCH, MS_PER_DAY } from './julian';

// Wall-clock instant the panchanga layer reasons about. We pass Date
// instances around freely; astronomy-engine accepts FlexibleDateTime.
export type Instant = Date;

const TWO_PI = 360;

function normalize(deg: number): number {
  const m = deg % TWO_PI;
  return m < 0 ? m + TWO_PI : m;
}

// Apparent geocentric ecliptic longitude of the Sun, true equinox and
// ecliptic of date, in degrees [0, 360).
export function sunLongitudeAtJD(jd: number): number {
  const date = jdToDateForAstronomy(jd);
  const ecl = SunPosition(date);
  return normalize(ecl.elon);
}

// Apparent geocentric ecliptic longitude of the Moon, true equinox and
// ecliptic of date, in degrees [0, 360). Computed by rotating GeoMoon's
// J2000 equatorial vector into the true-of-date ecliptic frame so it
// stays in the same reference as SunPosition.
export function moonLongitudeAtJD(jd: number): number {
  const time = jdToAstroTime(jd);
  const eqjMoon = GeoMoon(time);
  const rot = Rotation_EQJ_ECT(time);
  const ectMoon = RotateVector(rot, eqjMoon);
  const sph = SphereFromVector(ectMoon);
  return normalize(sph.lon);
}

// Convenience for the simultaneous case (cheaper if called together —
// AstroTime is built once).
export function sunMoonLongitudeAtJD(jd: number): { sun: number; moon: number } {
  const time = jdToAstroTime(jd);
  const sun = normalize(SunPosition(time).elon);
  const eqjMoon = GeoMoon(time);
  const rot = Rotation_EQJ_ECT(time);
  const ectMoon = RotateVector(rot, eqjMoon);
  const moon = normalize(SphereFromVector(ectMoon).lon);
  return { sun, moon };
}

// Geocentric moon illumination [0..1].
export function moonIlluminationAtJD(jd: number): number {
  return Illumination(Body.Moon, jdToDateForAstronomy(jd)).phase_fraction;
}

// Sun-to-Moon elongation in degrees, 0..360, matching the tithi definition
// directly. Faster than separate longitudes when only the difference matters.
export function sunMoonElongationAtJD(jd: number): number {
  return normalize(AeMoonPhase(jdToDateForAstronomy(jd)));
}

// astronomy-engine accepts native Date or its own AstroTime. We prefer
// AstroTime when we're already building one (rotation matrices need it).
function jdToDateForAstronomy(jd: number): Date {
  return new Date((jd - JD_UNIX_EPOCH) * MS_PER_DAY);
}

function jdToAstroTime(jd: number): AstroTime {
  return MakeTime(jdToDateForAstronomy(jd));
}

export { Body };
export { dateToJulian };
