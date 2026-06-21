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

// Naamakshar — the traditional name-starting syllable, fixed by the Moon's
// janma-nakshatra and its pada (108 padas → 108 syllables). In the namkaran
// (naming) ceremony the child's name is chosen to begin with this sound. Each
// nakshatra (13°20′) has four padas (3°20′), one syllable each.
//
// Standard nakshatra-pada table (cross-checked against Wikipedia and baby-
// naming references). The Devanagari akshar is the canonical form; the Latin
// romanization below varies a little by tradition (e.g. Va/Ba, Pha/Bha), so
// treat it as a guide to the sound, not a fixed spelling.
const NAME_SYLLABLES: readonly (readonly [string, string, string, string])[] = [
  ['Chu', 'Che', 'Cho', 'La'], // 1 Ashwini
  ['Li', 'Lu', 'Le', 'Lo'], // 2 Bharani
  ['A', 'I', 'U', 'E'], // 3 Krittika
  ['O', 'Va', 'Vi', 'Vu'], // 4 Rohini
  ['Ve', 'Vo', 'Ka', 'Ki'], // 5 Mrigashira
  ['Ku', 'Gha', 'Nga', 'Chha'], // 6 Ardra
  ['Ke', 'Ko', 'Ha', 'Hi'], // 7 Punarvasu
  ['Hu', 'He', 'Ho', 'Da'], // 8 Pushya
  ['Di', 'Du', 'De', 'Do'], // 9 Ashlesha
  ['Ma', 'Mi', 'Mu', 'Me'], // 10 Magha
  ['No', 'Ta', 'Ti', 'Tu'], // 11 Purva Phalguni
  ['Te', 'To', 'Pa', 'Pi'], // 12 Uttara Phalguni
  ['Pu', 'Sha', 'Na', 'Tha'], // 13 Hasta
  ['Pe', 'Po', 'Ra', 'Ri'], // 14 Chitra
  ['Ru', 'Re', 'Ro', 'Ta'], // 15 Swati
  ['Ti', 'Tu', 'Te', 'To'], // 16 Vishakha
  ['Na', 'Ni', 'Nu', 'Ne'], // 17 Anuradha
  ['No', 'Ya', 'Yi', 'Yu'], // 18 Jyeshtha
  ['Ye', 'Yo', 'Bha', 'Bhi'], // 19 Mula
  ['Bhu', 'Dha', 'Pha', 'Dha'], // 20 Purva Ashadha
  ['Bhe', 'Bho', 'Ja', 'Ji'], // 21 Uttara Ashadha
  ['Ju', 'Je', 'Jo', 'Gha'], // 22 Shravana
  ['Ga', 'Gi', 'Gu', 'Ge'], // 23 Dhanishta
  ['Go', 'Sa', 'Si', 'Su'], // 24 Shatabhisha
  ['Se', 'So', 'Da', 'Di'], // 25 Purva Bhadrapada
  ['Du', 'Tha', 'Jha', 'Da'], // 26 Uttara Bhadrapada
  ['De', 'Do', 'Cha', 'Chi'], // 27 Revati
];

// The naming syllable for a given nakshatra (1–27) and pada (1–4).
export function nameSyllable(nakshatra1to27: number, pada1to4: 1 | 2 | 3 | 4): string {
  return NAME_SYLLABLES[nakshatra1to27 - 1][pada1to4 - 1];
}

// All four pada syllables of a nakshatra (e.g. to show the alternatives).
export function nakshatraSyllables(nakshatra1to27: number): readonly string[] {
  return NAME_SYLLABLES[nakshatra1to27 - 1];
}
