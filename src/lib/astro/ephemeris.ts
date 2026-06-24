// Ephemeris adapter. Wraps astronomy-engine to expose apparent geocentric
// ecliptic-of-date longitudes for the Sun and Moon (panchanga) plus the
// planets, true node, true obliquity, and sidereal time (jyotish/kundli).
// Swap this file (and ayanamsa.ts) to change the ephemeris backend without
// touching the rest of the code.

import {
  Body,
  Ecliptic,
  EclipticGeoMoon,
  GeoMoonState,
  GeoVector,
  Rotation_EQJ_ECT,
  RotateVector,
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
import { norm360 } from './angle';

// Wall-clock instant the panchanga layer reasons about. We pass Date
// instances around freely; astronomy-engine accepts FlexibleDateTime.
export type Instant = Date;

// Same-instant memo: the engine queries the SAME jd (the sunrise anchor) ~20x per
// day across tithi/nakshatra/yoga/karana. These pure jd→value results are cached
// (bounded, cleared on overflow); values are immutable so it's transparent — the
// fast-path parity test guards it.
const EPHEM_CACHE_MAX = 4096;
function memoByJd(cache: Map<number, number>, jd: number, compute: () => number): number {
  const hit = cache.get(jd);
  if (hit !== undefined) return hit;
  const v = compute();
  if (cache.size >= EPHEM_CACHE_MAX) cache.clear();
  cache.set(jd, v);
  return v;
}
const sunLonCache = new Map<number, number>();
const moonLonCache = new Map<number, number>();
const elongCache = new Map<number, number>();

// Apparent geocentric ecliptic longitude of the Sun, true equinox/ecliptic of date, deg [0,360).
export function sunLongitudeAtJD(jd: number): number {
  return memoByJd(sunLonCache, jd, () => norm360(SunPosition(jdToDateForAstronomy(jd)).elon));
}

// Apparent geocentric ecliptic longitude of the Moon, true ecliptic of date
// (same frame as the Sun).
export function moonLongitudeAtJD(jd: number): number {
  return memoByJd(moonLonCache, jd, () => norm360(EclipticGeoMoon(jdToAstroTime(jd)).lon));
}

// Convenience for the simultaneous case — the AstroTime is built once and shared
// by both library calls.
export function sunMoonLongitudeAtJD(jd: number): { sun: number; moon: number } {
  const time = jdToAstroTime(jd);
  return { sun: norm360(SunPosition(time).elon), moon: norm360(EclipticGeoMoon(time).lon) };
}

// Apparent geocentric ecliptic-of-date longitude of any planetary body
// (Mercury, Venus, Mars, Jupiter, Saturn, …), in degrees [0, 360). Same true
// ecliptic of date as the Sun and Moon, so one ayanamsa converts all of them to
// sidereal consistently. This is the seam the jyotish (kundli) layer builds on;
// the panchanga layer doesn't use it.
export function bodyLongitudeAtJD(body: Body, jd: number): number {
  // apparent (aberration-corrected) geocentric vector → true ecliptic of date.
  return norm360(Ecliptic(GeoVector(body, jdToAstroTime(jd), true)).elon);
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
  return norm360((Math.atan2(hx, -hy) * 180) / Math.PI);
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

// Sun-to-Moon elongation, deg [0,360), matching the tithi definition. Memoized.
export function sunMoonElongationAtJD(jd: number): number {
  return memoByJd(elongCache, jd, () => norm360(AeMoonPhase(jdToDateForAstronomy(jd))));
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
