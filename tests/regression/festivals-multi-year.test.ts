// Multi-year festival regression. Runs `computePanchanga` across
// 2015-2028 and compares the computed festival dates to authoritative
// Drik Panchang values from `tests/fixtures/festivals-multi-year.ts`.
//
// Two-tier verdict:
//   - For festivals without a known tiebreaker limitation, a mismatch
//     is a hard FAIL.
//   - For festivals with `knownLimitation` set, a mismatch is recorded
//     and reported as a SOFT failure (the test does NOT fail, but the
//     count is asserted to not silently grow). This lets us track
//     accuracy progress without breaking CI on a documented gap.

import { describe, it, expect } from 'vitest';
import { findFestivals } from '$lib/panchanga';
import { FESTIVAL_FIXTURES } from '../fixtures/festivals-multi-year';

const DELHI = {
  name: 'New Delhi, India',
  latitude: 28.6139,
  longitude: 77.209,
  altitude: 216,
  timezone: 'Asia/Kolkata',
};

function ymd(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: DELHI.timezone }).format(d);
}

interface YearResult {
  key: string;
  year: number;
  expected: string;
  actual: string | null;
  matched: boolean;
  isKnownLimitation: boolean;
}

describe('Festival accuracy (2015-2028 Drik comparison)', () => {
  // Pre-compute all years once so the test is fast.
  const COMPUTED_BY_YEAR = new Map<number, Map<string, string>>();
  const allYears = new Set<number>();
  for (const f of FESTIVAL_FIXTURES) {
    for (const y of Object.keys(f.drik)) allYears.add(Number(y));
  }
  for (const year of Array.from(allYears).sort()) {
    const occ = findFestivals(
      new Date(Date.UTC(year, 0, 1)),
      new Date(Date.UTC(year, 11, 31)),
      DELHI,
      { monthSystem: 'purnimanta' },
    );
    const byKey = new Map<string, string>();
    for (const o of occ) {
      if (!byKey.has(o.key)) byKey.set(o.key, ymd(o.date));
    }
    COMPUTED_BY_YEAR.set(year, byKey);
  }

  const results: YearResult[] = [];
  for (const f of FESTIVAL_FIXTURES) {
    for (const [yearStr, expected] of Object.entries(f.drik)) {
      const year = Number(yearStr);
      const actual = COMPUTED_BY_YEAR.get(year)?.get(f.key) ?? null;
      results.push({
        key: f.key,
        year,
        expected,
        actual,
        matched: actual === expected,
        isKnownLimitation: !!f.knownLimitation,
      });
    }
  }

  it('strict festivals (no known tiebreaker) match Drik exactly', () => {
    const strict = results.filter((r) => !r.isKnownLimitation);
    const failures = strict.filter((r) => !r.matched);
    const msg = failures
      .map((r) => `${r.key} ${r.year}: expected ${r.expected}, got ${r.actual ?? 'MISSING'}`)
      .join('\n');
    expect(failures.length, `\n${msg}\n(${failures.length} of ${strict.length} strict checks)`).toBe(
      0,
    );
  });

  it('tiebreaker-dependent festivals: documented Drik dates pin baseline accuracy', () => {
    // Festivals whose Drik date uses Pradosha / Madhyahna / Nishita /
    // Aparahna / Chandrodaya rules we have not implemented yet. The
    // baseline pass count is recorded; if it drops, something
    // regressed even in the no-tiebreaker majority of cases.
    const soft = results.filter((r) => r.isKnownLimitation);
    const passes = soft.filter((r) => r.matched).length;
    const BASELINE_MIN_PASSES = 70; // Current accuracy floor; bump as rules land.
    expect(passes, `${passes} / ${soft.length} tiebreaker-dependent festivals match`).toBeGreaterThanOrEqual(
      BASELINE_MIN_PASSES,
    );
  });

  it('summary', () => {
    const strict = results.filter((r) => !r.isKnownLimitation);
    const strictPass = strict.filter((r) => r.matched).length;
    const soft = results.filter((r) => r.isKnownLimitation);
    const softPass = soft.filter((r) => r.matched).length;
    const total = results.length;
    const totalPass = strictPass + softPass;

    // Per-festival breakdown so the test output captures *which*
    // festivals diverge, not just the overall count.
    const byKey = new Map<string, { pass: number; total: number }>();
    for (const r of results) {
      const entry = byKey.get(r.key) ?? { pass: 0, total: 0 };
      entry.total++;
      if (r.matched) entry.pass++;
      byKey.set(r.key, entry);
    }
    const breakdown = Array.from(byKey.entries())
      .sort()
      .map(
        ([k, v]) =>
          `    ${k.padEnd(24)} ${String(v.pass).padStart(2)} / ${v.total}` +
          (v.pass < v.total ? '  ← diverges' : ''),
      )
      .join('\n');

    // eslint-disable-next-line no-console
    console.log(
      `\n=== Festival audit summary (${total} checks across 2015-2028) ===\n` +
        `  Strict festivals:        ${strictPass} / ${strict.length} pass (${((strictPass / strict.length) * 100).toFixed(1)}%)\n` +
        `  Tiebreaker-dependent:    ${softPass} / ${soft.length} pass (${((softPass / soft.length) * 100).toFixed(1)}%)\n` +
        `  Overall:                 ${totalPass} / ${total} pass (${((totalPass / total) * 100).toFixed(1)}%)\n\n` +
        `  Per-festival breakdown:\n${breakdown}`,
    );
  });
});
