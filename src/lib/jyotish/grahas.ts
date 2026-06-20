// Sidereal positions of the nine grahas.
//
// Sun/Moon reuse the panchanga ephemeris verbatim; the five true planets
// use the generic `bodyLongitudeAtJD` (same EQJ→ECT frame); Rahu/Ketu use the
// lunar node, mean or true per `nodeType`. Every longitude is then made
// sidereal by one ayanamsa, so all nine grahas share a single reference —
// exactly as the nakshatra/tithi math already does for the Moon.

import {
  Body,
  bodyLongitudeAtJD,
  sunLongitudeAtJD,
  moonLongitudeAtJD,
  trueNodeLongitudeAtJD,
  ayanamsa,
  dateToJulian,
  norm360,
  JD_J2000,
} from '$lib/astro';
import type { AyanamsaSystem } from '$lib/panchanga/types';
import { GRAHA_ORDER, type GrahaKey, type GrahaPosition, type NodeType } from './types';

const NAK_DEGREES = 360 / 27; // 13°20′
const PADA_DEGREES = NAK_DEGREES / 4; // 3°20′
const JULIAN_CENTURY_DAYS = 36525;

// Map the five true planets to astronomy-engine bodies.
const PLANET_BODY: Partial<Record<GrahaKey, Body>> = {
  mars: Body.Mars,
  mercury: Body.Mercury,
  jupiter: Body.Jupiter,
  venus: Body.Venus,
  saturn: Body.Saturn,
};

// Mean longitude of the Moon's ascending node, referred to the mean
// equinox of date, in degrees (Meeus, Astronomical Algorithms, 47.7).
// This is the tropical longitude of mean Rahu; subtract the ayanamsa for
// sidereal. The true (osculating) node — `trueNodeLongitudeAtJD`, selected
// by nodeType:'true' — oscillates ±~1.5° around this.
function meanNodeTropical(jd: number): number {
  const T = (jd - JD_J2000) / JULIAN_CENTURY_DAYS;
  const omega =
    125.0445479 -
    1934.1362891 * T +
    0.0020754 * T * T +
    (T * T * T) / 467441 -
    (T * T * T * T) / 60616000;
  return norm360(omega);
}

// Tropical ecliptic-of-date longitude of a graha before ayanamsa.
function grahaTropicalLongitude(key: GrahaKey, jd: number, nodeType: NodeType): number {
  if (key === 'sun') return sunLongitudeAtJD(jd);
  if (key === 'moon') return moonLongitudeAtJD(jd);
  if (key === 'rahu') return nodeTropical(jd, nodeType);
  if (key === 'ketu') return norm360(nodeTropical(jd, nodeType) + 180);
  const body = PLANET_BODY[key];
  if (!body) throw new Error(`Unknown graha: ${key}`);
  return bodyLongitudeAtJD(body, jd);
}

// Tropical longitude of Rahu by convention: 'mean' (smoothed average node)
// or 'true' (the instantaneous osculating node — what Drik's kundli and
// most modern Vedic software use). The true node differs from the mean by
// up to ±1.5°.
function nodeTropical(jd: number, nodeType: NodeType): number {
  return nodeType === 'true' ? trueNodeLongitudeAtJD(jd) : meanNodeTropical(jd);
}

export function grahaSiderealLongitude(
  key: GrahaKey,
  jd: number,
  system: AyanamsaSystem,
  nodeType: NodeType,
): number {
  return norm360(grahaTropicalLongitude(key, jd, nodeType) - ayanamsa(jd, system));
}

// {index 1..27, pada 1..4, fraction 0..1 through the nakshatra} from a
// sidereal longitude. Shared by grahas and the Vimshottari dasha (which
// needs the Moon's fraction-through-nakshatra for the birth balance).
export function nakshatraOf(siderealLongitude: number): {
  index: number;
  pada: 1 | 2 | 3 | 4;
  fraction: number;
} {
  const lon = norm360(siderealLongitude);
  const index = Math.floor(lon / NAK_DEGREES) + 1;
  const within = lon - (index - 1) * NAK_DEGREES;
  const padaNum = Math.floor(within / PADA_DEGREES) + 1;
  const pada = (padaNum >= 1 && padaNum <= 4 ? padaNum : 4) as 1 | 2 | 3 | 4;
  return { index, pada, fraction: within / NAK_DEGREES };
}

// Retrograde test by finite difference of sidereal longitude. Sun/Moon
// never retrograde; mean nodes are always retrograde by convention.
function isRetrograde(
  key: GrahaKey,
  jd: number,
  system: AyanamsaSystem,
  nodeType: NodeType,
): boolean {
  if (key === 'sun' || key === 'moon') return false;
  if (key === 'rahu' || key === 'ketu') return true;
  const dt = 0.5; // half a day either side
  const before = grahaSiderealLongitude(key, jd - dt, system, nodeType);
  const after = grahaSiderealLongitude(key, jd + dt, system, nodeType);
  let delta = after - before;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta < 0;
}

export function computeGraha(
  key: GrahaKey,
  jd: number,
  system: AyanamsaSystem,
  nodeType: NodeType,
): GrahaPosition {
  const longitude = grahaSiderealLongitude(key, jd, system, nodeType);
  const rashi = Math.floor(longitude / 30);
  const nak = nakshatraOf(longitude);
  return {
    key,
    longitude,
    rashi,
    degInRashi: longitude - rashi * 30,
    nakshatra: nak.index,
    pada: nak.pada,
    retrograde: isRetrograde(key, jd, system, nodeType),
    house: null, // assigned by chart.ts once the lagna is known
  };
}

export function computeGrahas(
  instant: Date,
  system: AyanamsaSystem,
  nodeType: NodeType,
): GrahaPosition[] {
  const jd = dateToJulian(instant);
  return GRAHA_ORDER.map((key) => computeGraha(key, jd, system, nodeType));
}
