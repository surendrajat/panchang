// Pure helpers for the Sky wheel, extracted from the Svelte component so they
// can be unit-tested independently of the DOM.

/** Tithi index 1..30 from the Sun→Moon elongation in degrees (0..360). */
export function tithiIndexFromElongation(elongDeg: number): number {
  return Math.floor(elongDeg / 12) + 1;
}
