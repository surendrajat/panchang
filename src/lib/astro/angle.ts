// Normalize an angle in degrees to the range [0, 360).
//
// This single helper replaces the `((x % 360) + 360) % 360` idiom that was
// hand-inlined across the astro, panchanga, and jyotish layers. (For the
// common "tropical longitude minus ayanamsa" case, prefer
// `siderealFromTropical` in ayanamsa.ts, which wraps this.)
export function norm360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}
