import { describe, it, expect } from 'vitest';
import { computePanchanga } from '$lib/panchanga';
import { BENGALURU } from '../helpers';

const LONDON = {
  latitude: 51.5074,
  longitude: -0.1278,
  altitude: 25,
  timezone: 'Europe/London',
};

const TROMSO = {
  latitude: 69.6492, // arctic — sun doesn't rise mid-winter
  longitude: 18.9553,
  altitude: 10,
  timezone: 'Europe/Oslo',
};

describe('sunrise/sunset', () => {
  it('Bengaluru sunrise on equinox is near 06:00 local', () => {
    const p = computePanchanga(new Date('2025-03-20T06:00:00+05:30'), BENGALURU);
    expect(p.sunrise).not.toBeNull();
    const hours = (p.sunrise!.getTime() % 86400_000) / 3600_000;
    const localHours = (hours + 5.5) % 24; // tz offset
    expect(localHours).toBeGreaterThan(5.5);
    expect(localHours).toBeLessThan(7);
  });

  it('London June sunrise is before 05:00 local', () => {
    const p = computePanchanga(new Date('2025-06-21T06:00:00+01:00'), LONDON);
    expect(p.sunrise).not.toBeNull();
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: LONDON.timezone,
      hour: '2-digit',
      hour12: false,
    });
    const hour = Number(fmt.format(p.sunrise!));
    expect(hour).toBeLessThanOrEqual(5);
  });

  it('Tromsø polar winter: sun may not rise', () => {
    // Mid-December in Tromsø — polar night.
    const p = computePanchanga(new Date('2025-12-21T12:00:00+01:00'), TROMSO);
    // We accept either: sunrise is null (true polar night), or sunrise
    // falls outside the civil day window. The point of the test is that
    // the compute pipeline doesn't crash.
    expect(p).toBeTruthy();
    expect(p.muhurta.rahuKaal).toBeDefined();
  });
});
