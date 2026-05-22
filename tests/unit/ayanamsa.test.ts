import { describe, it, expect } from 'vitest';
import { ayanamsa, dateToJulian } from '$lib/astro';

describe('Lahiri ayanamsa', () => {
  it('is ~23.827° at J2000 (Drik-Swiss Ephemeris alignment)', () => {
    const jd = dateToJulian(new Date('2000-01-01T12:00:00Z'));
    expect(ayanamsa(jd, 'lahiri')).toBeCloseTo(23.8267, 3);
  });

  it('drifts at ~50.29 arcseconds/year', () => {
    const j2000 = dateToJulian(new Date('2000-01-01T12:00:00Z'));
    const j2025 = dateToJulian(new Date('2025-01-01T12:00:00Z'));
    const drift = ayanamsa(j2025, 'lahiri') - ayanamsa(j2000, 'lahiri');
    const expectedArcsec = 25 * 50.2879; // ~1257 arcsec ≈ 0.349°
    expect(drift * 3600).toBeCloseTo(expectedArcsec, 0);
  });

  it('matches Drik published value within 1 arcminute (Jan 2025)', () => {
    // Drik Panchang publishes Lahiri ayanamsa = 24°10'34.04" for
    // 2025-01-01 = 24.17612°.
    const jd = dateToJulian(new Date('2025-01-01T00:00:00Z'));
    const ayan = ayanamsa(jd, 'lahiri');
    expect(Math.abs(ayan - 24.17612) * 60).toBeLessThan(1);
  });

  it('KP is exactly 6 arcminutes less than Lahiri', () => {
    const jd = dateToJulian(new Date('2025-06-15T00:00:00Z'));
    const diff = ayanamsa(jd, 'lahiri') - ayanamsa(jd, 'kp');
    expect(diff * 60).toBeCloseTo(6, 4);
  });

  // Golden Lahiri values published by Drik / Lahiri's tables.
  // Tolerance: 1 arcminute for years inside the Drik-verified range
  // (2000–2025); 2 arcminutes for extrapolated historical / future
  // years where my IAU-2006 polynomial may differ slightly from
  // hand-computed almanac entries. These are regression guards — if
  // any value drifts more than the tolerance, the ayanamsa formula
  // has changed and the cache CALCULATION_VERSION must be bumped.
  const goldenLahiri: Array<[string, number, number]> = [
    // [ISO date, expected Lahiri (decimal degrees), tolerance (arcmin)]
    ['1900-01-01T00:00:00Z', 22.4301, 2], // polynomial extrapolation
    ['1950-01-01T00:00:00Z', 23.1283, 2],
    ['2000-01-01T00:00:00Z', 23.8267, 1], // Drik J2000 reference
    ['2025-01-01T00:00:00Z', 24.1761, 1], // Drik 2025-01-01 reference
    ['2050-01-01T00:00:00Z', 24.5252, 2],
    ['2100-01-01T00:00:00Z', 25.2239, 2],
  ];
  it.each(goldenLahiri)('matches expected value at %s', (iso, expected, tol) => {
    const jd = dateToJulian(new Date(iso));
    const ayan = ayanamsa(jd, 'lahiri');
    expect(Math.abs(ayan - expected) * 60).toBeLessThan(tol);
  });
});
