// Coverage the audit flagged missing: the sankranti INSTANT (not just the sign
// flip) and an external moonrise pin (fixtures only had self-consistency).
import { describe, it, expect } from 'vitest';
import {
  sunLongitudeAtJD,
  siderealFromTropical,
  dateToJulian,
  julianToDate,
  moonRiseSet,
  civilYMDInZone,
} from '$lib/astro';
import type { Location } from '$lib/panchanga';

const DELHI: Location = { name: 'Delhi', latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata' };

describe('sankranti instant vs Swiss Ephemeris', () => {
  it('Makara 2025 (sidereal Sun = 270°) crosses within 2 min of 08:55:42 IST, Jan 14', () => {
    const sid = (jd: number) => siderealFromTropical(sunLongitudeAtJD(jd), jd, 'lahiri');
    let lo = dateToJulian(new Date(Date.UTC(2025, 0, 13)));
    let hi = dateToJulian(new Date(Date.UTC(2025, 0, 16)));
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (sid(mid) < 270) lo = mid;
      else hi = mid;
    }
    const t = civilYMDInZone(julianToDate((lo + hi) / 2), 'Asia/Kolkata');
    expect([t.year, t.month, t.day]).toEqual([2025, 1, 14]);
    const secs = t.hour * 3600 + t.minute * 60 + t.second;
    expect(Math.abs(secs - (8 * 3600 + 55 * 60 + 42))).toBeLessThan(120);
  });
});

describe('moonrise external pin (audit-verified ≤2s vs Swiss Ephemeris)', () => {
  it('moonrise 2024-08-26 Delhi = 23:21 IST', () => {
    const m = moonRiseSet(DELHI, new Date(Date.UTC(2024, 7, 26, 0)));
    expect(m.rise).not.toBeNull();
    const t = civilYMDInZone(m.rise!, 'Asia/Kolkata');
    expect([t.month, t.day, t.hour, t.minute]).toEqual([8, 26, 23, 21]);
  });
});
