import { describe, it, expect } from 'vitest';
import { nameSyllable, nakshatraSyllables, computeBirthChart } from '$lib/jyotish';
import { DELHI } from '../helpers';

describe('Naamakshar — name syllable by nakshatra + pada', () => {
  it('table has 27 nakshatras × 4 padas', () => {
    for (let n = 1; n <= 27; n++) {
      expect(nakshatraSyllables(n)).toHaveLength(4);
    }
  });

  it('unambiguous anchors match the standard table', () => {
    expect(nakshatraSyllables(1)).toEqual(['Chu', 'Che', 'Cho', 'La']); // Ashwini
    expect(nakshatraSyllables(3)).toEqual(['A', 'I', 'U', 'E']); // Krittika
    expect(nakshatraSyllables(4)).toEqual(['O', 'Va', 'Vi', 'Vu']); // Rohini
    expect(nakshatraSyllables(10)).toEqual(['Ma', 'Mi', 'Mu', 'Me']); // Magha
    expect(nakshatraSyllables(27)).toEqual(['De', 'Do', 'Cha', 'Chi']); // Revati
  });

  it('nameSyllable indexes nakshatra and pada correctly', () => {
    expect(nameSyllable(1, 1)).toBe('Chu');
    expect(nameSyllable(1, 3)).toBe('Cho');
    expect(nameSyllable(10, 4)).toBe('Me');
  });

  it('every syllable is a non-empty short string', () => {
    for (let n = 1; n <= 27; n++) {
      for (const p of [1, 2, 3, 4] as const) {
        const s = nameSyllable(n, p);
        expect(s.length).toBeGreaterThan(0);
        expect(s.length).toBeLessThanOrEqual(4);
      }
    }
  });

  it('derives from the chart Moon: 1990-08-15 → Rohini → one of O/Va/Vi/Vu', () => {
    const chart = computeBirthChart(new Date('1990-08-15T10:30:00+05:30'), DELHI, true);
    expect(chart.moonNakshatra.index).toBe(4); // Rohini (verified elsewhere)
    const s = nameSyllable(chart.moonNakshatra.index, chart.moonNakshatra.pada);
    expect(['O', 'Va', 'Vi', 'Vu']).toContain(s);
  });
});
