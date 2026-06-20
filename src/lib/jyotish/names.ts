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

// Plain-English planet names, used when the transliteration preference is off.
// Rahu/Ketu have no Western equivalent, so they keep their Sanskrit names.
export const GRAHA_NAMES_EN: Record<GrahaKey, string> = {
  sun: 'Sun',
  moon: 'Moon',
  mars: 'Mars',
  mercury: 'Mercury',
  jupiter: 'Jupiter',
  venus: 'Venus',
  saturn: 'Saturn',
  rahu: 'Rahu',
  ketu: 'Ketu',
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

// Naamakshar — the traditional name-starting syllable, one per pada (27
// nakshatras × 4 = 108), used at the namkaran (naming) ceremony. Both tables
// are Wikipedia's nakshatra-pada table; the Devanagari akshar is canonical
// (Hindi mode), the Latin its romanization (English mode). The Latin loses the
// retroflex/dental distinction, so the Devanagari is authoritative.
type Quad = readonly [string, string, string, string];
const NAME_SYLLABLES_LATIN: readonly Quad[] = [
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
  ['Khi', 'Khu', 'Khe', 'Kho'], // 22 Shravana
  ['Ga', 'Gi', 'Gu', 'Ge'], // 23 Dhanishta
  ['Go', 'Sa', 'Si', 'Su'], // 24 Shatabhisha
  ['Se', 'So', 'Da', 'Di'], // 25 Purva Bhadrapada
  ['Du', 'Tha', 'Jha', 'Tra'], // 26 Uttara Bhadrapada
  ['De', 'Do', 'Cha', 'Chi'], // 27 Revati
];
const NAME_SYLLABLES_DEVA: readonly Quad[] = [
  ['चु', 'चे', 'चो', 'ला'], // 1 Ashwini
  ['ली', 'लू', 'ले', 'लो'], // 2 Bharani
  ['अ', 'ई', 'उ', 'ए'], // 3 Krittika
  ['ओ', 'वा', 'वी', 'वु'], // 4 Rohini
  ['वे', 'वो', 'का', 'की'], // 5 Mrigashira
  ['कु', 'घ', 'ङ', 'छ'], // 6 Ardra
  ['के', 'को', 'हा', 'ही'], // 7 Punarvasu
  ['हु', 'हे', 'हो', 'ड'], // 8 Pushya
  ['डी', 'डू', 'डे', 'डो'], // 9 Ashlesha
  ['मा', 'मी', 'मू', 'मे'], // 10 Magha
  ['नो', 'टा', 'टी', 'टू'], // 11 Purva Phalguni
  ['टे', 'टो', 'पा', 'पी'], // 12 Uttara Phalguni
  ['पू', 'ष', 'ण', 'ठ'], // 13 Hasta
  ['पे', 'पो', 'रा', 'री'], // 14 Chitra
  ['रू', 'रे', 'रो', 'ता'], // 15 Swati
  ['ती', 'तू', 'ते', 'तो'], // 16 Vishakha
  ['ना', 'नी', 'नू', 'ने'], // 17 Anuradha
  ['नो', 'या', 'यी', 'यू'], // 18 Jyeshtha
  ['ये', 'यो', 'भा', 'भी'], // 19 Mula
  ['भू', 'धा', 'फा', 'ढा'], // 20 Purva Ashadha
  ['भे', 'भो', 'जा', 'जी'], // 21 Uttara Ashadha
  ['खी', 'खू', 'खे', 'खो'], // 22 Shravana
  ['गा', 'गी', 'गु', 'गे'], // 23 Dhanishta
  ['गो', 'सा', 'सी', 'सू'], // 24 Shatabhisha
  ['से', 'सो', 'दा', 'दी'], // 25 Purva Bhadrapada
  ['दू', 'थ', 'झ', 'त्र'], // 26 Uttara Bhadrapada
  ['दे', 'दो', 'च', 'ची'], // 27 Revati
];

function table(lang: 'en' | 'hi'): readonly Quad[] {
  return lang === 'hi' ? NAME_SYLLABLES_DEVA : NAME_SYLLABLES_LATIN;
}

// The naming syllable for a given nakshatra (1–27) and pada (1–4), in the
// active language's script (Devanagari akshar for Hindi, Latin for English).
export function nameSyllable(
  nakshatra1to27: number,
  pada1to4: 1 | 2 | 3 | 4,
  lang: 'en' | 'hi' = 'en',
): string {
  return table(lang)[nakshatra1to27 - 1][pada1to4 - 1];
}

// All four pada syllables of a nakshatra (e.g. to show the alternatives).
export function nakshatraSyllables(
  nakshatra1to27: number,
  lang: 'en' | 'hi' = 'en',
): readonly string[] {
  return table(lang)[nakshatra1to27 - 1];
}
