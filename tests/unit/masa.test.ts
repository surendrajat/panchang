import { describe, it, expect } from 'vitest';
import { computePanchanga } from '$lib/panchanga';
import { BENGALURU } from '../helpers';

describe('masa (lunar month) detection', () => {
  it('Adhik Maas detected in 2026 (Jyeshtha Adhika)', () => {
    // ARCHITECTURE.md §12 calls out Jyeshtha 2026 as a known adhik case.
    // Drik Panchang lists Adhika Jyeshtha from May 17 to June 15, 2026.
    const p = computePanchanga(new Date('2026-05-20T06:00:00+05:30'), BENGALURU);
    expect(p.masa.isAdhika).toBe(true);
    expect(p.masa.name).toBe('Jyeshtha');
  });

  it('Adhik Maas detected in 2023 (Shravana Adhika)', () => {
    // 2023 Adhika Shravana: Jul 18 – Aug 16.
    const p = computePanchanga(new Date('2023-08-01T06:00:00+05:30'), BENGALURU);
    expect(p.masa.isAdhika).toBe(true);
    expect(p.masa.name).toBe('Shravana');
  });

  it('Normal month outside the adhik window', () => {
    const p = computePanchanga(new Date('2024-05-20T06:00:00+05:30'), BENGALURU);
    expect(p.masa.isAdhika).toBe(false);
  });

  it('Purnimanta shifts Krishna paksha to the next month name', () => {
    // 2024-04-23 was Vaishakha Krishna Pratipada (Amanta). In Purnimanta
    // the same Krishna paksha day is named Jyeshtha.
    const date = new Date('2024-04-25T06:00:00+05:30');
    const amanta = computePanchanga(date, BENGALURU, { monthSystem: 'amanta' });
    const purnimanta = computePanchanga(date, BENGALURU, { monthSystem: 'purnimanta' });

    expect(amanta.paksha).toBe('krishna');
    expect(purnimanta.paksha).toBe('krishna');

    // The Amanta name and Purnimanta name should differ by exactly one
    // position in the canonical month order.
    if (amanta.paksha === 'krishna') {
      const amantaIdx = amanta.masa.index;
      const expectedPurn = (amantaIdx % 12) + 1;
      expect(purnimanta.masa.index).toBe(expectedPurn);
    }
  });
});
