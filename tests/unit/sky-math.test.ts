import { describe, it, expect } from 'vitest';
import { tithiIndexFromElongation, clusterTiers } from '$lib/jyotish/sky-math';

describe('tithiIndexFromElongation', () => {
  it('maps the Sun→Moon elongation to tithi 1..30', () => {
    expect(tithiIndexFromElongation(0)).toBe(1);
    expect(tithiIndexFromElongation(11.9)).toBe(1);
    expect(tithiIndexFromElongation(12)).toBe(2);
    expect(tithiIndexFromElongation(180)).toBe(16); // Purnima boundary
    expect(tithiIndexFromElongation(354)).toBe(30); // Amavasya
  });
});

describe('clusterTiers', () => {
  it('keeps well-separated bodies at tier 0', () => {
    expect(clusterTiers([10, 100, 200])).toEqual([0, 0, 0]);
  });
  it('steps a tight conjunction onto deeper tiers', () => {
    expect(clusterTiers([60, 65, 70])).toEqual([0, 1, 2]);
  });
  it('resets the tier once a gap opens', () => {
    expect(clusterTiers([60, 65, 200])).toEqual([0, 1, 0]);
  });
  it('treats the 0°/360° wrap as adjacent', () => {
    expect(clusterTiers([2, 359])).toEqual([0, 1]); // 3° apart across the wrap
  });
  it('returns one tier per body', () => {
    expect(clusterTiers([1, 2, 3, 4, 5, 6, 7])).toHaveLength(7);
  });
});
