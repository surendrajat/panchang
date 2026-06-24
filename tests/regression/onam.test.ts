// Onam / Thiruvonam regression — the most intricate solar-festival tiebreaker had
// ZERO date coverage (festivals-multi-year has no thiruvonam fixture, and it dedups
// occurrences by key so it can't see a double-fire anyway). Onam is the Thiruvonam
// nakshatra at midday in Chingam (Sun in Simha), taking the LATER day when it
// qualifies on two adjacent middays. The bug: both adjacent days fired (e.g. a
// Kerala location in 2019 produced Sep 10 AND Sep 11). This pins it to exactly one.
import { describe, it, expect } from 'vitest';
import { findFestivals, type Location } from '$lib/panchanga';

const KOCHI: Location = { name: 'Kochi', latitude: 9.9312, longitude: 76.2673, timezone: 'Asia/Kolkata' };

const ymd = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: KOCHI.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);

function onamDates(year: number): string[] {
  return findFestivals(new Date(Date.UTC(year, 0, 1)), new Date(Date.UTC(year, 11, 31)), KOCHI, {})
    .filter((o) => o.key === 'thiruvonam')
    .map((o) => ymd(o.date))
    .sort();
}

describe('Onam / Thiruvonam — exactly once per year (no two-adjacent-midday double-fire)', () => {
  for (const year of [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027]) {
    it(`${year}: resolves to exactly one Thiruvonam`, () => {
      const dates = onamDates(year);
      expect(dates.length, `got ${JSON.stringify(dates)}`).toBe(1);
    });
  }

  it('2019 (the reproduced bug) fires on the LATER day, Sep 11 — not Sep 10', () => {
    expect(onamDates(2019)).toEqual(['2019-09-11']);
  });
});
