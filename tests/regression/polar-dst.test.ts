// Regression tests for polar latitudes and DST-boundary behavior.
//
// These tests verify correctness of invariants rather than exact
// Drik-Panchang timestamps, since authoritative values for polar
// latitudes are not available in the fixture corpus.

import { describe, it, expect } from 'vitest';
import { computePanchanga } from '$lib/panchanga';
import { VARA_NAMES } from '$lib/panchanga/names';
import type { Location } from '$lib/panchanga';

const TROMSO: Location = {
  name: 'Tromsø, Norway',
  latitude: 69.6489,
  longitude: 18.9551,
  altitude: 10,
  timezone: 'Europe/Oslo',
};

const LONDON: Location = {
  name: 'London, UK',
  latitude: 51.5074,
  longitude: -0.1278,
  altitude: 11,
  timezone: 'Europe/London',
};

const NEW_YORK: Location = {
  name: 'New York, USA',
  latitude: 40.7128,
  longitude: -74.006,
  altitude: 10,
  timezone: 'America/New_York',
};

// ─── Polar night (Tromsø Dec 21) ────────────────────────────────────────────

describe('polar night — Tromsø Dec 21', () => {
  const p = computePanchanga(new Date('2026-12-21T12:00:00+01:00'), TROMSO);

  it('does not throw', () => {
    expect(p).toBeDefined();
  });

  it('sunrise is null (no sun above horizon)', () => {
    // Tromsø is above Arctic Circle; no civil sunrise on winter solstice.
    expect(p.sunrise).toBeNull();
  });

  it('vara falls back to the noon weekday', () => {
    // With null sunrise the weekday is derived from local noon fallback.
    expect(VARA_NAMES).toContain(p.vara);
    // Dec 21 2026 is a Monday
    expect(p.vara).toBe('monday');
  });

  it('all five angas are still populated', () => {
    expect(p.tithi.index).toBeGreaterThanOrEqual(1);
    expect(p.tithi.index).toBeLessThanOrEqual(30);
    expect(p.nakshatra.index).toBeGreaterThanOrEqual(1);
    expect(p.nakshatra.index).toBeLessThanOrEqual(27);
    expect(p.yoga.index).toBeGreaterThanOrEqual(1);
    expect(p.yoga.index).toBeLessThanOrEqual(27);
    expect(p.karana.positionInCycle).toBeGreaterThanOrEqual(0);
    expect(p.karana.positionInCycle).toBeLessThanOrEqual(59);
    expect(VARA_NAMES).toContain(p.vara);
  });

  it('moonPhase illumination is in [0, 1]', () => {
    expect(p.moonPhase.illumination).toBeGreaterThanOrEqual(0);
    expect(p.moonPhase.illumination).toBeLessThanOrEqual(1);
  });
});

// ─── Polar summer (Tromsø Jun 21) ───────────────────────────────────────────

describe('polar summer — Tromsø Jun 21 (midnight sun)', () => {
  const p = computePanchanga(new Date('2026-06-21T12:00:00+02:00'), TROMSO);

  it('does not throw', () => {
    expect(p).toBeDefined();
  });

  it('midnight sun: no sunrise/sunset event, but the panchanga still computes', () => {
    // In midsummer Tromsø the sun never crosses the horizon, so there is no
    // rise or set event — both are null. The engine must tolerate this; the
    // angas (below) still come from the elongation math, not from sunrise.
    expect(p.sunrise).toBeNull();
    expect(p.sunset).toBeNull();
  });

  it('all five angas are populated', () => {
    expect(p.tithi.index).toBeGreaterThanOrEqual(1);
    expect(p.nakshatra.index).toBeGreaterThanOrEqual(1);
    expect(p.yoga.index).toBeGreaterThanOrEqual(1);
    expect(p.karana.positionInCycle).toBeGreaterThanOrEqual(0);
    expect(VARA_NAMES).toContain(p.vara);
  });
});

// ─── DST boundaries ─────────────────────────────────────────────────────────

describe('DST boundary — London spring forward (2026-03-29)', () => {
  // UK clocks spring forward 01:00 → 02:00 UTC on last Sunday of March.
  const p = computePanchanga(new Date('2026-03-29T06:00:00+01:00'), LONDON);

  it('produces a valid panchanga without throwing', () => {
    expect(p.tithi.index).toBeGreaterThanOrEqual(1);
    expect(p.tithi.index).toBeLessThanOrEqual(30);
  });

  it('vara is correct (Mar 29 2026 is a Sunday)', () => {
    expect(p.vara).toBe('sunday');
  });

  it('sunrise and sunset both exist', () => {
    expect(p.sunrise).not.toBeNull();
    expect(p.sunset).not.toBeNull();
    expect(p.sunset!.getTime()).toBeGreaterThan(p.sunrise!.getTime());
  });
});

describe('DST boundary — London fall back (2026-10-25)', () => {
  // UK clocks fall back 02:00 → 01:00 on last Sunday of October.
  const p = computePanchanga(new Date('2026-10-25T06:00:00+01:00'), LONDON);

  it('produces a valid panchanga without throwing', () => {
    expect(p.tithi.index).toBeGreaterThanOrEqual(1);
  });

  it('vara is correct (Oct 25 2026 is a Sunday)', () => {
    expect(p.vara).toBe('sunday');
  });

  it('sunrise is before sunset', () => {
    expect(p.sunrise).not.toBeNull();
    expect(p.sunset).not.toBeNull();
    expect(p.sunset!.getTime()).toBeGreaterThan(p.sunrise!.getTime());
  });
});

describe('DST boundary — New York fall back (2026-11-01)', () => {
  // US clocks fall back first Sunday of November.
  const p = computePanchanga(new Date('2026-11-01T06:00:00-04:00'), NEW_YORK);

  it('produces a valid panchanga', () => {
    expect(p.tithi.index).toBeGreaterThanOrEqual(1);
    expect(p.tithi.index).toBeLessThanOrEqual(30);
  });

  it('vara is correct (Nov 1 2026 is a Sunday)', () => {
    expect(p.vara).toBe('sunday');
  });

  it('tithi end-time is within 30h of anchor', () => {
    const anchor = (p.sunrise ?? p.date).getTime();
    const dt = p.tithi.endTime.getTime() - anchor;
    expect(dt).toBeGreaterThan(0);
    expect(dt).toBeLessThan(30 * 3600_000);
  });
});

// ─── Consistent panchanga across DST ────────────────────────────────────────

describe('DST does not cause off-by-one date in panchanga', () => {
  it('London: same civil date before and after spring-forward ambiguity', () => {
    // The date field must be the local civil date, not a UTC off-by-one.
    const p = computePanchanga(new Date('2026-03-29T00:30:00Z'), LONDON);
    // 00:30 UTC = 01:30 BST (already in BST after spring-forward at 01:00 UTC)
    // The panchanga date should be 2026-03-29 in London timezone.
    const localDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: LONDON.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(p.date);
    expect(localDate).toBe('2026-03-29');
  });
});

describe('DST spring-forward AT MIDNIGHT does not crash the day', () => {
  // Some zones jump 00:00 → 01:00, so local midnight does not exist on the
  // transition date. The panchanga day still does — it must not throw.
  const cases: Array<[string, string, string]> = [
    ['America/Sao_Paulo', '2017-10-15T12:00:00-02:00', 'Sao Paulo'],
    ['America/Santiago', '2019-09-08T12:00:00-03:00', 'Santiago'],
    ['Asia/Beirut', '2026-03-29T12:00:00+03:00', 'Beirut'],
  ];
  for (const [tz, iso, name] of cases) {
    it(`${name}: midnight-gap day computes (no RangeError)`, () => {
      const loc: Location = { name, latitude: 0, longitude: 0, altitude: 0, timezone: tz };
      const p = computePanchanga(new Date(iso), loc);
      expect(p.tithi.index).toBeGreaterThanOrEqual(1);
      expect(p.tithi.index).toBeLessThanOrEqual(30);
    });
  }
});
