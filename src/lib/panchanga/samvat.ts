// Samvat: traditional year-numbering systems used alongside the Gregorian
// year. We compute three of the major ones and the 60-year Jovian cycle
// (Samvatsara) name.
//
// Offsets are based on the Chaitra-shukla-pratipada new-year (the start
// of the Hindu lunisolar year), which falls in March/April Gregorian:
//   Vikrama Samvat = Gregorian + 57 (before Chaitra) or +56 (after)
//   Shaka Samvat   = Gregorian - 78 (before Chaitra) or -78 (after)... actually:
//     Shaka = Gregorian - 78 (before Chaitra start in March) or -78
//     We use: Shaka = Gregorian - 78 (whole year, since shaka new year is
//     Chaitra shukla 1 ≈ late March)
//   Kali Yuga (Kaliyuga) Era = Gregorian + 3101 (before Chaitra) or +3102 (after)
//
// In Drik Panchang's display, Vikrama and Shaka years switch on Chaitra
// shukla 1 (Gudi Padwa). We approximate "after Chaitra" with Gregorian
// month >= 4 (mid-March onward is close enough until we want exactness
// to the minute; a future revision can use the actual Chaitra shukla 1
// instant as the boundary).

import { SAMVATSARA_NAMES } from './names';
import type { SamvatInfo } from './types';

export function computeSamvat(year: number, gregorianMonth: number): SamvatInfo {
  // gregorianMonth is 1..12. Chaitra shukla 1 is approximately mid-March
  // (Gregorian month 3 or early 4). We treat April onward as "after new
  // year"; this matches the standard Drik display within a 2-3 week window
  // around the actual boundary.
  const afterChaitraNewYear = gregorianMonth >= 4;

  const vikrama = afterChaitraNewYear ? year + 57 : year + 56;
  const shaka = afterChaitraNewYear ? year - 78 : year - 79;
  const kali = afterChaitraNewYear ? year + 3102 : year + 3101;
  const yearName = samvatsaraName(vikrama);

  return { vikrama, shaka, kali, yearName };
}

// 60-year Jovian cycle name. The cycle is anchored such that
// Vikrama Samvat 1989 (Gregorian 1932-33) was Angirasa (index 5).
// Equivalently: Samvatsara index = (vikrama - 1984) mod 60.
//   Vikrama 1984 → Prabhava (index 0).
function samvatsaraName(vikrama: number): string {
  const idx = (((vikrama - 1984) % 60) + 60) % 60;
  return SAMVATSARA_NAMES[idx];
}
