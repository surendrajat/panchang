// Regression: Krishna-paksha festivals must fire on exactly one civil
// date per lunar year, regardless of the month system the user has
// selected. The previous bug was that `(Ashvina || Kartika)` matchers
// fired twice for a Purnimanta user because the Purnimanta system
// relabels each Krishna paksha as the next month — so two physical lunar
// months (Bhadrapada-krishna and Ashvina-krishna in Amanta) both got
// the display name "Kartika" or "Ashvina" depending on which side of
// the rule's OR.

import { describe, it, expect } from 'vitest';
import { findFestivals } from '$lib/panchanga';
import { DELHI } from '../helpers';

const KRISHNA_PAKSHA_FESTIVALS = [
  'maha_shivaratri',
  'holi',
  'krishna_janmashtami',
  'karva_chauth',
  'dhanteras',
  'naraka_chaturdashi',
  'diwali',
];

const ONCE_PER_YEAR_FESTIVALS = [
  ...KRISHNA_PAKSHA_FESTIVALS,
  'makara_sankranti',
  'pongal',
  'lohri',
];

describe('Krishna-paksha festivals fire exactly once per year', () => {
  for (const monthSystem of ['amanta', 'purnimanta'] as const) {
    for (const year of [2025, 2026]) {
      it(`${year}, ${monthSystem}`, () => {
        const from = new Date(Date.UTC(year, 0, 1));
        const to = new Date(Date.UTC(year, 11, 31));
        const all = findFestivals(from, to, DELHI, { monthSystem });

        for (const key of ONCE_PER_YEAR_FESTIVALS) {
          const occurrences = all.filter((o) => o.key === key);
          expect(
            occurrences.length,
            `${key} (${monthSystem}, ${year}) fired ${occurrences.length} times: ${occurrences
              .map((o) => o.date.toISOString().slice(0, 10))
              .join(', ')}`,
          ).toBeLessThanOrEqual(1);
        }
      });
    }
  }

  it('Diwali falls on the same physical date in Amanta and Purnimanta', () => {
    const from = new Date(Date.UTC(2026, 0, 1));
    const to = new Date(Date.UTC(2026, 11, 31));
    const amanta = findFestivals(from, to, DELHI, { monthSystem: 'amanta' }).filter(
      (o) => o.key === 'diwali',
    );
    const purnimanta = findFestivals(from, to, DELHI, { monthSystem: 'purnimanta' }).filter(
      (o) => o.key === 'diwali',
    );
    expect(amanta.length).toBe(1);
    expect(purnimanta.length).toBe(1);
    expect(amanta[0].date.toISOString().slice(0, 10)).toBe(
      purnimanta[0].date.toISOString().slice(0, 10),
    );
  });
});
