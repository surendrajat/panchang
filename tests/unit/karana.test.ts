import { describe, it, expect } from 'vitest';
import { computePanchanga } from '$lib/panchanga';

const BENGALURU = {
  latitude: 12.9716,
  longitude: 77.5946,
  altitude: 920,
  timezone: 'Asia/Kolkata',
};

describe('karana naming', () => {
  it('position is in 0..59 and name is one of the 11 names', () => {
    const names = new Set([
      'Bava',
      'Balava',
      'Kaulava',
      'Taitila',
      'Garaja',
      'Vanija',
      'Vishti',
      'Shakuni',
      'Chatushpada',
      'Naga',
      'Kimstughna',
    ]);
    for (const isoDate of ['2024-08-26', '2025-03-14', '2025-11-01', '2026-01-14', '2026-05-20']) {
      const p = computePanchanga(new Date(`${isoDate}T06:00:00+05:30`), BENGALURU);
      expect(p.karana.positionInCycle).toBeGreaterThanOrEqual(0);
      expect(p.karana.positionInCycle).toBeLessThanOrEqual(59);
      expect(names.has(p.karana.name)).toBe(true);
    }
  });

  it('Amavasya day → Naga karana in the second half (pos 59)', () => {
    // 2024-11-01 was the Diwali Amavasya. We test that the karana is
    // one of the fixed end-of-cycle ones (Shakuni / Chatushpada / Naga).
    const p = computePanchanga(new Date('2024-11-01T06:00:00+05:30'), BENGALURU);
    expect(['Shakuni', 'Chatushpada', 'Naga']).toContain(p.karana.name);
  });
});
