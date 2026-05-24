// Quick sanity test: panchanga computes for Bengaluru today without throwing
// and returns plausible values. This exists to catch wiring problems before
// we layer on the regression fixture suite.

import { describe, it, expect } from 'vitest';
import { civilYMDInZone } from '$lib/astro';
import { computeMonth, computePanchanga } from '$lib/panchanga';
import { BENGALURU } from '../helpers';

describe('computePanchanga smoke', () => {
  it('produces a fully-populated panchanga for Bengaluru today', () => {
    const p = computePanchanga(new Date(), BENGALURU);

    expect(p.tithi.index).toBeGreaterThanOrEqual(1);
    expect(p.tithi.index).toBeLessThanOrEqual(30);
    expect(p.tithi.name).toBeTruthy();
    expect(p.paksha === 'shukla' || p.paksha === 'krishna').toBe(true);

    expect(p.nakshatra.index).toBeGreaterThanOrEqual(1);
    expect(p.nakshatra.index).toBeLessThanOrEqual(27);
    expect(p.nakshatra.pada).toBeGreaterThanOrEqual(1);
    expect(p.nakshatra.pada).toBeLessThanOrEqual(4);

    expect(p.yoga.index).toBeGreaterThanOrEqual(1);
    expect(p.yoga.index).toBeLessThanOrEqual(27);

    expect(p.karana.positionInCycle).toBeGreaterThanOrEqual(0);
    expect(p.karana.positionInCycle).toBeLessThanOrEqual(59);

    expect(p.sunrise).not.toBeNull();
    expect(p.sunset).not.toBeNull();
    expect(p.sunset!.getTime()).toBeGreaterThan(p.sunrise!.getTime());

    expect(p.muhurta.rahuKaal.end.getTime()).toBeGreaterThan(p.muhurta.rahuKaal.start.getTime());
    expect(p.masa.index).toBeGreaterThanOrEqual(1);
    expect(p.masa.index).toBeLessThanOrEqual(12);

    expect(p.moonPhase.illumination).toBeGreaterThanOrEqual(0);
    expect(p.moonPhase.illumination).toBeLessThanOrEqual(1);
  });

  it('tithi end-time is in the future from the anchor and within 30 hours', () => {
    const p = computePanchanga(new Date('2026-05-20T06:00:00Z'), BENGALURU);
    const anchor = p.sunrise ?? p.date;
    const dt = p.tithi.endTime.getTime() - anchor.getTime();
    expect(dt).toBeGreaterThan(0);
    expect(dt).toBeLessThan(30 * 3600_000);
  });

  it('computeMonth preserves civil month boundaries in extreme time zones', () => {
    const kiritimati = {
      name: 'Kiritimati',
      latitude: 1.8721,
      longitude: -157.4278,
      altitude: 0,
      timezone: 'Pacific/Kiritimati',
    };
    const baker = {
      name: 'Baker Island',
      latitude: 0.1936,
      longitude: -176.4769,
      altitude: 0,
      timezone: 'Etc/GMT+12',
    };

    for (const location of [kiritimati, baker]) {
      const days = computeMonth(2026, 1, location);
      expect(civilYMDInZone(days[0].date, location.timezone)).toMatchObject({
        year: 2026,
        month: 1,
        day: 1,
      });
      expect(civilYMDInZone(days[days.length - 1].date, location.timezone)).toMatchObject({
        year: 2026,
        month: 1,
        day: 31,
      });
    }
  });
});
