// Ritu (six seasons). Each ritu spans two solar months.
//
// Mapping by Sun's sidereal sign at the anchor instant:
//   Mesha (0), Vrishabha (1)  → Vasanta (spring)
//   Mithuna (2), Karka (3)    → Grishma (summer)
//   Simha (4), Kanya (5)      → Varsha (monsoon)
//   Tula (6), Vrishchika (7)  → Sharad (autumn)
//   Dhanu (8), Makara (9)     → Hemanta (pre-winter)
//   Kumbha (10), Meena (11)   → Shishira (winter)

import type { Ritu } from './types';

const RITUS: readonly Ritu[] = ['vasanta', 'grishma', 'varsha', 'sharad', 'hemanta', 'shishira'];

export function rituFromSunSiderealSign(sign: number): Ritu {
  const s = ((sign % 12) + 12) % 12;
  return RITUS[Math.floor(s / 2)];
}
