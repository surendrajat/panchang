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
});
