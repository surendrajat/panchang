// Nakshatra — the lunar mansion.
//
// The sidereal ecliptic is divided into 27 nakshatras of 360°/27 = 13°20′
// each. Each nakshatra has 4 padas of 3°20′. Nakshatra is determined by
// the Moon's sidereal longitude (tropical − ayanamsa).

import { dateToJulian, moonLongitudeAtJD, ayanamsa } from '$lib/astro';
import { NAKSHATRA_NAMES } from './names';
import { bisectAngularCrossing } from './bisect';
import type { AyanamsaSystem, NakshatraInfo } from './types';

export const NAKSHATRA_DEGREES = 360 / 27; // 13.333...
const PADA_DEGREES = NAKSHATRA_DEGREES / 4; // 3.333...

function moonSiderealLongitudeAtJD(jd: number, system: AyanamsaSystem): number {
  const trop = moonLongitudeAtJD(jd);
  const sid = trop - ayanamsa(jd, system);
  return ((sid % 360) + 360) % 360;
}

export function nakshatraAtInstant(instant: Date, ayanamsaSystem: AyanamsaSystem): NakshatraInfo {
  const jd = dateToJulian(instant);
  const siderealLong = moonSiderealLongitudeAtJD(jd, ayanamsaSystem);
  const index = Math.floor(siderealLong / NAKSHATRA_DEGREES) + 1; // 1..27
  const targetDegrees = index * NAKSHATRA_DEGREES; // end of this nakshatra

  const endTime = bisectAngularCrossing(
    (j) => moonSiderealLongitudeAtJD(j, ayanamsaSystem),
    jd,
    siderealLong,
    targetDegrees,
    1.5, // Moon traverses 13°20′ in ~24h; 36h is a safe bracket
  );

  const padaIndex = Math.floor((siderealLong % NAKSHATRA_DEGREES) / PADA_DEGREES) + 1;
  const pada = (padaIndex >= 1 && padaIndex <= 4 ? padaIndex : 1) as 1 | 2 | 3 | 4;
  const fraction = (siderealLong - (index - 1) * NAKSHATRA_DEGREES) / NAKSHATRA_DEGREES;

  return {
    index,
    name: NAKSHATRA_NAMES[index - 1],
    pada,
    endTime,
    fraction,
  };
}
