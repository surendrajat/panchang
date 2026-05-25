// Regression: in Purnimanta mode the masa label must move forward
// monotonically across an Adhika month boundary. The earlier bug
// shifted Adhika-Jyeshtha's Krishna paksha to "Ashadha" (since
// Purnimanta normally relabels Krishna as next month), then the next
// lunar month became "Jyeshtha" — reading as Ashadha → Jyeshtha in
// adjacent days, which is impossible.

import { describe, it, expect } from 'vitest';
import { computePanchanga } from '$lib/panchanga';
import { MS_PER_DAY } from '$lib/astro';
import { DELHI } from '../helpers';

const MASA_ORDER = [
  'Chaitra',
  'Vaishakha',
  'Jyeshtha',
  'Ashadha',
  'Shravana',
  'Bhadrapada',
  'Ashvina',
  'Kartika',
  'Margashirsha',
  'Pausha',
  'Magha',
  'Phalguna',
];

function masaOrdinal(name: string): number {
  return MASA_ORDER.indexOf(name);
}

describe('Purnimanta Adhika-Jyeshtha 2026 monotonic transition', () => {
  it('does not regress Jyeshtha → Ashadha → Jyeshtha across the new-moon boundary', () => {
    // Three days around the Adhika-Jyeshtha → Nija-Jyeshtha new moon.
    const days = [13, 14, 15, 16, 17].map((d) => {
      const date = new Date(Date.UTC(2026, 5, d, 12, 0, 0));
      const p = computePanchanga(date, DELHI, { monthSystem: 'purnimanta' });
      return { day: d, masa: p.masa.name, adhika: p.masa.isAdhika };
    });

    // Pre-boundary days are Adhika Jyeshtha
    for (const d of days.slice(0, 3)) {
      expect(d.masa, `June ${d.day}`).toBe('Jyeshtha');
      expect(d.adhika, `June ${d.day} should be Adhika`).toBe(true);
    }
    // Post-boundary days are Nija Jyeshtha (still Jyeshtha, no Adhika)
    for (const d of days.slice(3)) {
      expect(d.masa, `June ${d.day}`).toBe('Jyeshtha');
      expect(d.adhika, `June ${d.day} should NOT be Adhika`).toBe(false);
    }
  });

  it('masa index never moves backward over 60 consecutive days in Purnimanta', () => {
    // Stronger invariant: across the whole Adhika-Jyeshtha → Nija
    // window, the displayed masa ordinal must not decrease (it can
    // repeat on Adhika boundaries, but never jump backward).
    const start = new Date(Date.UTC(2026, 4, 15, 12, 0, 0));
    let prevOrd = -1;
    for (let i = 0; i < 90; i++) {
      const date = new Date(start.getTime() + i * MS_PER_DAY);
      const p = computePanchanga(date, DELHI, { monthSystem: 'purnimanta' });
      const ord = masaOrdinal(p.masa.name);
      // Wrap from Phalguna(11) back to Chaitra(0) is allowed.
      const wrapped = prevOrd === 11 && ord === 0;
      if (!wrapped) {
        expect(
          ord >= prevOrd,
          `Day ${date.toISOString().slice(0, 10)}: masa ${p.masa.name} (ord=${ord}) ` +
            `moved backward from prev ord=${prevOrd}`,
        ).toBe(true);
      }
      prevOrd = ord;
    }
  });
});
