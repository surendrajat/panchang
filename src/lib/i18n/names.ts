// Indexed name lookups for tithi / nakshatra / yoga / karana / masa /
// samvatsara, plus festival display names. The compute layer returns
// canonical English/Sanskrit transliterations; this module translates
// the displayed string based on the active language.

import {
  TITHI_NAMES,
  NAKSHATRA_NAMES,
  YOGA_NAMES,
  MASA_NAMES,
  MOVABLE_KARANA_NAMES,
  FIXED_KARANA_NAMES,
  SAMVATSARA_NAMES,
  RASHI_NAMES,
} from '$lib/panchanga/names';
import {
  TITHI_NAMES_HI,
  NAKSHATRA_NAMES_HI,
  YOGA_NAMES_HI,
  MASA_NAMES_HI,
  MOVABLE_KARANA_NAMES_HI,
  FIXED_KARANA_NAMES_HI,
  SAMVATSARA_NAMES_HI,
  RASHI_NAMES_HI,
} from './names-hi';
import type { Language } from './index';

function pick<T>(en: readonly T[], hi: readonly T[], lang: Language, index: number): T {
  const arr = lang === 'hi' ? hi : en;
  return arr[index];
}

export function tithiNameByIndex(index1to30: number, lang: Language): string {
  return pick(TITHI_NAMES, TITHI_NAMES_HI, lang, index1to30 - 1) ?? '';
}

export function nakshatraNameByIndex(index1to27: number, lang: Language): string {
  return pick(NAKSHATRA_NAMES, NAKSHATRA_NAMES_HI, lang, index1to27 - 1) ?? '';
}

export function yogaNameByIndex(index1to27: number, lang: Language): string {
  return pick(YOGA_NAMES, YOGA_NAMES_HI, lang, index1to27 - 1) ?? '';
}

export function masaNameByIndex(index1to12: number, lang: Language): string {
  return pick(MASA_NAMES, MASA_NAMES_HI, lang, index1to12 - 1) ?? '';
}

// Rashi (sidereal sign) by 0-based index (0=Mesha … 11=Meena).
export function rashiNameByIndex(index0to11: number, lang: Language): string {
  return pick(RASHI_NAMES, RASHI_NAMES_HI, lang, index0to11) ?? '';
}

export function samvatsaraNameByIndex(index0to59: number, lang: Language): string {
  const idx = ((index0to59 % 60) + 60) % 60;
  return pick(SAMVATSARA_NAMES, SAMVATSARA_NAMES_HI, lang, idx) ?? '';
}

// Karana lookup: positions 0..59 within the synodic-month cycle. The
// names follow the special pattern documented in panchanga/karana.ts:
//   pos 0     → Kimstughna (fixed)
//   pos 1..56 → 7 movable karanas, repeating 8 times
//   pos 57..59 → Shakuni / Chatushpada / Naga (fixed)
// We index by the *position*, not by the "named index", to match how
// karana.ts derives the names.
export function karanaNameByPosition(pos0to59: number, lang: Language): string {
  const movable = lang === 'hi' ? MOVABLE_KARANA_NAMES_HI : MOVABLE_KARANA_NAMES;
  const fixed = lang === 'hi' ? FIXED_KARANA_NAMES_HI : FIXED_KARANA_NAMES;
  if (pos0to59 === 0) return fixed[3]; // Kimstughna / किंस्तुघ्न
  if (pos0to59 >= 1 && pos0to59 <= 56) {
    return movable[(pos0to59 - 1) % 7];
  }
  return fixed[pos0to59 - 57]; // Shakuni / Chatushpada / Naga
}
