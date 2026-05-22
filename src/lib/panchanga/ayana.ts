// Ayana: the half-year direction of the Sun's apparent motion.
//
// Uttarayana: Sun moving north (winter solstice → summer solstice)
// Dakshinayana: Sun moving south (summer solstice → winter solstice)
//
// Sidereal definition (used in Hindu astronomy): Uttarayana starts when
// the Sun enters Makara (sidereal Capricorn, sign 9) — Makara Sankranti.
// This currently falls around January 14 (Gregorian) due to ayanamsa.
// Sun then crosses six signs (Makara through Mithuna, signs 9..2) during
// Uttarayana, and the other six (Karka through Dhanu, signs 3..8) during
// Dakshinayana.

export type Ayana = 'uttarayana' | 'dakshinayana';

export function ayanaFromSunSiderealSign(sign: number): Ayana {
  const s = ((sign % 12) + 12) % 12;
  // Uttarayana: signs 9, 10, 11, 0, 1, 2 (Makara → Mithuna)
  // Dakshinayana: signs 3, 4, 5, 6, 7, 8 (Karka → Dhanu)
  if (s >= 3 && s <= 8) return 'dakshinayana';
  return 'uttarayana';
}
