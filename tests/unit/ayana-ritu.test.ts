// Unit tests for ayanaFromSunSiderealSign() and rituFromSunSiderealSign().

import { describe, expect, it } from 'vitest';
import { ayanaFromSunSiderealSign } from '$lib/panchanga/ayana';
import { rituFromSunSiderealSign } from '$lib/panchanga/ritu';
import { computePanchanga } from '$lib/panchanga';
import { DELHI } from '../helpers';

describe('ayanaFromSunSiderealSign', () => {
  it('Uttarayana: signs 9..11 and 0..2 (Makara → Mithuna)', () => {
    for (const s of [9, 10, 11, 0, 1, 2]) {
      expect(ayanaFromSunSiderealSign(s)).toBe('uttarayana');
    }
  });

  it('Dakshinayana: signs 3..8 (Karka → Dhanu)', () => {
    for (const s of [3, 4, 5, 6, 7, 8]) {
      expect(ayanaFromSunSiderealSign(s)).toBe('dakshinayana');
    }
  });

  it('handles modular sign inputs (>11, <0)', () => {
    expect(ayanaFromSunSiderealSign(12)).toBe('uttarayana'); // = 0 Mesha
    expect(ayanaFromSunSiderealSign(-1)).toBe('uttarayana'); // = 11 Meena
    expect(ayanaFromSunSiderealSign(15)).toBe('dakshinayana'); // = 3 Karka
  });

  it('mid-January is Uttarayana (Sun firmly in Makara)', () => {
    // Sun enters Makara (sidereal) around Jan 15; Jan 20 is safely inside.
    const p = computePanchanga(new Date('2026-01-20T06:00:00+05:30'), DELHI);
    expect(p.ayana).toBe('uttarayana');
  });

  it('August is Dakshinayana (Sun in Simha)', () => {
    // Sun enters Karka (sign 3) around July 16-17 sidereal; August is firmly inside.
    const p = computePanchanga(new Date('2026-08-01T06:00:00+05:30'), DELHI);
    expect(p.ayana).toBe('dakshinayana');
  });

  it('boundary between Mithuna (2) and Karka (3) flips ayana', () => {
    expect(ayanaFromSunSiderealSign(2)).toBe('uttarayana');
    expect(ayanaFromSunSiderealSign(3)).toBe('dakshinayana');
  });
});

describe('rituFromSunSiderealSign', () => {
  // Each ritu covers 2 signs
  const TABLE: [number[], string][] = [
    [[0, 1], 'vasanta'], // Mesha, Vrishabha
    [[2, 3], 'grishma'], // Mithuna, Karka
    [[4, 5], 'varsha'], // Simha, Kanya
    [[6, 7], 'sharad'], // Tula, Vrishchika
    [[8, 9], 'hemanta'], // Dhanu, Makara
    [[10, 11], 'shishira'], // Kumbha, Meena
  ];

  for (const [signs, ritu] of TABLE) {
    it(`signs ${signs.join(',')} → ${ritu}`, () => {
      for (const s of signs) {
        expect(rituFromSunSiderealSign(s)).toBe(ritu);
      }
    });
  }

  it('handles modular inputs (>11, <0)', () => {
    expect(rituFromSunSiderealSign(12)).toBe('vasanta'); // = 0
    expect(rituFromSunSiderealSign(-1)).toBe('shishira'); // = 11
    expect(rituFromSunSiderealSign(24)).toBe('vasanta'); // = 0
  });

  it('all 6 ritu values appear over a solar year', () => {
    const seen = new Set<string>();
    // Sample every 2 signs = 6 samples covers all ritus
    for (let s = 0; s < 12; s++) {
      seen.add(rituFromSunSiderealSign(s));
    }
    expect(seen.size).toBe(6);
  });

  it('computePanchanga exposes a known ritu (Vasanta), consistent with standalone call', () => {
    // Independently known: 2026-05-20 → Sun in sidereal Vrishabha (sign 1) → Vasanta.
    const p = computePanchanga(new Date('2026-05-20T06:00:00+05:30'), DELHI);
    expect(p.solar.sign).toBe(1);
    expect(p.ritu).toBe('vasanta');
    expect(p.ritu).toBe(rituFromSunSiderealSign(p.solar.sign));
  });
});
