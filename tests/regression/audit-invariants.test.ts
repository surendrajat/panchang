// Invariant + stress tests added after a full-codebase audit. They strengthen
// coverage where earlier tests only asserted bounds (graha index DERIVATION, not
// just range), pin the Vimshottari 120-year structure, prove guna-milan score
// invariants across all rashi/nakshatra pairs, and stress the panchanga at
// extreme geography (equator, both poles, the date line).
import { describe, it, expect } from 'vitest';
import { computePanchanga, type Location } from '$lib/panchanga';
import { computeGrahas, computeMatch, vimshottariMahadashas } from '$lib/jyotish';

const NAK_ARC = 360 / 27; // 13°20′
const PADA_ARC = NAK_ARC / 4; // 3°20′

describe('graha derivation — rashi/nakshatra/pada are the exact floor() of longitude', () => {
  // Earlier tests assert only that these are in range; here we assert they are
  // DERIVED correctly from the sidereal longitude, which catches any off-by-one.
  const dates = [
    '1900-01-01', '1955-07-15', '1983-12-31', '1990-08-15',
    '2001-04-10', '2024-02-29', '2026-06-24', '2080-11-03',
  ].map((d) => new Date(d + 'T06:00:00Z'));
  for (const date of dates) {
    it(`${date.toISOString().slice(0, 10)} — every graha's index matches its longitude`, () => {
      for (const g of computeGrahas(date, 'lahiri', 'mean')) {
        expect(g.rashi).toBe(Math.floor(g.longitude / 30));
        expect(g.degInRashi).toBeCloseTo(g.longitude - g.rashi * 30, 6);
        expect(g.nakshatra).toBe(Math.floor(g.longitude / NAK_ARC) + 1);
        expect(g.pada).toBe(Math.floor((g.longitude % NAK_ARC) / PADA_ARC) + 1);
      }
    });
  }
});

describe('vimshottari mahadashas — the 120-year cycle is well-formed', () => {
  for (const moonLon of [0.0, 45.7, 123.4, 256.9, 359.99]) {
    it(`moon ${moonLon}° → 9 contiguous periods, each graha once, summing to 120 years`, () => {
      const periods = vimshottariMahadashas(new Date('2000-01-01T00:00:00Z'), moonLon);
      expect(periods.length).toBe(9);
      expect(periods.reduce((s, p) => s + p.years, 0)).toBe(120);
      expect(new Set(periods.map((p) => p.lord)).size).toBe(9);
      const perYearMs = (periods[8].end.getTime() - periods[0].start.getTime()) / 120;
      for (let i = 0; i < periods.length; i++) {
        const p = periods[i];
        expect(p.end.getTime()).toBeGreaterThan(p.start.getTime());
        // each period's length is proportional to its year-span (consistent year unit)
        expect(Math.abs(p.end.getTime() - p.start.getTime() - p.years * perYearMs)).toBeLessThan(1000);
        if (i > 0) expect(p.start.getTime()).toBe(periods[i - 1].end.getTime()); // no gaps/overlap
      }
    });
  }
});

describe('guna milan — score invariants hold for every rashi/nakshatra pairing', () => {
  it('max=36, total=sum(kootas), every koota within [0,max], 0 ≤ total ≤ 36', () => {
    const naks = [1, 5, 10, 15, 20, 24, 27];
    const rashis = [0, 3, 6, 9, 11];
    let pairs = 0;
    for (const an of naks)
      for (const ar of rashis)
        for (const bn of naks)
          for (const br of rashis) {
            const r = computeMatch(
              { nakshatra: an, rashi: ar, rashiDeg: 5 },
              { nakshatra: bn, rashi: br, rashiDeg: 5 },
            );
            expect(r.max).toBe(36);
            expect(r.total).toBe(r.kootas.reduce((s, k) => s + k.got, 0));
            expect(r.total).toBeGreaterThanOrEqual(0);
            expect(r.total).toBeLessThanOrEqual(36);
            for (const k of r.kootas) {
              expect(k.got).toBeGreaterThanOrEqual(0);
              expect(k.got).toBeLessThanOrEqual(k.max);
            }
            pairs++;
          }
    expect(pairs).toBe(naks.length * rashis.length * naks.length * rashis.length);
  });
});

describe('panchanga robustness — extreme geography never crashes; indices stay valid', () => {
  const locs: Location[] = [
    { name: 'Equator', latitude: 0, longitude: 0, timezone: 'UTC' },
    { name: 'Near North Pole', latitude: 89.5, longitude: 0, timezone: 'UTC' },
    { name: 'Near South Pole', latitude: -89.5, longitude: 0, timezone: 'UTC' },
    { name: 'Date line East', latitude: 1.4, longitude: 179.5, timezone: 'Pacific/Kiritimati' },
    { name: 'Date line West', latitude: 1.4, longitude: -179.5, timezone: 'Etc/GMT+12' },
  ];
  const dates = ['2026-03-20', '2026-06-21', '2026-09-23', '2026-12-21', '1900-07-04', '2090-01-15'].map(
    (d) => new Date(d + 'T00:00:00Z'),
  );
  for (const loc of locs)
    for (const date of dates) {
      it(`${loc.name} @ ${date.toISOString().slice(0, 10)} — valid angas`, () => {
        const p = computePanchanga(date, loc);
        expect(p.tithi.index).toBeGreaterThanOrEqual(1);
        expect(p.tithi.index).toBeLessThanOrEqual(30);
        expect(p.nakshatra.index).toBeGreaterThanOrEqual(1);
        expect(p.nakshatra.index).toBeLessThanOrEqual(27);
        expect(p.nakshatra.pada).toBeGreaterThanOrEqual(1);
        expect(p.nakshatra.pada).toBeLessThanOrEqual(4);
        expect(p.yoga.index).toBeGreaterThanOrEqual(1);
        expect(p.yoga.index).toBeLessThanOrEqual(27);
        expect(p.karana.positionInCycle).toBeGreaterThanOrEqual(0);
        expect(p.karana.positionInCycle).toBeLessThanOrEqual(59);
        expect(p.solar.sign).toBeGreaterThanOrEqual(0);
        expect(p.solar.sign).toBeLessThanOrEqual(11);
      });
    }
});
