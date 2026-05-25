// Unit tests for varaAtSunrise().
// Hindu weekday runs sunrise-to-sunrise; verified against computePanchanga.

import { describe, expect, it } from 'vitest';
import { varaAtSunrise } from '$lib/panchanga/vara';
import { VARA_NAMES } from '$lib/panchanga/names';
import { computePanchanga } from '$lib/panchanga';
import { BENGALURU, DELHI } from '../helpers';
import type { Location } from '$lib/panchanga';

const TROMSO: Location = {
  name: 'Tromsø, Norway',
  latitude: 69.6489,
  longitude: 18.9551,
  altitude: 10,
  timezone: 'Europe/Oslo',
};

describe('varaAtSunrise', () => {
  it('result is one of the 7 valid vara values', () => {
    const valid = new Set(VARA_NAMES);
    for (const iso of ['2024-08-26', '2025-03-14', '2025-11-01', '2026-01-14', '2026-05-20']) {
      const p = computePanchanga(new Date(`${iso}T06:00:00+05:30`), BENGALURU);
      expect(valid.has(p.vara)).toBe(true);
    }
  });

  it('each of the 7 vara values appears over a 7-day window', () => {
    const seen = new Set<string>();
    // 2026-05-18 is a Monday; cover Mon→Sun
    for (let d = 0; d < 7; d++) {
      const ms = new Date('2026-05-18T06:00:00+05:30').getTime() + d * 86400_000;
      const p = computePanchanga(new Date(ms), DELHI);
      seen.add(p.vara);
    }
    expect(seen.size).toBe(7);
  });

  it('known weekdays match Gregorian calendar (IST)', () => {
    // 2026-05-25 is a Monday
    const p1 = computePanchanga(new Date('2026-05-25T06:00:00+05:30'), DELHI);
    expect(p1.vara).toBe('monday');

    // 2026-05-31 is a Sunday
    const p2 = computePanchanga(new Date('2026-05-31T06:00:00+05:30'), DELHI);
    expect(p2.vara).toBe('sunday');
  });

  it('Sunday=0 wrap is handled correctly', () => {
    // varaAtSunrise must return "sunday" not an invalid value when weekday=0
    const sunday = new Date('2026-05-31T01:00:00Z'); // 06:30 IST = Sunday
    const vara = varaAtSunrise(sunday, sunday, DELHI);
    expect(vara).toBe('sunday');
  });

  it('null sunrise falls back to fallbackInstant weekday', () => {
    // Tromsø Dec 21 = polar night, sunrise is null.
    const fallback = new Date('2026-12-21T12:00:00+01:00'); // Monday noon local
    const vara = varaAtSunrise(null, fallback, TROMSO);
    expect(VARA_NAMES).toContain(vara);
    // Noon on Monday → vara should be monday
    expect(vara).toBe('monday');
  });

  it('no crash at polar latitude (Tromsø) in polar night via computePanchanga', () => {
    // Smoke: no throw; check vara is valid
    const p = computePanchanga(new Date('2026-12-21T12:00:00+01:00'), TROMSO);
    expect(VARA_NAMES).toContain(p.vara);
  });
});
