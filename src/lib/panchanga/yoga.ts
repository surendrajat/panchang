// Yoga — combined Sun-and-Moon sidereal longitude.
//
// The sum (sunSidereal + moonSidereal) is divided into 27 equal yogas of
// 13°20′ each, just like nakshatras. The sum increases at the combined
// rate: Moon (~13°10′/day) + Sun (~1°/day) ≈ 14°10′/day, so a yoga
// lasts roughly 20–27 hours (varies with Moon speed). Usually one yoga
// per panchanga day; rarely two when the Moon is near perigee.

import { dateToJulian, sunMoonLongitudeAtJD, ayanamsa, norm360 } from '$lib/astro';
import { YOGA_NAMES } from './names';
import { bisectAngularCrossing } from './bisect';
import type { AyanamsaSystem, YogaInfo } from './types';

const YOGA_DEGREES = 360 / 27;

function sumSiderealLongitudeAtJD(jd: number, system: AyanamsaSystem): number {
  const { sun, moon } = sunMoonLongitudeAtJD(jd);
  const sum = sun + moon - 2 * ayanamsa(jd, system);
  return norm360(sum);
}

export function yogaAtInstant(instant: Date, ayanamsaSystem: AyanamsaSystem): YogaInfo {
  const jd = dateToJulian(instant);
  const sumLong = sumSiderealLongitudeAtJD(jd, ayanamsaSystem);
  const index = Math.floor(sumLong / YOGA_DEGREES) + 1; // 1..27
  const targetDegrees = index * YOGA_DEGREES;

  const endTime = bisectAngularCrossing(
    (j) => sumSiderealLongitudeAtJD(j, ayanamsaSystem),
    jd,
    sumLong,
    targetDegrees,
    1.5,
  );

  const fraction = (sumLong - (index - 1) * YOGA_DEGREES) / YOGA_DEGREES;

  return {
    index,
    name: YOGA_NAMES[index - 1],
    endTime,
    fraction,
  };
}
