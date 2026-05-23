import { describe, expect, it } from 'vitest';
import { CALCULATION_VERSION, cacheKey } from '$lib/storage/cache';
import type { Location, PanchangaOptions } from '$lib/panchanga';

const DELHI: Location = {
  name: 'New Delhi, India',
  latitude: 28.6139,
  longitude: 77.209,
  altitude: 216,
  timezone: 'Asia/Kolkata',
};

const OPTIONS: PanchangaOptions = {
  ayanamsa: 'lahiri',
  monthSystem: 'purnimanta',
  topocentric: false,
  sunriseHorizon: 'standard',
};

describe('panchanga cache keys', () => {
  it('include the calculation version prefix', () => {
    const key = cacheKey(new Date('2026-03-04T00:00:00+05:30'), DELHI, OPTIONS);
    expect(key.startsWith(`v${CALCULATION_VERSION}|`)).toBe(true);
  });

  it('change when calculation-affecting options change', () => {
    const date = new Date('2026-03-04T00:00:00+05:30');
    const base = cacheKey(date, DELHI, OPTIONS);
    const amanta = cacheKey(date, DELHI, { ...OPTIONS, monthSystem: 'amanta' });
    const topocentric = cacheKey(date, DELHI, { ...OPTIONS, topocentric: true });
    const civilHorizon = cacheKey(date, DELHI, { ...OPTIONS, sunriseHorizon: 'civil' });

    expect(amanta).not.toBe(base);
    expect(topocentric).not.toBe(base);
    expect(civilHorizon).not.toBe(base);
  });
});
