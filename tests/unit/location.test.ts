import { describe, expect, it } from 'vitest';
import { CITIES, nearestCity, searchCities } from '$lib/location/cities';
import { browserTimezone } from '$lib/location/timezone';

describe('offline location data', () => {
  it('keeps bundled city names unique', () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const city of CITIES) {
      if (seen.has(city.name)) duplicates.push(city.name);
      seen.add(city.name);
    }

    expect(duplicates).toEqual([]);
  });

  it('returns one Dubai search result', () => {
    expect(searchCities('dubai').map((city) => city.name)).toEqual(['Dubai, UAE']);
  });

  it('uses explicit bundled city timezones for nearest-city geolocation', () => {
    const city = nearestCity(28.61, 77.2);
    expect(city.name).toBe('New Delhi, India');
    expect(city.timezone).toBe('Asia/Kolkata');
  });
});

describe('browserTimezone', () => {
  it('returns an IANA timezone-like string or UTC fallback', () => {
    expect(browserTimezone()).toMatch(/^(UTC|Etc\/UTC|[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?)$/);
  });
});
