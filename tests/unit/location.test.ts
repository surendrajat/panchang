import { describe, expect, it } from 'vitest';
import { CITIES, nearestCity, nearestCityWithDistance, searchCities } from '$lib/location/cities';
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

  it('nearestCityWithDistance returns city and km for central Delhi coords', () => {
    const { city, distanceKm } = nearestCityWithDistance(28.61, 77.2);
    expect(city.name).toBe('New Delhi, India');
    // Central Delhi is within a few km of the bundled coordinate
    expect(distanceKm).toBeLessThan(5);
  });

  it('nearestCityWithDistance returns large distance for a remote location', () => {
    // Middle of the Sahara — far from any bundled city
    const { distanceKm } = nearestCityWithDistance(23.0, 12.0);
    expect(distanceKm).toBeGreaterThan(500);
  });
});

describe('browserTimezone', () => {
  it('returns an IANA timezone-like string or UTC fallback', () => {
    expect(browserTimezone()).toMatch(/^(UTC|Etc\/UTC|[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?)$/);
  });
});

describe('searchCities edge cases', () => {
  it('is case-insensitive', () => {
    const lower = searchCities('mumbai');
    const upper = searchCities('MUMBAI');
    const mixed = searchCities('Mumbai');
    expect(lower.length).toBeGreaterThan(0);
    expect(upper.length).toBe(lower.length);
    expect(mixed.length).toBe(lower.length);
  });

  it('returns empty array for a query with no matches', () => {
    expect(searchCities('zzz_nonexistent_city_xyz')).toEqual([]);
  });

  it('returns a default list of cities for an empty query string', () => {
    // searchCities('') returns the first N cities rather than empty
    const results = searchCities('');
    expect(results.length).toBeGreaterThan(0);
  });

  it('returns multiple results for a partial prefix match', () => {
    // "New" matches "New Delhi", "New York", etc.
    expect(searchCities('new').length).toBeGreaterThan(1);
  });

  it('each result has name, latitude, longitude, and timezone fields', () => {
    const results = searchCities('delhi');
    expect(results.length).toBeGreaterThan(0);
    for (const city of results) {
      expect(typeof city.name).toBe('string');
      expect(typeof city.latitude).toBe('number');
      expect(typeof city.longitude).toBe('number');
      expect(typeof city.timezone).toBe('string');
    }
  });
});
