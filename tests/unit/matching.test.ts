import { describe, it, expect } from 'vitest';
import { computeMatch, type MatchPerson, type KootaKey } from '$lib/jyotish';

const P = (nakshatra: number, rashi: number, rashiDeg = 5): MatchPerson => ({ nakshatra, rashi, rashiDeg });
const by = (r: ReturnType<typeof computeMatch>, k: KootaKey) => r.kootas.find((x) => x.key === k)!.got;

describe('guna milan — structural invariants', () => {
  it('total is the sum of kootas and max is 36 with the canonical caps', () => {
    const r = computeMatch(P(7, 2), P(19, 8));
    expect(r.max).toBe(36);
    expect(r.kootas.map((k) => k.max)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(r.total).toBe(r.kootas.reduce((s, k) => s + k.got, 0));
    for (const k of r.kootas) {
      expect(k.got).toBeGreaterThanOrEqual(0);
      expect(k.got).toBeLessThanOrEqual(k.max);
    }
  });

  it('identical charts score 28/36 — Nadi dosha (same nakshatra → same nadi)', () => {
    // The canonical textbook result: same nakshatra loses all 8 Nadi points.
    const r = computeMatch(P(4, 1, 18), P(4, 1, 18));
    expect(by(r, 'nadi')).toBe(0);
    expect(r.nadiDosha).toBe(true);
    expect(r.total).toBe(28);
  });
});

describe('guna milan — per-koota, hand-computed from the Saravali tables', () => {
  // Groom Ashwini/Mesha, Bride Bharani/Mesha.
  const r = computeMatch(P(1, 0), P(2, 0));
  it('Varna: both Kshatriya → 1', () => expect(by(r, 'varna')).toBe(1));
  it('Vashya: both Quadruped → 2', () => expect(by(r, 'vashya')).toBe(2));
  it('Tara: remainders 2 and 0 → 1.5 + 1.5 = 3', () => expect(by(r, 'tara')).toBe(3));
  it('Yoni: Horse × Elephant → 2', () => expect(by(r, 'yoni')).toBe(2));
  it('Graha Maitri: same lord (Mars) → 5', () => expect(by(r, 'grahaMaitri')).toBe(5));
  it('Gana: bride Manushya + groom Deva → 5 (asymmetric)', () => expect(by(r, 'gana')).toBe(5));
  it('Bhakoot: same rashi → 7', () => expect(by(r, 'bhakoot')).toBe(7));
  it('Nadi: Aadi vs Madhya → 8', () => expect(by(r, 'nadi')).toBe(8));
  it('total = 33', () => expect(r.total).toBe(33));
});

describe('guna milan — asymmetry and doshas', () => {
  it('Gana is role-dependent: swapping groom/bride can change the score', () => {
    // Deva groom + Manushya bride (6) vs Manushya groom + Deva bride (5).
    const a = computeMatch(P(1, 0), P(2, 0)); // groom Deva(Ashwini), bride Manushya(Bharani)
    const b = computeMatch(P(2, 0), P(1, 0)); // groom Manushya(Bharani), bride Deva(Ashwini)
    expect(by(a, 'gana')).toBe(5);
    expect(by(b, 'gana')).toBe(6);
  });

  it('Bhakoot dosha for a 6/8 (shashtashtaka) rashi relationship', () => {
    // rashi diff of 5 (6th) is a Bhakoot dosha → 0 points.
    const r = computeMatch(P(1, 0), P(1, 5));
    expect(by(r, 'bhakoot')).toBe(0);
    expect(r.bhakootDosha).toBe(true);
  });

  it('Yoni mortal enemies (Cat × Rat) → 0', () => {
    // Punarvasu (Cat) × Magha (Rat) are sworn-enemy yonis.
    const r = computeMatch(P(7, 2), P(10, 4));
    expect(by(r, 'yoni')).toBe(0);
  });

  it('Nadi differs across the cycle-of-six boundary → 8 points', () => {
    // Ashwini (Aadi) × Krittika (Antya) → different nadi.
    const r = computeMatch(P(1, 0), P(3, 1));
    expect(by(r, 'nadi')).toBe(8);
    expect(r.nadiDosha).toBe(false);
  });
});
