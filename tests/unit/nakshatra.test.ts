import { describe, it, expect } from 'vitest';
import { computePanchanga } from '$lib/panchanga';
import { BENGALURU } from '../helpers';

describe('nakshatra computation', () => {
  it('index is in 1..27 and pada in 1..4', () => {
    for (const isoDate of ['2024-01-15', '2024-08-26', '2025-03-14', '2025-11-01', '2026-05-20']) {
      const p = computePanchanga(new Date(`${isoDate}T06:00:00+05:30`), BENGALURU);
      expect(p.nakshatra.index).toBeGreaterThanOrEqual(1);
      expect(p.nakshatra.index).toBeLessThanOrEqual(27);
      expect(p.nakshatra.pada).toBeGreaterThanOrEqual(1);
      expect(p.nakshatra.pada).toBeLessThanOrEqual(4);
    }
  });

  it('nakshatra end-time is within ~24 hours of anchor', () => {
    const p = computePanchanga(new Date('2026-05-20T06:00:00+05:30'), BENGALURU);
    const anchor = p.sunrise!.getTime();
    const dt = p.nakshatra.endTime.getTime() - anchor;
    expect(dt).toBeGreaterThan(0);
    expect(dt).toBeLessThan(28 * 3600_000);
  });
});
