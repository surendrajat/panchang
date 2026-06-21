// Per-rashi reference data for the sky page. (The sign + planet marks on the
// wheel are the real Unicode astrological glyphs, rendered via a symbol font —
// see Sky.svelte — so no icon path data lives here anymore.)

export type Element = 'fire' | 'earth' | 'air' | 'water';

// The classical four-element cycle, repeating Mesha→Meena.
export const RASHI_ELEMENT: readonly Element[] = [
  'fire',
  'earth',
  'air',
  'water',
  'fire',
  'earth',
  'air',
  'water',
  'fire',
  'earth',
  'air',
  'water',
];

// en = plain English, tr = Sanskrit transliteration (shown when the
// transliteration preference is on), hi = Devanagari.
export const ELEMENT_LABEL: Record<Element, { en: string; tr: string; hi: string }> = {
  fire: { en: 'Fire', tr: 'Agni', hi: 'अग्नि' },
  earth: { en: 'Earth', tr: 'Prithvi', hi: 'पृथ्वी' },
  air: { en: 'Air', tr: 'Vayu', hi: 'वायु' },
  water: { en: 'Water', tr: 'Jala', hi: 'जल' },
};

// The Western sign each rashi corresponds to (for a learner's bridge).
export const RASHI_SIGN_EN: readonly string[] = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
];
