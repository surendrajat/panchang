import { describe, it, expect } from 'vitest';
import { tithiIndexFromElongation } from '$lib/jyotish/sky-math';

describe('tithiIndexFromElongation', () => {
  it('maps the Sun→Moon elongation to tithi 1..30', () => {
    expect(tithiIndexFromElongation(0)).toBe(1);
    expect(tithiIndexFromElongation(11.9)).toBe(1);
    expect(tithiIndexFromElongation(12)).toBe(2);
    expect(tithiIndexFromElongation(180)).toBe(16); // Purnima boundary
    expect(tithiIndexFromElongation(354)).toBe(30); // Amavasya
  });
});
