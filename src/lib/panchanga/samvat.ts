// Samvat: traditional year-numbering systems used alongside the Gregorian
// year. We compute three of the major ones and the 60-year Jovian cycle
// (Samvatsara) name.
//
// Offsets are based on Chaitra Shukla Pratipada, the lunisolar new
// year used for the Vikrama/Shaka display:
//   before Chaitra new year: Vikrama = Gregorian + 56, Shaka = Gregorian - 79
//   after Chaitra new year : Vikrama = Gregorian + 57, Shaka = Gregorian - 78
//   Kali Yuga follows the same boundary: +3101 before, +3102 after.
//
// In Drik Panchang's display, Vikrama and Shaka years switch on Chaitra
// Shukla 1 (Gudi Padwa). The compute layer decides whether today's
// sunrise-anchored panchanga has crossed that lunar boundary.

import { SAMVATSARA_NAMES } from './names';
import type { SamvatInfo } from './types';

export function computeSamvat(year: number, afterChaitraNewYear: boolean): SamvatInfo {
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
