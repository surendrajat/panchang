import { describe, expect, it } from 'vitest';
import { CALCULATION_VERSION, cacheKey } from '$lib/storage/cache';
import type { PanchangaOptions } from '$lib/panchanga';
import { DELHI } from '../helpers';

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

  it('uses the location civil date instead of the UTC date', () => {
    const localMidnight = cacheKey(new Date('2026-03-04T00:00:00+05:30'), DELHI, OPTIONS);
    const localNoon = cacheKey(new Date('2026-03-04T12:00:00+05:30'), DELHI, OPTIONS);
    const previousLocalDate = cacheKey(new Date('2026-03-03T23:30:00+05:30'), DELHI, OPTIONS);

    expect(localMidnight).toContain('|2026-03-04|');
    expect(localNoon).toBe(localMidnight);
    expect(previousLocalDate).toContain('|2026-03-03|');
    expect(previousLocalDate).not.toBe(localMidnight);
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

  it('changes when calculation-affecting location fields change', () => {
    const date = new Date('2026-03-04T00:00:00+05:30');
    const base = cacheKey(date, DELHI, OPTIONS);

    expect(cacheKey(date, { ...DELHI, latitude: DELHI.latitude + 0.01 }, OPTIONS)).not.toBe(base);
    expect(cacheKey(date, { ...DELHI, longitude: DELHI.longitude + 0.01 }, OPTIONS)).not.toBe(base);
    expect(cacheKey(date, { ...DELHI, altitude: (DELHI.altitude ?? 0) + 100 }, OPTIONS)).not.toBe(
      base,
    );
    expect(cacheKey(date, { ...DELHI, timezone: 'Asia/Kathmandu' }, OPTIONS)).not.toBe(base);
  });
});
