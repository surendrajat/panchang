// The twelve rashi marks for the sky wheel: the standard astrological glyphs,
// drawn as clean stroke paths on a 0 0 32 32 grid (render: fill none, stroke
// currentColor) so they render identically everywhere — no emoji fallback.
// Tuned by eye against the Unicode reference glyphs (♈–♓).

export const RASHI_GLYPH_PATHS: readonly string[] = [
  'M16 24 V14 M16 14 C16 8 11 6.5 9.5 10.5 C8.7 12.8 11 14.2 12.8 12.8 M16 14 C16 8 21 6.5 22.5 10.5 C23.3 12.8 21 14.2 19.2 12.8', // Mesha ♈
  'M16 21 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 M8 8 C8 12 11 13 16 13 C21 13 24 12 24 8', // Vrishabha ♉
  'M11.5 8 H20.5 M11.5 24 H20.5 M13.5 8 V24 M18.5 8 V24', // Mithuna ♊
  'M8 13 C8 10.5 12 9.5 15.5 11 M15.5 11 a2.1 2.1 0 1 1 -2.9 1.4 M24 19 C24 21.5 20 22.5 16.5 21 M16.5 21 a2.1 2.1 0 1 1 2.9 -1.4', // Karka ♋
  'M9.5 21 a3.3 3.3 0 1 1 5.7 1.9 C14.6 17.3 12.5 11.5 17 10.5 C21 9.6 22.8 13 21.2 15.7 C20.4 17.2 18.2 17 18.7 14.9', // Simha ♌
  'M10 21 V12 Q11.5 9.5 13 12 V21 M16 21 V12 Q17.5 9.5 19 12 V21 Q19 23.5 22 22 Q24.5 20.5 23 17.5 Q21.7 15.5 18.5 16.8', // Kanya ♍
  'M7 22 H25 M8 17 H24 M11 17 A5 5 0 0 1 21 17', // Tula ♎
  'M8 21 V12 Q9.5 9.5 11 12 V21 M14 21 V12 Q15.5 9.5 17 12 V21 Q17 23.5 20 23 L24 23 M24 23 L21 21 M24 23 L21.5 25.5', // Vrishchika ♏
  'M9 23 L21 11 M21 11 L15 11 M21 11 L21 17 M13 15 L18 20', // Dhanu ♐
  'M7 12 L10 19 L13 12 M13 14.5 C16 13.5 18.5 15 18.5 17.5 C18.5 20 21 21 22.5 19.3 C24 17.7 22.8 15.3 20.8 15.5 C19.4 15.6 19 17 20 18', // Makara ♑
  'M8 14 L11 12 L14 14 L17 12 L20 14 L23 12 M8 20 L11 18 L14 20 L17 18 L20 20 L23 18', // Kumbha ♒
  'M11 8 C7.5 11 7.5 21 11 24 M21 8 C24.5 11 24.5 21 21 24 M9 16 H23', // Meena ♓
];

export type Element = 'fire' | 'earth' | 'air' | 'water';

// The classical four-element cycle, repeating Mesha→Meena.
export const RASHI_ELEMENT: readonly Element[] = [
  'fire', 'earth', 'air', 'water', 'fire', 'earth', 'air', 'water', 'fire', 'earth', 'air', 'water',
];

export const ELEMENT_LABEL: Record<Element, { en: string; hi: string }> = {
  fire: { en: 'Fire', hi: 'अग्नि' },
  earth: { en: 'Earth', hi: 'पृथ्वी' },
  air: { en: 'Air', hi: 'वायु' },
  water: { en: 'Water', hi: 'जल' },
};

// The Western sign each rashi corresponds to (for a learner's bridge).
export const RASHI_SIGN_EN: readonly string[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];
