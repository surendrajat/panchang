import { describe, it, expect } from 'vitest';
import { computePanchanga } from '$lib/panchanga';
import { NAKSHATRA_NAMES } from '$lib/panchanga/names';
import { BENGALURU, DELHI } from '../helpers';

describe('nakshatra computation', () => {
  it('index is in 1..27 and pada in 1..4', () => {
    for (const isoDate of ['2024-01-15', '2024-08-26', '2025-03-14', '2025-11-01', '2026-05-20']) {
      const p = computePanchanga(new Date(`${isoDate}T06:00:00+05:30`), BENGALURU);
      expect(p.nakshatra.index).toBeGreaterThanOrEqual(1);
      expect(p.nakshatra.index).toBeLessThanOrEqual(27);
      expect(p.nakshatra.pada).toBeGreaterThanOrEqual(1);
      expect(p.nakshatra.pada).toBeLessThanOrEqual(4);
    }
  });

  it('nakshatra end-time is within ~24 hours of anchor', () => {
    const p = computePanchanga(new Date('2026-05-20T06:00:00+05:30'), BENGALURU);
    const anchor = p.sunrise!.getTime();
    const dt = p.nakshatra.endTime.getTime() - anchor;
    expect(dt).toBeGreaterThan(0);
    expect(dt).toBeLessThan(28 * 3600_000);
  });

  it('name matches NAKSHATRA_NAMES at index-1', () => {
    const p = computePanchanga(new Date('2026-05-20T06:00:00+05:30'), BENGALURU);
    expect(p.nakshatra.name).toBe(NAKSHATRA_NAMES[p.nakshatra.index - 1]);
  });

  it('fraction is in [0, 1)', () => {
    for (const isoDate of ['2024-01-15', '2025-06-15', '2026-03-01']) {
      const p = computePanchanga(new Date(`${isoDate}T06:00:00+05:30`), DELHI);
      expect(p.nakshatra.fraction).toBeGreaterThanOrEqual(0);
      expect(p.nakshatra.fraction).toBeLessThan(1);
    }
  });

  it('nearly all 27 nakshatras appear across a sidereal month at daily sampling', () => {
    // Daily sunrise sampling may miss 1 nakshatra when the moon is near
    // perigee: at ~15°/day a nakshatra of 13.33° lasts only ~21h and can
    // fall entirely between two consecutive sunrises. Assert >= 26 to
    // capture this real phenomenon without being brittle.
    const seen = new Set<string>();
    const start = new Date('2026-04-01T06:00:00+05:30').getTime();
    for (let d = 0; d < 35; d++) {
      const p = computePanchanga(new Date(start + d * 86400_000), DELHI);
      seen.add(p.nakshatra.name);
    }
    expect(seen.size).toBeGreaterThanOrEqual(26);
  });

  it('Revati → Ashwini wrap-around is correctly named', () => {
    // Scan for Revati and the next day to verify index resets to 1
    let foundRevati = false;
    for (let d = 0; d < 30; d++) {
      const ms = new Date('2026-04-01T06:00:00+05:30').getTime() + d * 86400_000;
      const p = computePanchanga(new Date(ms), DELHI);
      if (p.nakshatra.name === 'Revati') {
        foundRevati = true;
        expect(p.nakshatra.index).toBe(27);
      }
      if (foundRevati && p.nakshatra.name === 'Ashwini') {
        expect(p.nakshatra.index).toBe(1);
        break;
      }
    }
  });
});
