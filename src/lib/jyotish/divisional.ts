// Divisional (varga) charts. The most important is the Navamsa (D9), used
// especially for marriage and the deeper strength of a placement.
//
// Each rashi (30°) is split into nine navamsas of 3°20′, so the whole zodiac
// is 108 navamsas. They map cyclically onto the twelve signs: navamsa k
// (0-based, over the whole circle) falls in sign (k mod 12). This single
// formula already encodes the classical movable/fixed/dual starting rule —
// e.g. a movable sign's navamsas start from itself, a fixed sign's from the
// 9th, a dual sign's from the 5th.

const NAVAMSA_ARC = 30 / 9; // 3°20′

// Navamsa (D9) sign 0..11 for a sidereal ecliptic longitude.
export function navamsaSign(siderealLongitude: number): number {
  const lon = ((siderealLongitude % 360) + 360) % 360;
  return Math.floor(lon / NAVAMSA_ARC) % 12;
}
