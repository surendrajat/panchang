// activeDashaIndex — the "which mahadasha is running at instant X" selector.
// Boundary-focused (start inclusive, end exclusive, outside → -1), the kind of
// off-by-one logic that needs a test. Structural, so no external reference.
import { describe, it, expect } from 'vitest';
import { vimshottariMahadashas, activeDashaIndex } from '$lib/jyotish/dasha';

describe('activeDashaIndex', () => {
  const periods = vimshottariMahadashas(new Date('2000-01-01T00:00:00Z'), 45);

  it('builds nine contiguous mahadashas', () => {
    expect(periods).toHaveLength(9);
    for (let i = 1; i < periods.length; i++) {
      expect(periods[i].start.getTime()).toBe(periods[i - 1].end.getTime());
    }
  });

  it('returns the period containing the instant', () => {
    const mid = new Date((periods[2].start.getTime() + periods[2].end.getTime()) / 2);
    expect(activeDashaIndex(periods, mid)).toBe(2);
  });

  it('is start-inclusive and end-exclusive at a boundary', () => {
    expect(activeDashaIndex(periods, periods[3].start)).toBe(3);
    // the shared instant belongs to the NEXT period, not the one that just ended
    expect(activeDashaIndex(periods, periods[3].end)).toBe(4);
  });

  it('returns -1 outside the 120-year cycle', () => {
    expect(activeDashaIndex(periods, new Date(periods[0].start.getTime() - 86_400_000))).toBe(-1);
    expect(activeDashaIndex(periods, new Date(periods[8].end.getTime() + 86_400_000))).toBe(-1);
  });
});
