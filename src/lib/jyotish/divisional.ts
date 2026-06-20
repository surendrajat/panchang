// Navamsa (D9): each rashi split into nine 3°20′ parts, 108 over the zodiac,
// mapped cyclically to the signs. Indexing mod 12 encodes the classical
// movable/fixed/dual starting rule automatically.
import { norm360 } from '$lib/astro';

const NAVAMSA_ARC = 30 / 9; // 3°20′

// Navamsa (D9) sign 0..11 for a sidereal ecliptic longitude.
export function navamsaSign(siderealLongitude: number): number {
  return Math.floor(norm360(siderealLongitude) / NAVAMSA_ARC) % 12;
}
