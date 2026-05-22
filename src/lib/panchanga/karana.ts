// Karana — half a tithi.
//
// One tithi = 12° of elongation = 2 karanas. There are 60 karanas in a
// synodic month, but only 11 distinct names: 7 "movable" karanas repeat
// 8 times each (positions 1..56), and 4 "fixed" karanas occupy positions
// 57..60 (the half-tithis before the next Shukla Pratipada).
//
// Naming reference: standard Hindu calendrical literature. See
// Wikipedia: "Karana (Panchanga)".

import { dateToJulian, sunMoonElongationAtJD } from '$lib/astro';
import { FIXED_KARANA_NAMES, MOVABLE_KARANA_NAMES } from './names';
import { bisectAngularCrossing } from './bisect';
import type { KaranaInfo } from './types';

const KARANA_DEGREES = 6;

function karanaNameForPosition(pos: number): { name: string; namedIndex: number } {
  // Position is 0..59. Position 0 corresponds to Shukla Pratipada first
  // half (Kimstughna). Positions 1..56 are movable karanas (8 cycles of
  // 7 names). Positions 57..59 are Shakuni, Chatushpada, Naga.
  if (pos === 0) {
    return { name: FIXED_KARANA_NAMES[3], namedIndex: 11 }; // Kimstughna
  }
  if (pos >= 1 && pos <= 56) {
    const cycleIndex = (pos - 1) % 7;
    const named = cycleIndex + 1; // 1..7
    return { name: MOVABLE_KARANA_NAMES[cycleIndex], namedIndex: named };
  }
  // pos 57, 58, 59 → Shakuni, Chatushpada, Naga
  const fixedIndex = pos - 57; // 0..2
  return { name: FIXED_KARANA_NAMES[fixedIndex], namedIndex: 8 + fixedIndex };
}

export function karanaAtInstant(instant: Date): KaranaInfo {
  const jd = dateToJulian(instant);
  const elongation = sunMoonElongationAtJD(jd);
  const position = Math.floor(elongation / KARANA_DEGREES); // 0..59
  const targetDegrees = (position + 1) * KARANA_DEGREES;

  const endTime = bisectAngularCrossing(
    sunMoonElongationAtJD,
    jd,
    elongation,
    targetDegrees,
    20 / 24, // karana is ~12 hours
  );

  const { name, namedIndex } = karanaNameForPosition(position);
  const fraction = (elongation - position * KARANA_DEGREES) / KARANA_DEGREES;

  return {
    index: namedIndex,
    positionInCycle: position,
    name,
    endTime,
    fraction,
  };
}
