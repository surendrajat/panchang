// Yoga — combined Sun-and-Moon sidereal longitude.
//
// The sum (sunSidereal + moonSidereal) is divided into 27 equal yogas of
// 13°20′ each, just like nakshatras. The sum increases monotonically at
// the combined rate of the Sun and Moon (~13°10′/day), so a yoga lasts
// roughly 22-26 hours.

import { dateToJulian, sunMoonLongitudeAtJD, ayanamsa } from '$lib/astro';
import { YOGA_NAMES } from './names';
import { bisectAngularCrossing } from './bisect';
import type { AyanamsaSystem, YogaInfo } from './types';

const YOGA_DEGREES = 360 / 27;

function sumSiderealLongitudeAtJD(jd: number, system: AyanamsaSystem): number {
  const { sun, moon } = sunMoonLongitudeAtJD(jd);
  const sum = sun + moon - 2 * ayanamsa(jd, system);
  return ((sum % 360) + 360) % 360;
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
