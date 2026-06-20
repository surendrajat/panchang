// Names and fixed associations for the jyotish layer. Kept local to this
// folder (not in panchanga/names.ts) so the kundli feature is self-
// contained and the panchanga name-array parity tests stay untouched.
// Rashi names are reused from i18n (`rashiNameByIndex`).

import type { GrahaKey } from './types';

// Canonical transliterated names, indexed by GRAHA_ORDER.
export const GRAHA_NAMES: Record<GrahaKey, string> = {
  sun: 'Surya',
  moon: 'Chandra',
  mars: 'Mangala',
  mercury: 'Budha',
  jupiter: 'Guru',
  venus: 'Shukra',
  saturn: 'Shani',
  rahu: 'Rahu',
  ketu: 'Ketu',
};

export const GRAHA_NAMES_HI: Record<GrahaKey, string> = {
  sun: 'सूर्य',
  moon: 'चन्द्र',
  mars: 'मंगल',
  mercury: 'बुध',
  jupiter: 'गुरु',
  venus: 'शुक्र',
  saturn: 'शनि',
  rahu: 'राहु',
  ketu: 'केतु',
};

// Two-letter abbreviations used inside the chart cells, where space is
// tight. Mirrors the convention printed in almanac kundlis.
export const GRAHA_ABBR: Record<GrahaKey, string> = {
  sun: 'Su',
  moon: 'Mo',
  mars: 'Ma',
  mercury: 'Me',
  jupiter: 'Ju',
  venus: 'Ve',
  saturn: 'Sa',
  rahu: 'Ra',
  ketu: 'Ke',
};

export const GRAHA_ABBR_HI: Record<GrahaKey, string> = {
  sun: 'सू',
  moon: 'च',
  mars: 'मं',
  mercury: 'बु',
  jupiter: 'गु',
  venus: 'शु',
  saturn: 'श',
  rahu: 'रा',
  ketu: 'के',
};

// Sign lords (adhipati), indexed by rashi 0..11 (Mesha … Meena). Rahu and
// Ketu own no sign in the classical scheme.
export const RASHI_LORDS: readonly GrahaKey[] = [
  'mars', // 0  Mesha
  'venus', // 1  Vrishabha
  'mercury', // 2  Mithuna
  'moon', // 3  Karka
  'sun', // 4  Simha
  'mercury', // 5  Kanya
  'venus', // 6  Tula
  'mars', // 7  Vrishchika
  'jupiter', // 8  Dhanu
  'saturn', // 9  Makara
  'saturn', // 10 Kumbha
  'jupiter', // 11 Meena
];

export function grahaName(key: GrahaKey, lang: 'en' | 'hi'): string {
  return (lang === 'hi' ? GRAHA_NAMES_HI : GRAHA_NAMES)[key];
}

export function grahaAbbr(key: GrahaKey, lang: 'en' | 'hi'): string {
  return (lang === 'hi' ? GRAHA_ABBR_HI : GRAHA_ABBR)[key];
}
