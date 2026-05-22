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
} from '$lib/panchanga/names';
import {
  TITHI_NAMES_HI,
  NAKSHATRA_NAMES_HI,
  YOGA_NAMES_HI,
  MASA_NAMES_HI,
  MOVABLE_KARANA_NAMES_HI,
  FIXED_KARANA_NAMES_HI,
  SAMVATSARA_NAMES_HI,
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
  ])('%s arrays are the same length', (_label, en, hi) => {
    expect(hi).toBe(en);
  });
});
