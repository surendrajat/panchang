// Pure helpers for the Sky wheel, extracted from the Svelte component so they
// can be unit-tested independently of the DOM.

/** Tithi index 1..30 from the Sun→Moon elongation in degrees (0..360). */
export function tithiIndexFromElongation(elongDeg: number): number {
  return Math.floor(elongDeg / 12) + 1;
}

/**
 * Radial "tier" per body for the wheel, given their ecliptic longitudes sorted
 * ascending. A body within `sepDeg` of the previous one steps to a deeper tier,
 * so a conjunction (the inner planets crowding the Sun) spreads out radially
 * instead of overlapping into a mash. Returns one tier (0, 1, 2, …) per input;
 * the 0°/360° wrap is treated as adjacent.
 */
export function clusterTiers(sortedLonsAsc: number[], sepDeg = 12): number[] {
  let tier = 0;
  return sortedLonsAsc.map((lon, i) => {
    if (i === 0) return (tier = 0);
    const d = Math.abs(lon - sortedLonsAsc[i - 1]);
    const sep = Math.min(d, 360 - d);
    tier = sep < sepDeg ? tier + 1 : 0;
    return tier;
  });
}
