// Multi-year festival regression. Runs `computePanchanga` across
// 2015-2028 and compares the computed festival dates to authoritative
// fixture values from `tests/fixtures/festivals-multi-year.ts`.
//
// Two-tier labels remain useful in the summary, but both tiers are now hard
// failures for this default-convention corpus. Known unresolved edge cases
// belong in separate extended-year fixtures, not as tolerated drift here.

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
  auditTier: 'strict' | 'tiebreaker';
}

describe('Festival accuracy (2015-2028 default-convention comparison)', () => {
  // Pre-compute all years once so the test is fast.
  const COMPUTED_BY_YEAR = new Map<number, Map<string, string>>();
  const allYears = new Set<number>();
  for (const f of FESTIVAL_FIXTURES) {
    for (const y of Object.keys(f.expected)) allYears.add(Number(y));
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
    for (const [yearStr, expected] of Object.entries(f.expected)) {
      const year = Number(yearStr);
      const actual = COMPUTED_BY_YEAR.get(year)?.get(f.key) ?? null;
      results.push({
        key: f.key,
        year,
        expected,
        actual,
        matched: actual === expected,
        auditTier: f.auditTier ?? 'strict',
      });
    }
  }

  it('strict festivals (no known tiebreaker) match expected dates exactly', () => {
    const strict = results.filter((r) => r.auditTier === 'strict');
    const failures = strict.filter((r) => !r.matched);
    const msg = failures
      .map((r) => `${r.key} ${r.year}: expected ${r.expected}, got ${r.actual ?? 'MISSING'}`)
      .join('\n');
    expect(
      failures.length,
      `\n${msg}\n(${failures.length} of ${strict.length} strict checks)`,
    ).toBe(0);
  });

  it('tiebreaker-dependent festivals match expected dates exactly', () => {
    // Festivals whose date uses Pradosha / Madhyahna / Nishita /
    // Aparahna / Chandrodaya / Bhadra rules. They are more fragile than
    // sunrise-tithi fixtures, so keep the label in summary output, but
    // fail the test on any mismatch.
    const soft = results.filter((r) => r.auditTier === 'tiebreaker');
    const failures = soft.filter((r) => !r.matched);
    const msg = failures
      .map((r) => `${r.key} ${r.year}: expected ${r.expected}, got ${r.actual ?? 'MISSING'}`)
      .join('\n');
    expect(
      failures.length,
      `\n${msg}\n(${failures.length} of ${soft.length} tiebreaker checks)`,
    ).toBe(0);
  });

  it('pins the default Janmashtami convention to Smarta dates', () => {
    expect(COMPUTED_BY_YEAR.get(2016)?.get('krishna_janmashtami')).toBe('2016-08-24');
    expect(COMPUTED_BY_YEAR.get(2020)?.get('krishna_janmashtami')).toBe('2020-08-11');
  });

  it('summary', () => {
    const strict = results.filter((r) => r.auditTier === 'strict');
    const strictPass = strict.filter((r) => r.matched).length;
    const soft = results.filter((r) => r.auditTier === 'tiebreaker');
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
