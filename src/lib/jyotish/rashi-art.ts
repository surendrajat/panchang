// Two switchable icon sets for the twelve rashis, on a 0 0 32 32 grid.
//
//  • RASHI_GLYPH_PATHS     — the standard astrological symbols, as clean stroke
//    paths (render: fill none, stroke currentColor).
//  • RASHI_REALISTIC_PATHS — pictorial silhouettes (ram, bull, twins, crab,
//    lion, maiden, scales, scorpion, archer, sea-goat, water-bearer, fishes).
//    Render fill currentColor + a thin matching stroke so legs/antennae read.
//
// Both are single path strings per sign (multiple sub-paths inside). The sky
// page lets the look be toggled by eye.

export const RASHI_GLYPH_PATHS: readonly string[] = [
  'M16 23 V14 M16 14 C16 9 12 7.5 10.5 10.5 C9.5 12.5 11 14 12.5 13 M16 14 C16 9 20 7.5 21.5 10.5 C22.5 12.5 21 14 19.5 13', // Mesha ♈
  'M16 21 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 M8 8 C8 12 11 13 16 13 C21 13 24 12 24 8', // Vrishabha ♉
  'M12 9 V23 M20 9 V23 M9 9 Q16 6 23 9 M9 23 Q16 26 23 23', // Mithuna ♊
  'M9 12 Q9 9 13 9 Q16 9 16 12 M16 12 A2 2 0 1 1 13.5 11 M23 20 Q23 23 19 23 Q16 23 16 20 M16 20 A2 2 0 1 1 18.5 21', // Karka ♋
  'M11 21 a3 3 0 1 1 5 1.5 C18 17 16 12 20 11 C23 10.3 24 13 22.5 14.5', // Simha ♌
  'M10 21 V12 Q11.5 9.5 13 12 V21 M16 21 V12 Q17.5 9.5 19 12 V21 Q19 23.5 22 22 Q24.5 20.5 23 17.5 Q21.7 15.5 18.5 16.8', // Kanya ♍
  'M7 22 H25 M8 17 H24 M11 17 A5 5 0 0 1 21 17', // Tula ♎
  'M8 21 V12 Q9.5 9.5 11 12 V21 M14 21 V12 Q15.5 9.5 17 12 V21 Q17 23.5 20 23 L24 23 M24 23 L21 21 M24 23 L21.5 25.5', // Vrishchika ♏
  'M9 23 L21 11 M21 11 L15 11 M21 11 L21 17 M13 15 L18 20', // Dhanu ♐
  'M8 12 V19 M8 13 Q9.5 11 11 13 V19 Q11 21 14 20.5 Q17 20 17 17 Q17 14 14 14.5 Q12 15 13 17', // Makara ♑
  'M8 14 L11 12 L14 14 L17 12 L20 14 L23 12 M8 20 L11 18 L14 20 L17 18 L20 20 L23 18', // Kumbha ♒
  'M11 8 C7.5 11 7.5 21 11 24 M21 8 C24.5 11 24.5 21 21 24 M9 16 H23', // Meena ♓
];

export const RASHI_REALISTIC_PATHS: readonly string[] = [
  'M16 14 C13.5 14 11.5 15.5 11.5 18 C11.5 21 13.5 23 16 23 C18.5 23 20.5 21 20.5 18 C20.5 15.5 18.5 14 16 14 Z M12 16 C8 15 6 17 7 19.5 C7.6 21 9.5 20.7 9.4 19 M20 16 C24 15 26 17 25 19.5 C24.4 21 22.5 20.7 22.6 19 M14.3 14.4 L13.3 12 M17.7 14.4 L18.7 12', // Mesha ram
  'M16 16.5 C12.5 16.5 10 18.5 10 21 C10 23.5 12.5 25 16 25 C19.5 25 22 23.5 22 21 C22 18.5 19.5 16.5 16 16.5 Z M10.5 18.5 C6 14.5 4 17 6.5 19 M21.5 18.5 C26 14.5 28 17 25.5 19 M13.6 20 a0.9 0.9 0 1 0 0.01 0 M18.4 20 a0.9 0.9 0 1 0 0.01 0', // Vrishabha bull
  'M11 9 a2 2 0 1 0 0.01 0 Z M9 12 H13 L12.2 17 L13 23 H11.4 L11 18.5 L10.6 23 H9 L9.8 17 Z M21 9 a2 2 0 1 0 0.01 0 Z M19 12 H23 L22.2 17 L23 23 H21.4 L21 18.5 L20.6 23 H19 L19.8 17 Z M13 13.5 L19 13.5', // Mithuna twins
  'M16 18 a4.5 2.8 0 1 0 0.01 0 Z M11.5 16.5 C8.5 14.5 6.5 16 8 17.5 C8.8 18.2 9.7 17.7 9.3 16.9 M20.5 16.5 C23.5 14.5 25.5 16 24 17.5 C23.2 18.2 22.3 17.7 22.7 16.9 M11 19 L8 20.3 M11.4 20.4 L9 22.2 M21 19 L24 20.3 M20.6 20.4 L23 22.2 M14.5 20.8 L14 23 M17.5 20.8 L18 23', // Karka crab
  'M16 14.5 C12.5 14.5 10 17 10 20 C10 23 12.5 25 16 25 C19.5 25 22 23 22 20 C22 17 19.5 14.5 16 14.5 Z M14.5 11.5 L13.2 14.5 M17.5 11.5 L18.8 14.5 M10.2 17.5 L7.5 16 M21.8 17.5 L24.5 16 M22 22 C24.8 22.3 24.8 25.5 22.3 26.3 M12 13 L13.5 15 M20 13 L18.5 15', // Simha lion
  'M16 9 a2 2 0 1 0 0.01 0 Z M12.8 13.5 C12.8 12 19.2 12 19.2 13.5 L21 24.5 H11 Z M13 16 L10.5 14.2 M19 16 L21.5 14.2 M16 13.7 V24.5', // Kanya maiden
  'M15 7 H17 V11 H15 Z M6 11 H26 V12.4 H6 Z M6 12.6 L4.2 16.2 H7.8 Z M26 12.6 L24.2 16.2 H27.8 Z M5 16.4 H7 M25 16.4 H27 M16 7 V11', // Tula scales
  'M7 17 a1.6 1.6 0 1 0 0.01 0 Z M8.6 17 H11.4 M12.8 17 a1.5 1.5 0 1 0 0.01 0 Z M14.2 16.6 H16.6 M18 16.2 a1.5 1.5 0 1 0 0.01 0 Z M19.4 15.8 C21.5 15.4 22.5 13.8 23.3 12.4 C23.7 11.6 24.5 11.4 24.8 12.4 L25.6 11.5 M24.8 12.4 L24.9 13.9 M5.6 16 L7 16.8 M5.6 18.4 L7 17.6', // Vrishchika scorpion
  'M7 23 L10 18 C11 16 13 15 15 15 L19 13.5 L21.5 11 M21.5 11 L18.7 11.4 M21.5 11 L21.6 13.8 M11 18 L9.5 23 M15 15.2 L14.5 23 M16 14.8 L18.5 23 M12.5 16.5 C13.5 15 15.5 15 16.5 16.5', // Dhanu archer
  'M9 14.5 C9 12.8 11.2 12.3 12.8 13.4 L14.5 12.3 C15.5 11.7 16 12.8 15.4 13.8 L14 15.2 M11.2 13.6 a0.7 0.7 0 1 0 0.01 0 M14 15.5 C17 15 19.5 16.5 20 19.5 C20.4 22 22.5 23 24.3 21.8 C26 20.7 25.7 17.7 23.7 17.6 C22 17.5 21.3 19.5 22.6 20.6', // Makara sea-goat
  'M16 9.5 a1.7 1.7 0 1 0 0.01 0 Z M13 12.5 H19 L18 18 H14 Z M12.5 14.5 L9.5 16.5 M19.5 14.5 L22.5 16.5 M8 21 Q10 19 12 21 Q14 23 16 21 Q18 19 20 21 Q22 23 24 21 M8 24 Q10 22 12 24 Q14 26 16 24 Q18 22 20 24 Q22 26 24 24', // Kumbha water-bearer
  'M9 11 Q13 8 16 11 Q13 14 9 11 Z M9 11 L5.5 8 L6 14 Z M23 11 Q19 8 16 11 Q19 14 23 11 Z M23 11 L26.5 8 L26 14 Z M14 21 Q18 18 21 21 Q18 24 14 21 Z M14 21 L10.5 18 L11 24 Z M16 11 V21', // Meena fishes
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
