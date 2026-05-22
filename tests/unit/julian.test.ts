import { describe, it, expect } from 'vitest';
import {
  dateToJulian,
  julianToDate,
  civilMidnightInZone,
  civilYMDInZone,
  JD_J2000,
} from '$lib/astro';

describe('Julian date conversions', () => {
  it('J2000.0 epoch is 2000-01-01T12:00:00Z', () => {
    const j2000 = new Date('2000-01-01T12:00:00Z');
    expect(dateToJulian(j2000)).toBeCloseTo(JD_J2000, 9);
  });

  it('round-trips through Date and back', () => {
    const d = new Date('2026-05-20T12:34:56Z');
    expect(julianToDate(dateToJulian(d)).toISOString()).toBe(d.toISOString());
  });
});

describe('civilMidnightInZone', () => {
  it('returns 00:00 in the requested time zone', () => {
    const noon = new Date('2026-05-20T06:30:00Z');
    const m = civilMidnightInZone(noon, 'Asia/Kolkata');
    const ymd = civilYMDInZone(m, 'Asia/Kolkata');
    expect(ymd.year).toBe(2026);
    expect(ymd.month).toBe(5);
    expect(ymd.day).toBe(20);
    expect(ymd.hour).toBe(0);
    expect(ymd.minute).toBe(0);
  });

  it('handles a US East Coast date crossing UTC midnight', () => {
    // 2026-05-20T03:30Z is 2026-05-19 23:30 ET → midnight ET should land 2026-05-19
    const t = new Date('2026-05-20T03:30:00Z');
    const m = civilMidnightInZone(t, 'America/New_York');
    const ymd = civilYMDInZone(m, 'America/New_York');
    expect(ymd.year).toBe(2026);
    expect(ymd.month).toBe(5);
    expect(ymd.day).toBe(19);
    expect(ymd.hour).toBe(0);
  });
});
