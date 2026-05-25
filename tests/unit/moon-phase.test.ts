// Unit tests for moonPhaseAtInstant().

import { describe, expect, it } from 'vitest';
import { moonPhaseAtInstant } from '$lib/panchanga/moon-phase';

// Known new moon: 2024-11-01 (Diwali Amavasya, near 0° elongation)
// Known full moon: 2025-03-14 (Holi Purnima, near 180° elongation)
// Known first quarter: around 2026-04-12

describe('moonPhaseAtInstant', () => {
  it('phaseAngle is in [0, 360)', () => {
    for (const iso of [
      '2024-01-15',
      '2024-08-26',
      '2024-11-01',
      '2025-03-14',
      '2025-06-15',
      '2026-05-20',
    ]) {
      const mp = moonPhaseAtInstant(new Date(`${iso}T06:00:00+05:30`));
      expect(mp.phaseAngle).toBeGreaterThanOrEqual(0);
      expect(mp.phaseAngle).toBeLessThan(360);
    }
  });

  it('illumination is in [0, 1]', () => {
    for (const iso of ['2024-11-01', '2025-03-14', '2026-05-20']) {
      const mp = moonPhaseAtInstant(new Date(`${iso}T06:00:00+05:30`));
      expect(mp.illumination).toBeGreaterThanOrEqual(0);
      expect(mp.illumination).toBeLessThanOrEqual(1);
    }
  });

  it('ageInDays is in [0, ~29.53)', () => {
    const mp = moonPhaseAtInstant(new Date('2026-05-20T06:00:00+05:30'));
    expect(mp.ageInDays).toBeGreaterThanOrEqual(0);
    expect(mp.ageInDays).toBeLessThan(30);
  });

  it('phaseName is one of the 8 standard names', () => {
    const PHASE_NAMES = new Set([
      'New Moon',
      'Waxing Crescent',
      'First Quarter',
      'Waxing Gibbous',
      'Full Moon',
      'Waning Gibbous',
      'Last Quarter',
      'Waning Crescent',
    ]);
    for (const iso of [
      '2024-01-15',
      '2024-08-26',
      '2024-11-01',
      '2025-03-14',
      '2025-06-15',
      '2026-01-14',
      '2026-05-20',
    ]) {
      const mp = moonPhaseAtInstant(new Date(`${iso}T06:00:00+05:30`));
      expect(PHASE_NAMES.has(mp.phaseName)).toBe(true);
    }
  });

  it('Diwali Amavasya 2024 is near New Moon (illumination < 0.1)', () => {
    const mp = moonPhaseAtInstant(new Date('2024-11-01T12:00:00+05:30'));
    expect(mp.illumination).toBeLessThan(0.1);
    expect(mp.phaseName).toBe('New Moon');
  });

  it('Holi Purnima 2025 is near Full Moon (illumination > 0.9)', () => {
    const mp = moonPhaseAtInstant(new Date('2025-03-14T12:00:00+05:30'));
    expect(mp.illumination).toBeGreaterThan(0.9);
    expect(mp.phaseName).toBe('Full Moon');
  });

  it('all 8 phase names appear across a full synodic month (~30 days)', () => {
    // Start from new moon 2024-11-01, sample every 4 days to hit each phase
    const seen = new Set<string>();
    const start = new Date('2024-11-01T12:00:00+05:30').getTime();
    for (let d = 0; d < 30; d++) {
      const mp = moonPhaseAtInstant(new Date(start + d * 86400_000));
      seen.add(mp.phaseName);
    }
    expect(seen.size).toBe(8);
  });

  it('boundary angles resolve to correct phase names', () => {
    // Test the boundary logic directly via known dates that fall near each boundary
    // New Moon: phaseAngle near 0 or 360
    // Full Moon: phaseAngle near 180
    // We can't inject angle directly, so we verify the phase function output
    // for dates known to be near each phase.

    const cases: [string, string][] = [
      ['2024-11-01', 'New Moon'], // Amavasya
      ['2025-03-14', 'Full Moon'], // Purnima
    ];
    for (const [iso, expectedPhase] of cases) {
      const mp = moonPhaseAtInstant(new Date(`${iso}T12:00:00+05:30`));
      expect(mp.phaseName).toBe(expectedPhase);
    }
  });

  it('illumination increases from new moon to full moon', () => {
    // New moon ~2024-11-01, full moon ~2024-11-15. Illumination should rise.
    const newMoon = moonPhaseAtInstant(new Date('2024-11-01T12:00:00+05:30'));
    const midWaxing = moonPhaseAtInstant(new Date('2024-11-08T12:00:00+05:30'));
    const fullMoon = moonPhaseAtInstant(new Date('2024-11-15T12:00:00+05:30'));
    expect(midWaxing.illumination).toBeGreaterThan(newMoon.illumination);
    expect(fullMoon.illumination).toBeGreaterThan(midWaxing.illumination);
  });
});
