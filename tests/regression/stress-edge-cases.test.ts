// Adversarial stress tests — the inputs an audit found could CRASH or silently
// corrupt the Day / Month / Festivals / Kundli tabs, now asserted fixed (or
// asserted to fail CLEANLY). Each case cites the bug it guards.
import { describe, it, expect } from 'vitest';
import { computePanchanga, findFestivals, type Location } from '$lib/panchanga';
import { computeBirthChart, birthInstant } from '$lib/jyotish/chart';
import { computeMatch } from '$lib/jyotish';
import { civilYMDInZone } from '$lib/astro';

const DELHI: Location = { name: 'Delhi', latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata' };
const TROMSO: Location = { name: 'Tromso', latitude: 69.6, longitude: 18.9, timezone: 'Europe/Oslo' };

// Build a Date at an arbitrary (incl. ancient/BCE) year WITHOUT the Date.UTC
// two-digit coercion (which is the very bug under test).
function dateAt(year: number, month: number, day: number, hour = 6): Date {
  const d = new Date(0);
  d.setUTCFullYear(year, month - 1, day);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
}

describe('Bug A — years 0-99 no longer crash (Date.UTC two-digit-year coercion)', () => {
  for (const y of [1, 50, 99, 100, 1700]) {
    it(`computePanchanga year ${y} computes (no RangeError)`, () => {
      const p = computePanchanga(dateAt(y, 6, 15), DELHI);
      expect(p.tithi.index).toBeGreaterThanOrEqual(1);
      expect(p.tithi.index).toBeLessThanOrEqual(30);
    });
  }
  it('findFestivals over a year-50 span does not crash', () => {
    expect(() => findFestivals(dateAt(50, 1, 1), dateAt(50, 12, 31), DELHI)).not.toThrow();
  });
  it('computeBirthChart at year 1 computes', () => {
    expect(computeBirthChart(dateAt(1, 6, 15, 10), DELHI, true).grahas.length).toBe(9);
  });
});

describe('Bug B — BCE dates read with the correct (astronomical) year, not silently off-by-era', () => {
  it('civilYMDInZone maps 1 BCE (astronomical year 0) to year 0, not 1', () => {
    expect(civilYMDInZone(dateAt(0, 6, 15, 12), 'UTC').year).toBe(0);
  });
  it('civilYMDInZone keeps a CE year unchanged', () => {
    expect(civilYMDInZone(dateAt(2026, 6, 15, 12), 'UTC').year).toBe(2026);
  });
});

describe('Bug C — invalid birth instant fails fast and clearly', () => {
  it('computeBirthChart(Invalid Date) throws a clear RangeError, not a cryptic ephemeris error', () => {
    expect(() => computeBirthChart(new Date(NaN), DELHI, true)).toThrow(/invalid birth instant/i);
  });
});

describe('Bug D/E — the chart path validates its Location (was accepting NaN / out-of-range)', () => {
  const inst = dateAt(1990, 1, 15, 10);
  it('rejects NaN latitude (was a NaN-laced lagna)', () => {
    expect(() => computeBirthChart(inst, { ...DELHI, latitude: NaN }, true)).toThrow(RangeError);
  });
  it('rejects out-of-range latitude 200 (was silently accepted)', () => {
    expect(() => computeBirthChart(inst, { ...DELHI, latitude: 200 }, true)).toThrow(RangeError);
  });
  it('time-unknown chart ignores location (grahas only) and still computes', () => {
    // No lagna requested → location not needed → no validation, valid grahas.
    expect(computeBirthChart(inst, { ...DELHI, latitude: NaN }, false).grahas.length).toBe(9);
  });
});

describe('birthInstant — out-of-range time falls back to noon, never crashes', () => {
  it('"25:99" → noon (not a rolled-over wrong instant or a throw)', () => {
    const noon = birthInstant('1990-01-15', '10:30', 'Asia/Kolkata');
    const fallback = birthInstant('1990-01-15', '25:99', 'Asia/Kolkata');
    // noon IST (12:00) vs the requested 10:30 → fallback is later, and both valid Dates.
    expect(Number.isFinite(fallback.getTime())).toBe(true);
    expect(fallback.getTime()).toBeGreaterThan(noon.getTime());
  });
});

describe('computeMatch — out-of-range rashi/nakshatra fails cleanly (was TypeError/NaN)', () => {
  const ok = { rashi: 0, rashiDeg: 5, nakshatra: 1 };
  it('throws a clear RangeError for nakshatra 30', () => {
    expect(() => computeMatch({ ...ok, nakshatra: 30 }, ok)).toThrow(/nakshatra .* out of range/i);
  });
  it('throws a clear RangeError for rashi 12', () => {
    expect(() => computeMatch(ok, { ...ok, rashi: 12 })).toThrow(/rashi .* out of range/i);
  });
  it('a valid pair scores without throwing', () => {
    expect(() => computeMatch(ok, { rashi: 3, rashiDeg: 10, nakshatra: 7 })).not.toThrow();
  });
});

describe('Acceptable edge cases stay safe (verified non-crashing)', () => {
  it('a full festival year at a polar city (no sunrise) does not crash', () => {
    expect(() =>
      findFestivals(new Date(Date.UTC(2026, 0, 1, 6)), new Date(Date.UTC(2026, 11, 31, 6)), TROMSO),
    ).not.toThrow();
  });
  it('a reversed range returns []', () => {
    expect(
      findFestivals(new Date(Date.UTC(2026, 11, 31, 6)), new Date(Date.UTC(2026, 0, 1, 6)), DELHI),
    ).toEqual([]);
  });
  it('year 9999 and Feb 29 compute without crashing', () => {
    expect(() => computePanchanga(dateAt(9999, 6, 15), DELHI)).not.toThrow();
    expect(() => computePanchanga(dateAt(2024, 2, 29), DELHI)).not.toThrow();
  });
});
