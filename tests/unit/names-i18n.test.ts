// Invariant: every Hindi name array in i18n/names-hi.ts must have the
// same length as its English counterpart in panchanga/names.ts, so the
// index-based lookups in i18n/names.ts cannot pick `undefined`.

import { describe, it, expect } from 'vitest';
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
} from '$lib/i18n/names-hi';

describe('Hindi name arrays match English-array lengths', () => {
  it.each([
    ['tithi', TITHI_NAMES.length, TITHI_NAMES_HI.length],
    ['nakshatra', NAKSHATRA_NAMES.length, NAKSHATRA_NAMES_HI.length],
    ['yoga', YOGA_NAMES.length, YOGA_NAMES_HI.length],
    ['masa', MASA_NAMES.length, MASA_NAMES_HI.length],
    ['karana-movable', MOVABLE_KARANA_NAMES.length, MOVABLE_KARANA_NAMES_HI.length],
    ['karana-fixed', FIXED_KARANA_NAMES.length, FIXED_KARANA_NAMES_HI.length],
    ['samvatsara', SAMVATSARA_NAMES.length, SAMVATSARA_NAMES_HI.length],
    ['rashi', RASHI_NAMES.length, RASHI_NAMES_HI.length],
  ])('%s arrays are the same length', (_label, en, hi) => {
    expect(hi).toBe(en);
  });
});

// Length parity alone would pass a copy-paste like `TITHI_NAMES_HI = [...TITHI_NAMES]`
// (English leaking into Hindi). Assert each entry is non-empty, differs from its
// English counterpart, and actually contains Devanagari.
describe('Hindi name arrays are genuinely Hindi', () => {
  it.each([
    ['tithi', TITHI_NAMES, TITHI_NAMES_HI],
    ['nakshatra', NAKSHATRA_NAMES, NAKSHATRA_NAMES_HI],
    ['yoga', YOGA_NAMES, YOGA_NAMES_HI],
    ['masa', MASA_NAMES, MASA_NAMES_HI],
    ['karana-movable', MOVABLE_KARANA_NAMES, MOVABLE_KARANA_NAMES_HI],
    ['karana-fixed', FIXED_KARANA_NAMES, FIXED_KARANA_NAMES_HI],
    ['samvatsara', SAMVATSARA_NAMES, SAMVATSARA_NAMES_HI],
    ['rashi', RASHI_NAMES, RASHI_NAMES_HI],
  ] as const)('%s Hindi entries differ from English and use Devanagari', (label, en, hi) => {
    hi.forEach((name, i) => {
      expect(name, `${label}[${i}] is empty`).toBeTruthy();
      expect(name, `${label}[${i}] equals the English "${en[i]}"`).not.toBe(en[i]);
      expect(/[ऀ-ॿ]/.test(name), `${label}[${i}] "${name}" has no Devanagari`).toBe(true);
    });
  });
});
