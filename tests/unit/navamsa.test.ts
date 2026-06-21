import { describe, it, expect } from 'vitest';
import { navamsaSign, computeBirthChart } from '$lib/jyotish';
import { DELHI } from '../helpers';

describe('Navamsa (D9) sign derivation', () => {
  it('encodes the classical movable / fixed / dual starting rule', () => {
    // Movable (Aries): navamsas start from itself → Aries … Sagittarius.
    expect(navamsaSign(0)).toBe(0); // 0° Aries → Aries
    expect(navamsaSign(29.99)).toBe(8); // last navamsa of Aries → Sagittarius
    // Fixed (Taurus): starts from the 9th → Capricorn.
    expect(navamsaSign(30)).toBe(9); // 0° Taurus → Capricorn
    // Dual (Gemini): starts from the 5th → Libra.
    expect(navamsaSign(60)).toBe(6); // 0° Gemini → Libra
    // Dual (Pisces): first navamsa → Cancer, last → Pisces.
    expect(navamsaSign(330)).toBe(3); // 0° Pisces → Cancer
    expect(navamsaSign(359.99)).toBe(11); // last navamsa of Pisces → Pisces
  });

  it('each 3°20′ step advances exactly one sign', () => {
    for (let k = 0; k < 108; k++) {
      const lon = k * (30 / 9) + 1; // mid-navamsa
      expect(navamsaSign(lon)).toBe(k % 12);
    }
  });

  it('all grahas get a valid navamsa sign in a real chart', () => {
    const chart = computeBirthChart(new Date('1990-08-15T10:30:00+05:30'), DELHI, true);
    for (const g of chart.grahas) {
      const n = navamsaSign(g.longitude);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(11);
    }
    // Navamsa lagna is well-defined when the birth time is known.
    expect(navamsaSign(chart.lagna!.longitude)).toBeGreaterThanOrEqual(0);
  });
});
