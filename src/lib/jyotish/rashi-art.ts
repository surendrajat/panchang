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

export const ELEMENT_LABEL: Record<Element, { en: string; hi: string }> = {
  fire: { en: 'Fire', hi: 'अग्नि' },
  earth: { en: 'Earth', hi: 'पृथ्वी' },
  air: { en: 'Air', hi: 'वायु' },
  water: { en: 'Water', hi: 'जल' },
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
