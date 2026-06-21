// Ephemeris adapter. Wraps astronomy-engine to expose apparent geocentric
// ecliptic-of-date longitudes for the Sun and Moon (panchanga) plus the
// planets, true node, true obliquity, and sidereal time (jyotish/kundli).
// Swap this file (and ayanamsa.ts) to change the ephemeris backend without
// touching the rest of the code.

import {
  Body,
  GeoMoon,
  GeoMoonState,
  GeoVector,
  Rotation_EQJ_ECT,
  RotateVector,
  SphereFromVector,
  SiderealTime,
  SunPosition,
  MakeTime,
  Illumination,
  MoonPhase as AeMoonPhase,
  Vector,
  e_tilt,
  type AstroTime,
} from 'astronomy-engine';

import { dateToJulian, JD_UNIX_EPOCH, MS_PER_DAY } from './julian';

// Wall-clock instant the panchanga layer reasons about. We pass Date
// instances around freely; astronomy-engine accepts FlexibleDateTime.
export type Instant = Date;

const DEG_PER_CIRCLE = 360;

function normalize(deg: number): number {
  const m = deg % DEG_PER_CIRCLE;
  return m < 0 ? m + DEG_PER_CIRCLE : m;
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

// Apparent geocentric ecliptic-of-date longitude of any planetary body
// (Mercury, Venus, Mars, Jupiter, Saturn, …), in degrees [0, 360). Uses
// the same EQJ→ECT rotation as moonLongitudeAtJD so every graha lands in
// the identical reference frame as the Sun and Moon — one ayanamsa then
// converts all of them to sidereal consistently. This is the seam the
// jyotish (kundli) layer builds on; the panchanga layer doesn't use it.
export function bodyLongitudeAtJD(body: Body, jd: number): number {
  const time = jdToAstroTime(jd);
  const eqj = GeoVector(body, time, true); // apparent: aberration-corrected
  const rot = Rotation_EQJ_ECT(time);
  const ect = RotateVector(rot, eqj);
  return normalize(SphereFromVector(ect).lon);
}

// True obliquity of the ecliptic (mean + IAU 2000B nutation in obliquity), in
// degrees — the value Swiss Ephemeris's house engine uses. Needed for the
// lagna: nutation in obliquity (≤9″) shifts the ascendant by up to ~0.5′ at
// high latitudes, so using the true (not mean) obliquity matches the gold
// standard there.
export function trueObliquityDeg(jd: number): number {
  return e_tilt(jdToAstroTime(jd)).tobl;
}

// Tropical ecliptic-of-date longitude of the Moon's TRUE (osculating)
// ascending node — "true Rahu", degrees [0, 360). From the Moon's state
// vector (rotated into the ecliptic of date): the orbital angular momentum
// h = r × v gives the node line ẑ × h, so the longitude is atan2(h_x, −h_y).
// Matches Swiss Ephemeris SE_TRUE_NODE to < 1′ before ayanamsa.
export function trueNodeLongitudeAtJD(jd: number): number {
  const time = jdToAstroTime(jd);
  const s = GeoMoonState(time);
  const rot = Rotation_EQJ_ECT(time);
  const r = RotateVector(rot, new Vector(s.x, s.y, s.z, time));
  const v = RotateVector(rot, new Vector(s.vx, s.vy, s.vz, time));
  const hx = r.y * v.z - r.z * v.y;
  const hy = r.z * v.x - r.x * v.z;
  return normalize((Math.atan2(hx, -hy) * 180) / Math.PI);
}

// Greenwich Apparent Sidereal Time at the instant, in hours [0, 24).
// The jyotish lagna (ascendant) needs local apparent sidereal time:
// LST = GAST·15 + longitudeEast (in degrees). Kept here so all
// astronomy-engine calls stay inside the ephemeris adapter.
export function gastHoursAtJD(jd: number): number {
  return SiderealTime(jdToAstroTime(jd));
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
