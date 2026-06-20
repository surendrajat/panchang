// Hindu-style pictorial icons for the twelve rashis, drawn on a 0 0 32 32 grid
// as stroke paths (ram, bull, twins, crab, lion, maiden, scales, scorpion, bow,
// makara, water-pot, fishes). Rendered with currentColor + round caps. Paired
// with the element each rashi belongs to, for the tap-to-learn card.

export const RASHI_ICON_PATHS: readonly (readonly string[])[] = [
  // Mesha — ram
  ['M16 21V13', 'M16 13C16 7 10 6 8 10 8.5 13 11.5 13 12 10', 'M16 13C16 7 22 6 24 10 23.5 13 20.5 13 20 10'],
  // Vrishabha — bull
  ['M16 16m-6 0a6 6 0 1 0 12 0 6 6 0 1 0-12 0', 'M9 8C11 12 13 13 16 13 19 13 21 12 23 8'],
  // Mithuna — twins
  ['M12 9a2 2 0 1 0 .1 0', 'M12 11v9M9 14h6', 'M20 9a2 2 0 1 0 .1 0', 'M20 11v9M17 14h6'],
  // Karka — crab
  ['M16 19m-6 0a6 5 0 1 0 12 0 6 5 0 1 0-12 0', 'M11 16 7 12M7 12 5 13M7 12 8 10', 'M21 16 25 12M25 12 27 13M25 12 24 10', 'M12 23 10 26M20 23 22 26'],
  // Simha — lion
  ['M16 18m-4 0a4 4 0 1 0 8 0 4 4 0 1 0-8 0', 'M12.5 14.5 11 10.5 15 13M19.5 14.5 21 10.5 17 13', 'M9 18C6.5 16 6.5 13 8 12M23 18C25.5 16 25.5 13 24 12', 'M16 18 15 19.5h2zM14.5 19.5C15.3 20.6 16.7 20.6 17.5 19.5'],
  // Kanya — maiden
  ['M16 8a2.5 2.5 0 1 0 .1 0', 'M16 11 11 25h10z', 'M11 17h10'],
  // Tula — scales
  ['M16 6v4', 'M7 10h18', 'M16 10V8', 'M7 10 5 15h4z', 'M25 10 23 15h4z'],
  // Vrishchika — scorpion
  ['M6 16h11', 'M17 16c4 0 6-2 6-5 0-2-2-3-3-1', 'M6 16 4 13M6 16 4 19'],
  // Dhanu — bow & arrow
  ['M9 24C5 20 5 13 9 9', 'M7 23 25 7M25 7 19 8M25 7 24 13'],
  // Makara — makara (crocodile)
  ['M5 17C9 14 16 13 21 15', 'M5 17C7 19 14 19 20 17.5', 'M21 15 26 13M20 17.5 25 17M26 13C24.5 14 24.5 16 25 17', 'M9 15 8 13M12 15 11 13M15 15 14 13', 'M5 17 3 15M5 17 3 18.5'],
  // Kumbha — water pot
  ['M12 9h8', 'M13 9C11.5 11 11 13 11 15 11 18 13 20 16 20 19 20 21 18 21 15 21 13 20.5 11 19 9', 'M11 23q2.5-2 5 0 2.5 2 5 0', 'M12 26q2-1.5 4 0 2 1.5 4 0'],
  // Meena — fishes
  ['M7 11Q12 7 17 11 12 15 7 11M17 11 20 8M17 11 20 14', 'M7 21Q12 17 17 21 12 25 7 21M17 21 20 18M17 21 20 24'],
];

// Bold alternative: the same twelve signs as solid filled silhouettes (one
// path each, fill=currentColor). Switchable in the sky page so the look can be
// chosen by eye against the line set above.
export const RASHI_ICON_FILLED: readonly string[] = [
  'M9 8C6 9 6 13 9 13 8 11 10 11 11 13L11 11C11 8 14 8 16 12 18 8 21 8 21 11L21 13C22 11 24 11 23 13 26 13 26 9 23 8 20 7 17 9 16 11 15 9 12 7 9 8ZM14.5 11.5H17.5L16.5 22H15.5Z', // Mesha
  'M16 13a5.5 5.5 0 1 0 0.01 0ZM8 6C10 10 13 11 16 11 19 11 22 10 24 6 23 9.5 21 11 16 11 11 11 9 9.5 8 6Z', // Vrishabha
  'M10.5 7a2 2 0 1 0 .01 0ZM9.5 11h2v10h-2zM21.5 7a2 2 0 1 0 .01 0ZM20.5 11h2v10h-2zM9.5 14.5h13v2h-13z', // Mithuna
  'M16 14a6.5 4.5 0 1 0 .01 0ZM8 9C6 11 6 13 8.5 14.5L9.5 12.5C8.5 11.5 9.5 10.5 10.5 11.5ZM24 9C26 11 26 13 23.5 14.5L22.5 12.5C23.5 11.5 22.5 10.5 21.5 11.5Z', // Karka
  'M16 14.5a4 4 0 1 0 .01 0ZM12 10.5 13 13.5 15.5 12.5ZM20 10.5 19 13.5 16.5 12.5ZM20.5 20C23.5 20 24.5 16.5 22 15 23.5 17 21 18.5 20 17Z', // Simha
  'M16 8a2.2 2.2 0 1 0 .01 0ZM16 11.5 11.5 24.5H20.5Z', // Kanya
  'M15.2 6H16.8V11.5H15.2ZM6 11H26V12.6H6ZM6 12.4 4 16.5H8ZM26 12.4 24 16.5H28Z', // Tula
  'M6 17a4 2.5 0 1 0 0.01 0ZM9 14.6C16 14.6 20 13 20 10L22 10.5 20.5 8 19 11 20 11.6C20 12.8 16 13.2 10 13.2Z', // Vrishchika
  'M23 9 15.5 9 17.5 11 9 19.5 11.5 22 20 13.5 22 15.5Z', // Dhanu
  'M5 17C9 14 15 14 19 15.5L19 13.5 22.5 12.5 20 16C21 17 20 18.2 19 17.6 15 19 9 19 5 17Z', // Makara
  'M12 9h8v1.5h-8zM13.5 10.5C12.5 13 12 17 16 18.5 20 17 19.5 13 18.5 10.5ZM11 22.5Q16 20.5 21 22.5L21 24.5Q16 22.5 11 24.5Z', // Kumbha
  'M8 11Q12 7.5 16 11 12 14.5 8 11ZM16 11 19 8.5 19 13.5ZM8 20Q12 16.5 16 20 12 23.5 8 20ZM16 20 19 17.5 19 22.5Z', // Meena
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
