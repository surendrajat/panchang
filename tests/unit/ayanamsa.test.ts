import { describe, it, expect } from 'vitest';
import { ayanamsa, dateToJulian } from '$lib/astro';
import { siderealFromTropical } from '$lib/astro/ayanamsa';

describe('Lahiri ayanamsa', () => {
  it('is 23.857° at J2000 (Swiss Ephemeris SE_SIDM_LAHIRI / official IAE)', () => {
    const jd = dateToJulian(new Date('2000-01-01T12:00:00Z'));
    expect(ayanamsa(jd, 'lahiri')).toBeCloseTo(23.8571, 3);
  });

  it('drifts at ~50.29 arcseconds/year', () => {
    const j2000 = dateToJulian(new Date('2000-01-01T12:00:00Z'));
    const j2025 = dateToJulian(new Date('2025-01-01T12:00:00Z'));
    const drift = ayanamsa(j2025, 'lahiri') - ayanamsa(j2000, 'lahiri');
    const expectedArcsec = 25 * 50.2879; // ~1257 arcsec ≈ 0.349°
    expect(drift * 3600).toBeCloseTo(expectedArcsec, 0);
  });

  it('matches Swiss-Eph SE_SIDM_LAHIRI, ~0.4′ below Drik (Jan 2025)', () => {
    // We use the Swiss-Eph / official-IAE Lahiri. Swiss-Eph gives 24.20634 for
    // 2025-01-01; Drik's computational value is 24.213073 (0.40′ higher) —
    // documented in astro/ayanamsa.ts.
    const jd = dateToJulian(new Date('2025-01-01T00:00:00Z'));
    const ayan = ayanamsa(jd, 'lahiri');
    expect(Math.abs(ayan - 24.20634) * 60).toBeLessThan(0.2); // matches Swiss-Eph
    expect((24.213073 - ayan) * 60).toBeCloseTo(0.4, 1); // ~0.4′ below Drik
  });

  it('KP is exactly 6 arcminutes less than Lahiri', () => {
    const jd = dateToJulian(new Date('2025-06-15T00:00:00Z'));
    const diff = ayanamsa(jd, 'lahiri') - ayanamsa(jd, 'kp');
    expect(diff * 60).toBeCloseTo(6, 4);
  });

  // Golden Lahiri values = Swiss Ephemeris SE_SIDM_LAHIRI (the official IAE
  // value, verified directly with pyswisseph). Regression guards — if any value
  // drifts beyond tolerance, the ayanamsa formula changed and the cache
  // CALCULATION_VERSION must be bumped.
  const goldenLahiri: Array<[string, number, number]> = [
    // [ISO date, expected Lahiri (decimal degrees), tolerance (arcmin)]
    ['1900-01-01T00:00:00Z', 22.4606, 2], // polynomial extrapolation
    ['1950-01-01T00:00:00Z', 23.1587, 1], // pyswisseph 23.15873
    ['2000-01-01T00:00:00Z', 23.8571, 1], // pyswisseph 23.85707
    ['2025-01-01T00:00:00Z', 24.2063, 1], // pyswisseph 24.20634
    ['2050-01-01T00:00:00Z', 24.5556, 1], // pyswisseph 24.55561
    ['2100-01-01T00:00:00Z', 25.2543, 2],
  ];
  it.each(goldenLahiri)('matches expected value at %s', (iso, expected, tol) => {
    const jd = dateToJulian(new Date(iso));
    const ayan = ayanamsa(jd, 'lahiri');
    expect(Math.abs(ayan - expected) * 60).toBeLessThan(tol);
  });
});

describe('siderealFromTropical', () => {
  it('subtracts the ayanamsa from tropical longitude', () => {
    const jd = dateToJulian(new Date('2025-01-01T00:00:00Z'));
    const tropical = 80.0; // some tropical longitude in degrees
    const ayan = ayanamsa(jd, 'lahiri'); // ~24.21
    const expected = (((tropical - ayan) % 360) + 360) % 360;
    expect(siderealFromTropical(tropical, jd, 'lahiri')).toBeCloseTo(expected, 8);
  });

  it('wraps correctly when result would be negative (tropical near 0°)', () => {
    const jd = dateToJulian(new Date('2025-06-01T00:00:00Z'));
    const result = siderealFromTropical(10.0, jd, 'lahiri');
    // ayanamsa ~24.21, so 10 - 24 = -14, wrapped → ~346°
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(360);
    expect(result).toBeCloseTo(10 - ayanamsa(jd, 'lahiri') + 360, 5);
  });

  it('wraps correctly when result exceeds 360°', () => {
    const jd = dateToJulian(new Date('2025-01-01T00:00:00Z'));
    const result = siderealFromTropical(370.0, jd, 'lahiri');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(360);
  });

  it('KP system gives a slightly larger sidereal longitude than Lahiri', () => {
    const jd = dateToJulian(new Date('2025-01-01T00:00:00Z'));
    const tropical = 120.0;
    const lahiri = siderealFromTropical(tropical, jd, 'lahiri');
    const kp = siderealFromTropical(tropical, jd, 'kp');
    // KP ayanamsa is ~6 arcmin LESS than Lahiri, so KP sidereal is larger
    expect(kp).toBeGreaterThan(lahiri);
  });
});
