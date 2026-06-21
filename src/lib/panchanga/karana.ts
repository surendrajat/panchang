// Karana — half a tithi.
//
// One tithi = 12° of elongation = 2 karanas, so there are 60 karanas in a
// synodic month — but only 11 distinct names. The very first half-tithi is the
// fixed karana Kimstughna; then 7 "movable" karanas repeat 8 times each (56 in
// all); then 3 fixed karanas (Shakuni, Chatushpada, Naga) fill the last three
// half-tithis before the next Shukla Pratipada. (4 fixed + 56 movable = 60.)
//
// Naming reference: standard Hindu calendrical literature. See
// Wikipedia: "Karana (Panchanga)".

import { dateToJulian, sunMoonElongationAtJD } from '$lib/astro';
import { FIXED_KARANA_NAMES, MOVABLE_KARANA_NAMES } from './names';
import { bisectAngularCrossing } from './bisect';
import type { KaranaInfo } from './types';

export const KARANA_DEGREES = 6;

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

// Returns every karana active during the panchanga day [anchor, anchor+24h).
// A typical day spans 2 or 3 karanas (each karana is ~12 hours). The first
// entry is the karana at the panchanga anchor (sunrise); subsequent entries
// are the karanas that start before the next sunrise. `endTime` on each
// element is when that karana ends.
export function karanaSequenceForDay(anchor: Date): KaranaInfo[] {
  const sequence: KaranaInfo[] = [];
  const dayEndMs = anchor.getTime() + 24 * 3600_000;
  let current = karanaAtInstant(anchor);
  sequence.push(current);
  // Step just past each karana's end to pick up the next one. Karanas
  // span 6° of elongation each (~12h), so at most ~3 transitions fit
  // in a 24h window even with the Moon at max speed.
  for (let safety = 0; safety < 5; safety++) {
    if (current.endTime.getTime() >= dayEndMs) break;
    // Probe 1 minute past the end to land cleanly in the next karana.
    const probe = new Date(current.endTime.getTime() + 60_000);
    current = karanaAtInstant(probe);
    sequence.push(current);
  }
  return sequence;
}
