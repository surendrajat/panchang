// Moon phase: human-friendly summary derived from the Sun-Moon elongation.

import { moonIlluminationAtJD, sunMoonElongationAtJD } from '$lib/astro';
import { dateToJulian } from '$lib/astro';
import type { MoonPhaseInfo } from './types';

const SYNODIC_MONTH_DAYS = 29.530_588_2; // mean synodic month, source: NASA/JPL

export function moonPhaseAtInstant(instant: Date): MoonPhaseInfo {
  const jd = dateToJulian(instant);
  const phaseAngle = sunMoonElongationAtJD(jd); // 0..360
  const illumination = moonIlluminationAtJD(jd);
  const ageInDays = (phaseAngle / 360) * SYNODIC_MONTH_DAYS;
  return {
    phaseAngle,
    illumination,
    ageInDays,
    phaseName: phaseNameFromAngle(phaseAngle),
  };
}

function phaseNameFromAngle(angle: number): string {
  // Standard 8-phase split. Angle is Moon - Sun ecliptic longitude.
  //  0° = New Moon, 90° = First Quarter, 180° = Full, 270° = Last Quarter.
  if (angle < 22.5 || angle >= 337.5) return 'New Moon';
  if (angle < 67.5) return 'Waxing Crescent';
  if (angle < 112.5) return 'First Quarter';
  if (angle < 157.5) return 'Waxing Gibbous';
  if (angle < 202.5) return 'Full Moon';
  if (angle < 247.5) return 'Waning Gibbous';
  if (angle < 292.5) return 'Last Quarter';
  return 'Waning Crescent';
}
