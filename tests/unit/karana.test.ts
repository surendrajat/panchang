import { describe, it, expect } from 'vitest';
import { computePanchanga } from '$lib/panchanga';
import { karanaSequenceForDay } from '$lib/panchanga/karana';
import { BENGALURU } from '../helpers';

const ALL_KARANA_NAMES = new Set([
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

describe('karana naming', () => {
  it('position is in 0..59 and name is one of the 11 names', () => {
    for (const isoDate of ['2024-08-26', '2025-03-14', '2025-11-01', '2026-01-14', '2026-05-20']) {
      const p = computePanchanga(new Date(`${isoDate}T06:00:00+05:30`), BENGALURU);
      expect(p.karana.positionInCycle).toBeGreaterThanOrEqual(0);
      expect(p.karana.positionInCycle).toBeLessThanOrEqual(59);
      expect(ALL_KARANA_NAMES.has(p.karana.name)).toBe(true);
    }
  });

  it('Amavasya day → fixed karana (Shakuni / Chatushpada / Naga)', () => {
    // 2024-11-01 was the Diwali Amavasya
    const p = computePanchanga(new Date('2024-11-01T06:00:00+05:30'), BENGALURU);
    expect(['Shakuni', 'Chatushpada', 'Naga']).toContain(p.karana.name);
  });

  it('fraction is in [0, 1)', () => {
    for (const isoDate of ['2024-08-26', '2025-06-15', '2026-05-20']) {
      const p = computePanchanga(new Date(`${isoDate}T06:00:00+05:30`), BENGALURU);
      expect(p.karana.fraction).toBeGreaterThanOrEqual(0);
      expect(p.karana.fraction).toBeLessThan(1);
    }
  });
});

describe('karana sequence — 2-4 per day invariant', () => {
  it('holds for every day of 2026 (year sweep)', () => {
    // A karana is ~12h, so a 24h day contains 2–3 transitions = 2–4 karanas.
    const start = new Date('2026-01-01T01:00:00Z'); // ~06:30 IST
    for (let d = 0; d < 365; d++) {
      const anchor = new Date(start.getTime() + d * 86400_000);
      const seq = karanaSequenceForDay(anchor);
      expect(
        seq.length,
        `Day +${d}: expected 2-4 karanas but got ${seq.length}`,
      ).toBeGreaterThanOrEqual(2);
      expect(
        seq.length,
        `Day +${d}: expected 2-4 karanas but got ${seq.length}`,
      ).toBeLessThanOrEqual(4);
    }
  });

  it('all 11 karana names appear across a synodic month', () => {
    const seen = new Set<string>();
    const start = new Date('2026-04-01T01:00:00Z');
    for (let d = 0; d < 30; d++) {
      const anchor = new Date(start.getTime() + d * 86400_000);
      for (const k of karanaSequenceForDay(anchor)) {
        seen.add(k.name);
      }
    }
    expect(seen.size).toBe(11);
  });
});
