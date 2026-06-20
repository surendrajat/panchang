// Local horizontal coordinates for the Sky-dome view. Sanity checks against
// well-known facts (Sun high near local noon, below the horizon at midnight).
import { describe, it, expect } from 'vitest';
import { bodyAltAz, bodyArc, starAltAz } from '$lib/astro';

// Bengaluru ≈ 12.97°N, 77.59°E (IST = UTC+5:30).
const LAT = 12.97;
const LON = 77.59;

describe('bodyAltAz', () => {
  it('puts the Sun high near local noon and below the horizon at local midnight', () => {
    const noon = new Date('2026-06-21T06:30:00Z'); // ~12:00 IST
    const midnight = new Date('2026-06-20T18:30:00Z'); // 00:00 IST
    const sunNoon = bodyAltAz('sun', noon, LAT, LON);
    const sunMidnight = bodyAltAz('sun', midnight, LAT, LON);
    expect(sunNoon.altitude).toBeGreaterThan(70); // near-overhead in late June at ~13°N
    expect(sunMidnight.altitude).toBeLessThan(0);
    expect(sunNoon.azimuth).toBeGreaterThanOrEqual(0);
    expect(sunNoon.azimuth).toBeLessThanOrEqual(360);
  });

  it('returns an altitude in [-90, 90] for the Moon', () => {
    const { altitude } = bodyAltAz('moon', new Date('2026-06-21T06:30:00Z'), LAT, LON);
    expect(altitude).toBeGreaterThanOrEqual(-90);
    expect(altitude).toBeLessThanOrEqual(90);
  });
});

describe('bodyArc (sky-dome path bracketing)', () => {
  it('brackets the Sun above the horizon for ~one daytime arc', () => {
    const center = new Date('2026-06-21T06:30:00Z').getTime(); // ~noon IST
    const arc = bodyArc('sun', center, LAT, LON);
    expect(arc).not.toBeNull();
    if (!arc) return;
    expect(arc.setMs).toBeGreaterThan(arc.riseMs);
    const hours = (arc.setMs - arc.riseMs) / 3_600_000;
    expect(hours).toBeGreaterThan(10); // ~12.5 h of June daylight at ~13°N
    expect(hours).toBeLessThan(14);
    // Sun is up at the arc midpoint, and down half an hour before it begins
    expect(bodyAltAz('sun', new Date((arc.riseMs + arc.setMs) / 2), LAT, LON).altitude).toBeGreaterThan(0);
    expect(bodyAltAz('sun', new Date(arc.riseMs - 1_800_000), LAT, LON).altitude).toBeLessThan(1);
  });
});

describe('starAltAz', () => {
  it('returns an altitude within [-90, 90]', () => {
    // Sirius (J2000): RA 6.752 h, Dec −16.72°
    const { altitude } = starAltAz(6.752, -16.72, new Date('2026-06-21T18:00:00Z'), LAT, LON);
    expect(altitude).toBeGreaterThanOrEqual(-90);
    expect(altitude).toBeLessThanOrEqual(90);
  });
});
