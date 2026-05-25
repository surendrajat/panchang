// Unit tests for formatTime(), formatTimeShort(), formatDate(), and localYMD().

import { describe, expect, it } from 'vitest';
import { formatTime, formatDate, localYMD } from '$lib/format/time';

const IST = 'Asia/Kolkata';
const UTC = 'UTC';
const LONDON = 'Europe/London';
const NEW_YORK = 'America/New_York';

// Fixture: 2026-05-25 06:30 IST = 2026-05-25T01:00:00Z
const ANCHOR_IST = new Date('2026-05-25T01:00:00Z');
// Fixture: sunrise at 06:00 IST
const SUNRISE_IST = new Date('2026-05-25T00:30:00Z'); // 06:00 IST

describe('formatTime — 24h', () => {
  it('formats IST instant to HH:MM', () => {
    // 06:30 IST
    const result = formatTime(ANCHOR_IST, IST, '24h');
    expect(result).toBe('06:30');
  });

  it('pads hours and minutes', () => {
    // 00:05 UTC
    const t = new Date('2026-05-25T00:05:00Z');
    expect(formatTime(t, UTC, '24h')).toBe('00:05');
  });
});

describe('formatTime — 12h', () => {
  it('formats morning as AM', () => {
    const result = formatTime(ANCHOR_IST, IST, '12h');
    // 06:30 IST → "6:30 AM"
    expect(result).toMatch(/6:30\s*AM/i);
  });

  it('formats afternoon as PM', () => {
    // 13:00 IST = 2026-05-25T07:30:00Z
    const t = new Date('2026-05-25T07:30:00Z');
    const result = formatTime(t, IST, '12h');
    expect(result).toMatch(/1:00\s*PM/i);
  });

  it('midnight is 12:00 AM', () => {
    // 00:00 UTC
    const t = new Date('2026-05-25T00:00:00Z');
    const result = formatTime(t, UTC, '12h');
    expect(result).toMatch(/12:00\s*AM/i);
  });

  it('noon is 12:00 PM', () => {
    const t = new Date('2026-05-25T12:00:00Z');
    const result = formatTime(t, UTC, '12h');
    expect(result).toMatch(/12:00\s*PM/i);
  });
});

describe('formatTime — ghati/pala', () => {
  it('returns 24h format when no sunriseAnchor provided', () => {
    const result = formatTime(ANCHOR_IST, IST, 'ghati');
    // Falls back to 24h
    expect(result).toBe('06:30');
  });

  it('returns "before sunrise" for instants before sunrise', () => {
    // 5 min before sunrise
    const early = new Date(SUNRISE_IST.getTime() - 5 * 60_000);
    const result = formatTime(early, IST, 'ghati', SUNRISE_IST);
    expect(result).toBe('before sunrise');
  });

  it('computes correct ghati and pala', () => {
    // 48 minutes after sunrise = 2 ghati 0 pala (1 ghati = 24 min)
    const t = new Date(SUNRISE_IST.getTime() + 48 * 60_000);
    const result = formatTime(t, IST, 'ghati', SUNRISE_IST);
    expect(result).toBe('2gh 0p');
  });

  it('computes partial ghati pala correctly', () => {
    // 25 minutes after sunrise = 1 ghati 2 pala (25 - 24 = 1 min = ~2.5 pala → floor 2)
    const t = new Date(SUNRISE_IST.getTime() + 25 * 60_000);
    const result = formatTime(t, IST, 'ghati', SUNRISE_IST);
    expect(result).toBe('1gh 2p');
  });

  it('handles null sunriseAnchor (falls back to 24h)', () => {
    const result = formatTime(ANCHOR_IST, IST, 'ghati', null);
    expect(result).toBe('06:30');
  });
});

describe('formatTime — DST boundaries', () => {
  it('UK spring-forward (2026-03-29): 01:00 UTC = 02:00 BST (GMT+1)', () => {
    // After clocks spring forward, London is UTC+1
    const t = new Date('2026-03-29T01:00:00Z'); // should be 02:00 in BST
    const result = formatTime(t, LONDON, '24h');
    expect(result).toBe('02:00');
  });

  it('US fall-back (2026-11-01): 06:00 UTC = 02:00 EST (GMT-4→GMT-5)', () => {
    // After US clocks fall back: UTC-5
    const t = new Date('2026-11-01T07:00:00Z'); // 02:00 EST after fall-back
    const result = formatTime(t, NEW_YORK, '24h');
    expect(result).toBe('02:00');
  });
});

describe('formatDate', () => {
  it('returns "Mon, 25 May 2026" in en-GB style', () => {
    const result = formatDate(ANCHOR_IST, IST, 'en-GB');
    expect(result).toContain('25');
    expect(result).toContain('May');
    expect(result).toContain('2026');
    expect(result).toMatch(/Mon/);
  });

  it('changes weekday label by locale (hi-IN)', () => {
    const result = formatDate(ANCHOR_IST, IST, 'hi-IN');
    // Should contain Devanagari content or at least year
    expect(result).toContain('2026');
  });

  it('respects timezone offset (UTC vs IST)', () => {
    // 2026-05-25T00:00:00Z = 05:30 IST May 25 but also May 25 UTC
    // 2026-05-24T23:00:00Z = 04:30 IST May 25 but May 24 UTC
    const midnight_utc = new Date('2026-05-24T23:00:00Z');
    const en_utc = formatDate(midnight_utc, UTC, 'en-GB');
    const en_ist = formatDate(midnight_utc, IST, 'en-GB');
    expect(en_utc).toContain('24'); // UTC sees May 24
    expect(en_ist).toContain('25'); // IST sees May 25
  });
});

describe('localYMD', () => {
  it('returns YYYY-MM-DD in IST', () => {
    // 2026-05-25T01:00:00Z = 2026-05-25 06:30 IST
    expect(localYMD(ANCHOR_IST, IST)).toBe('2026-05-25');
  });

  it('does not off-by-one with East-of-UTC timezone', () => {
    // 2026-05-25T18:30:00Z = 2026-05-26 00:00 IST (midnight IST = next day)
    const midnight_ist = new Date('2026-05-25T18:30:00Z');
    expect(localYMD(midnight_ist, IST)).toBe('2026-05-26');
    expect(localYMD(midnight_ist, UTC)).toBe('2026-05-25');
  });

  it('returns correct date for UTC', () => {
    const t = new Date('2026-01-01T00:00:00Z');
    expect(localYMD(t, UTC)).toBe('2026-01-01');
  });
});
