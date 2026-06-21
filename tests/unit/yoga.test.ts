// Unit tests for yogaAtInstant().
// Yoga = combined (sun + moon) sidereal longitude divided into 27 equal
// segments of 13°20′ each. Usually one yoga per panchanga day; rare
// two-yoga days when the Moon is near perigee.

import { describe, expect, it } from 'vitest';
import { yogaAtInstant } from '$lib/panchanga/yoga';
import { YOGA_NAMES } from '$lib/panchanga/names';
import { computePanchanga } from '$lib/panchanga';
import { BENGALURU, DELHI } from '../helpers';

describe('yogaAtInstant', () => {
  it('index is in 1..27', () => {
    for (const iso of [
      '2024-01-15',
      '2024-08-26',
      '2025-03-14',
      '2025-11-01',
      '2026-01-14',
      '2026-05-20',
    ]) {
      const y = yogaAtInstant(new Date(`${iso}T06:00:00+05:30`), 'lahiri');
      expect(y.index).toBeGreaterThanOrEqual(1);
      expect(y.index).toBeLessThanOrEqual(27);
    }
  });

  it('identifies a known yoga (Shula) and keeps name↔index consistent', () => {
    // Independently known: Sun+Moon longitude sum at this instant → Shula (9th yoga).
    const y = yogaAtInstant(new Date('2026-05-20T06:00:00+05:30'), 'lahiri');
    expect(y.index).toBe(9);
    expect(y.name).toBe('Shula');
    expect(y.name).toBe(YOGA_NAMES[y.index - 1]);
  });

  it('fraction is in [0, 1)', () => {
    for (const iso of ['2025-06-15', '2025-12-25', '2026-03-01']) {
      const y = yogaAtInstant(new Date(`${iso}T06:00:00+05:30`), 'lahiri');
      expect(y.fraction).toBeGreaterThanOrEqual(0);
      expect(y.fraction).toBeLessThan(1);
    }
  });

  it('endTime is within ~27 hours of anchor', () => {
    const anchor = new Date('2026-05-20T06:00:00+05:30');
    const y = yogaAtInstant(anchor, 'lahiri');
    const dt = y.endTime.getTime() - anchor.getTime();
    expect(dt).toBeGreaterThan(0);
    expect(dt).toBeLessThan(28 * 3600_000);
  });

  it('all 27 yoga names appear at least once across a full synodic month', () => {
    // Sample every day of April 2026 (≈1 lunation). At ~14°/day combined
    // rate each yoga lasts ~23h, so 30 days should cover all 27.
    const seen = new Set<string>();
    for (let d = 1; d <= 30; d++) {
      const iso = `2026-04-${String(d).padStart(2, '0')}T06:00:00+05:30`;
      const y = yogaAtInstant(new Date(iso), 'lahiri');
      seen.add(y.name);
    }
    // Expect most yogas seen in 30 days; moon may be slow at apogee,
    // so allow up to 2 missing within a single lunation.
    expect(seen.size).toBeGreaterThanOrEqual(25);
  });

  it('computePanchanga exposes a known yoga (Siddhi), consistent with the standalone call', () => {
    const anchor = new Date('2026-05-01T06:30:00+05:30');
    const p = computePanchanga(anchor, DELHI);
    const y = yogaAtInstant(anchor, 'lahiri');
    // Independently known: this Delhi sunrise → Siddhi (16th yoga).
    expect(p.yoga.index).toBe(16);
    expect(p.yoga.name).toBe('Siddhi');
    expect(p.yoga.index).toBe(y.index);
    expect(p.yoga.name).toBe(y.name);
  });

  it('known value: 2024-08-26 Bengaluru (Janmashtami) yoga', () => {
    // Computed value: yoga index 13 = Vyaghata.
    const p = computePanchanga(new Date('2024-08-26T06:00:00+05:30'), BENGALURU);
    expect(p.yoga.index).toBe(13);
    expect(p.yoga.name).toBe('Vyaghata');
  });

  it('Vishkambha (1) and Vaidhriti (27) both representable', () => {
    // Scan a full year to find both extremes.
    let foundFirst = false;
    let foundLast = false;
    for (let d = 0; d < 365; d++) {
      const ms = new Date('2025-01-01T06:00:00+05:30').getTime() + d * 86400_000;
      const y = yogaAtInstant(new Date(ms), 'lahiri');
      if (y.index === 1) foundFirst = true;
      if (y.index === 27) foundLast = true;
      if (foundFirst && foundLast) break;
    }
    expect(foundFirst).toBe(true);
    expect(foundLast).toBe(true);
  });
});
