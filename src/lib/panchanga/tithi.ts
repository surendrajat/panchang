// Tithi — the lunar day.
//
// One lunar synodic month is divided into 30 tithis of 12° each in
// (moonLong - sunLong). The first 15 tithis (Shukla Paksha) take the
// elongation from 0° to 180°; the next 15 (Krishna Paksha) take it from
// 180° to 360°/0°.
//
// Tithi is invariant under ayanamsa — the offset cancels in the
// subtraction — so we use tropical longitudes directly.

import { sunMoonElongationAtJD, dateToJulian } from '$lib/astro';
import { TITHI_NAMES } from './names';
import { bisectAngularCrossing } from './bisect';
import type { TithiInfo } from './types';

const TITHI_DEGREES = 12;

export function tithiAtJD(jd: number): { index: number; elongation: number } {
  const elongation = sunMoonElongationAtJD(jd);
  const index = Math.floor(elongation / TITHI_DEGREES) + 1; // 1..30
  return { index, elongation };
}

export function tithiAtInstant(instant: Date): TithiInfo {
  const jd = dateToJulian(instant);
  const { index, elongation } = tithiAtJD(jd);

  const targetDegrees = index * TITHI_DEGREES; // end of this tithi
  // Tithi duration is roughly 20-26 hours; bracket 30 hours forward.
  const endTime = bisectAngularCrossing(
    sunMoonElongationAtJD,
    jd,
    elongation,
    targetDegrees,
    30 / 24,
  );

  const paksha = index <= 15 ? 'shukla' : 'krishna';
  const numberInPaksha = index <= 15 ? index : index - 15;
  const name = TITHI_NAMES[index - 1];

  const fraction = (elongation - (index - 1) * TITHI_DEGREES) / TITHI_DEGREES;

  return {
    index,
    number: numberInPaksha,
    name,
    paksha,
    endTime,
    fraction,
  };
}
