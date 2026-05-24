import { describe, it, expect } from 'vitest';
import { computePanchanga } from '$lib/panchanga';
import { BENGALURU } from '../helpers';

describe('tithi computation', () => {
  it('Krishna Janmashtami 2024 falls on 26 August at Bengaluru', () => {
    const p = computePanchanga(new Date('2024-08-26T06:00:00+05:30'), BENGALURU);
    expect(p.tithi.paksha).toBe('krishna');
    expect(p.tithi.number).toBe(8);
    expect(p.tithi.name).toBe('Ashtami');
    expect(p.festivals).toContain('krishna_janmashtami');
  });

  it('Amavasya = tithi 30', () => {
    const p = computePanchanga(new Date('2024-11-01T06:00:00+05:30'), BENGALURU);
    expect(p.tithi.index).toBe(30);
    expect(p.tithi.paksha).toBe('krishna');
    expect(p.tithi.name).toBe('Amavasya');
  });

  it('Purnima = tithi 15, shukla', () => {
    const p = computePanchanga(new Date('2025-03-14T06:00:00+05:30'), BENGALURU);
    expect(p.tithi.index).toBe(15);
    expect(p.tithi.paksha).toBe('shukla');
    expect(p.tithi.name).toBe('Purnima');
  });

  it('end-time is monotone increasing within a day window', () => {
    const p = computePanchanga(new Date('2026-05-20T06:00:00+05:30'), BENGALURU);
    const anchor = p.sunrise!.getTime();
    expect(p.tithi.endTime.getTime()).toBeGreaterThan(anchor);
    expect(p.tithi.endTime.getTime() - anchor).toBeLessThan(30 * 3600_000);
  });

  it('tithi fraction is in [0, 1)', () => {
    const p = computePanchanga(new Date('2025-06-15T06:00:00+05:30'), BENGALURU);
    expect(p.tithi.fraction).toBeGreaterThanOrEqual(0);
    expect(p.tithi.fraction).toBeLessThan(1);
  });
});
