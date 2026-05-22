// Quick sanity test: panchanga computes for Bengaluru today without throwing
// and returns plausible values. This exists to catch wiring problems before
// we layer on the regression fixture suite.

import { describe, it, expect } from 'vitest';
import { computePanchanga } from '$lib/panchanga';

const BENGALURU = {
  name: 'Bengaluru, India',
  latitude: 12.9716,
  longitude: 77.5946,
  altitude: 920,
  timezone: 'Asia/Kolkata',
};

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
});
