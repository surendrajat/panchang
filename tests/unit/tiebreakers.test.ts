// Unit tests for tiebreaker primitives. Each test pins the documented
// behavior of a specific rule (Bhadra cutoff, sankranti Madhya Nishi,
// sunrise fallback) with explicit input/output assertions on real
// astronomical instants.
//
// These tests guard against:
//   - silent regressions when refining a cutoff
//   - accidental rule swaps (e.g., 'earlier' ↔ 'later' pick)
//   - bhadra-detection drift (Vishti karana position math)

import { describe, expect, it } from 'vitest';
import {
  vyapiniMatchesForDate,
  bhadraAwareVyapiniMatchesForDate,
  bhadraAwareVyapiniWithSunriseFallback,
  sankrantiInto,
  type BhadraCutoff,
} from '$lib/panchanga/tiebreakers';
import { computePanchanga } from '$lib/panchanga';

const DELHI = {
  name: 'New Delhi, India',
  latitude: 28.6139,
  longitude: 77.209,
  altitude: 216,
  timezone: 'Asia/Kolkata',
};

// Builds a civil-midnight Date in Asia/Kolkata for the given YYYY-MM-DD.
function delhiMidnight(ymd: string): Date {
  return new Date(`${ymd}T00:00:00+05:30`);
}

describe('Bhadra-aware Holika Dahan (prahar4 cutoff)', () => {
  // 2024: Bhadra at Pradosha but ends ~23:13 (before Prahar 4 start
  // ~03:30 Mar 25). Same-day observance.
  it('2024 fires on Mar 24 (Bhadra ends before Prahar 4)', () => {
    expect(
      bhadraAwareVyapiniMatchesForDate(DELHI, delhiMidnight('2024-03-24'), 'pradosha', 15, 'prahar4'),
    ).toBe(true);
    expect(
      bhadraAwareVyapiniMatchesForDate(DELHI, delhiMidnight('2024-03-25'), 'pradosha', 15, 'prahar4'),
    ).toBe(false);
  });

  // 2016: Bhadra ends ~05:08 Mar 23 (well into Prahar 4). Shift to next
  // day — Drik fires Mar 23.
  it('2016 shifts to Mar 23 (Bhadra extends into Prahar 4)', () => {
    expect(
      bhadraAwareVyapiniMatchesForDate(DELHI, delhiMidnight('2016-03-22'), 'pradosha', 15, 'prahar4'),
    ).toBe(false);
    expect(
      bhadraAwareVyapiniMatchesForDate(DELHI, delhiMidnight('2016-03-23'), 'pradosha', 15, 'prahar4'),
    ).toBe(true);
  });

  // 2022: Bhadra ends 01:09 Mar 18, well before Prahar 4 (~03:30).
  // Drik fires Mar 17 — same day as Bhadra ends within Prahar 3.
  it('2022 fires on Mar 17 (Bhadra ends before Prahar 4)', () => {
    expect(
      bhadraAwareVyapiniMatchesForDate(DELHI, delhiMidnight('2022-03-17'), 'pradosha', 15, 'prahar4'),
    ).toBe(true);
    expect(
      bhadraAwareVyapiniMatchesForDate(DELHI, delhiMidnight('2022-03-18'), 'pradosha', 15, 'prahar4'),
    ).toBe(false);
  });
});

describe('Bhadra-aware Raksha Bandhan (prahar1 cutoff)', () => {
  // 2022: Bhadra at Aparahna, ends 20:51 (Prahar 1 end ~21:45). Same day.
  it('2022 fires on Aug 11 (Bhadra ends within Prahar 1)', () => {
    expect(
      bhadraAwareVyapiniMatchesForDate(DELHI, delhiMidnight('2022-08-11'), 'aparahna', 15, 'prahar1'),
    ).toBe(true);
    expect(
      bhadraAwareVyapiniMatchesForDate(DELHI, delhiMidnight('2022-08-12'), 'aparahna', 15, 'prahar1'),
    ).toBe(false);
  });

  // 2025: tithi-kshaya — Purnima doesn't span Aparahna on Aug 8 or 9.
  // Sunrise fallback fires Aug 9 (Purnima at sunrise).
  it('2025 fires on Aug 9 via sunrise fallback (tithi-kshaya)', () => {
    const p = computePanchanga(delhiMidnight('2025-08-09'), DELHI);
    expect(
      bhadraAwareVyapiniWithSunriseFallback(p, 'aparahna', 15, 'prahar1'),
    ).toBe(true);
    const pYesterday = computePanchanga(delhiMidnight('2025-08-08'), DELHI);
    expect(
      bhadraAwareVyapiniWithSunriseFallback(pYesterday, 'aparahna', 15, 'prahar1'),
    ).toBe(false);
  });
});

describe('Sankranti Madhya Nishi rule', () => {
  // Bisection-based transit JD compared against midpoint of night.
  // 2017: transit Jan 14 06:58 — well before any night cutoff.
  it('2017: transit at sunrise → Jan 14', () => {
    const match = sankrantiInto(9);
    const p = computePanchanga(delhiMidnight('2017-01-14'), DELHI);
    expect(match(p)).toBe(true);
  });

  // 2020: transit Jan 15 01:31 — after Madhya Nishi (00:30 IST).
  it('2020: transit after Madhya Nishi → Jan 15', () => {
    const match = sankrantiInto(9);
    const p14 = computePanchanga(delhiMidnight('2020-01-14'), DELHI);
    const p15 = computePanchanga(delhiMidnight('2020-01-15'), DELHI);
    expect(match(p14)).toBe(false);
    expect(match(p15)).toBe(true);
  });

  // 2015: transit Jan 14 18:42 — after sunset (17:45). Drik shifts
  // to Jan 15 (verified directly against drikpanchang.com).
  it('2015: transit after sunset → Jan 15', () => {
    const match = sankrantiInto(9);
    const p14 = computePanchanga(delhiMidnight('2015-01-14'), DELHI);
    const p15 = computePanchanga(delhiMidnight('2015-01-15'), DELHI);
    expect(match(p14)).toBe(false);
    expect(match(p15)).toBe(true);
  });

  // 2027: transit Jan 14 20:23 — also after sunset → Drik Jan 15.
  it('2027: transit after sunset → Jan 15', () => {
    const match = sankrantiInto(9);
    const p15 = computePanchanga(delhiMidnight('2027-01-15'), DELHI);
    expect(match(p15)).toBe(true);
  });
});

describe('Vyapini pick semantics', () => {
  // Holika Dahan 2024: Pradosha Mar 24 has Purnima (15) ; Pradosha
  // Mar 25 has Krishna 1 (16). With 'later' pick, Mar 24 fires
  // (today qualifies, tomorrow doesn't).
  it("'later' pick picks today when tomorrow's window has next tithi", () => {
    expect(
      vyapiniMatchesForDate(DELHI, delhiMidnight('2024-03-24'), 'pradosha', 15, 'later'),
    ).toBe(true);
    expect(
      vyapiniMatchesForDate(DELHI, delhiMidnight('2024-03-25'), 'pradosha', 15, 'later'),
    ).toBe(false);
  });
});

describe('BhadraCutoff matrix', () => {
  // Sanity: a Bhadra cutoff parameter accepts each documented value.
  it.each<BhadraCutoff>(['window', 'sunset', 'prahar1', 'prahar4'])('accepts %s', (cutoff) => {
    expect(() =>
      bhadraAwareVyapiniMatchesForDate(DELHI, delhiMidnight('2024-03-24'), 'pradosha', 15, cutoff),
    ).not.toThrow();
  });
});
