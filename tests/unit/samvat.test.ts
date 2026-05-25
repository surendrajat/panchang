import { describe, expect, it } from 'vitest';
import { computePanchanga } from '$lib/panchanga';
import { computeSamvat } from '$lib/panchanga/samvat';
import { SAMVATSARA_NAMES } from '$lib/panchanga/names';
import { DELHI } from '../helpers';

describe('Samvat year boundary', () => {
  it('stays in the old Vikrama/Shaka year in early March', () => {
    const p = computePanchanga(new Date('2024-03-01T00:00:00+05:30'), DELHI);
    expect(p.samvat.vikrama).toBe(2080);
    expect(p.samvat.shaka).toBe(1945);
  });

  it('does not roll Vikrama/Shaka early before Chaitra Shukla Pratipada', () => {
    const p = computePanchanga(new Date('2024-04-08T00:00:00+05:30'), DELHI);
    expect(p.masa.amantaName).toBe('Phalguna');
    expect(p.samvat.vikrama).toBe(2080);
    expect(p.samvat.shaka).toBe(1945);
  });

  it('rolls Vikrama/Shaka on Chaitra Shukla Pratipada', () => {
    const p = computePanchanga(new Date('2024-04-09T00:00:00+05:30'), DELHI);
    expect(p.masa.amantaName).toBe('Chaitra');
    expect(p.samvat.vikrama).toBe(2081);
    expect(p.samvat.shaka).toBe(1946);
  });

  it('Kali Yuga increments correctly at the same boundary', () => {
    const before = computePanchanga(new Date('2024-04-08T00:00:00+05:30'), DELHI);
    const after = computePanchanga(new Date('2024-04-09T00:00:00+05:30'), DELHI);
    expect(after.samvat.kali).toBe(before.samvat.kali + 1);
  });

  it('Vikrama = Gregorian + 57 after Chaitra new year', () => {
    // 2026 after Chaitra Shukla 1 (≈ Apr 20 in 2026)
    const p = computePanchanga(new Date('2026-05-01T06:00:00+05:30'), DELHI);
    expect(p.samvat.vikrama).toBe(2026 + 57);
    expect(p.samvat.shaka).toBe(2026 - 78);
  });

  it('yearName is one of the 60 Samvatsara names', () => {
    const p = computePanchanga(new Date('2026-05-01T06:00:00+05:30'), DELHI);
    expect(SAMVATSARA_NAMES).toContain(p.samvat.yearName);
  });

  it('computeSamvat offsets are correct for before/after boundary', () => {
    const before = computeSamvat(2024, false);
    const after = computeSamvat(2024, true);
    expect(before.vikrama).toBe(2080);
    expect(after.vikrama).toBe(2081);
    expect(before.shaka).toBe(1945);
    expect(after.shaka).toBe(1946);
    expect(before.kali).toBe(5125);
    expect(after.kali).toBe(5126);
  });

  it('all 60 Samvatsara names are representable', () => {
    // Cycle through 60 years; each should produce a distinct name
    const seen = new Set<string>();
    for (let y = 2000; y < 2060; y++) {
      const s = computeSamvat(y, true);
      if (s.yearName) seen.add(s.yearName);
    }
    expect(seen.size).toBe(60);
  });
});
