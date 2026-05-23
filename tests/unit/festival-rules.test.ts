import { describe, expect, it } from 'vitest';
import { PAN_INDIA_FESTIVALS } from '$lib/panchanga';
import { evaluateFestivals, tithiInMasa, type FestivalRule } from '$lib/panchanga/festivals/rules';
import type { Panchanga } from '$lib/panchanga';

describe('festival rule engine', () => {
  it('preserves rule order and returns matching festival keys', () => {
    const rules: FestivalRule[] = [
      { key: 'first', displayName: 'First', matches: () => true },
      { key: 'second', displayName: 'Second', matches: () => false },
      { key: 'third', displayName: 'Third', matches: () => true },
    ];

    expect(evaluateFestivals(rules, {} as Panchanga)).toEqual(['first', 'third']);
  });

  it('surfaces rule exceptions instead of hiding broken festival logic', () => {
    const rules: FestivalRule[] = [
      {
        key: 'broken',
        displayName: 'Broken',
        matches: () => {
          throw new Error('bad rule');
        },
      },
    ];

    expect(() => evaluateFestivals(rules, {} as Panchanga)).toThrow('bad rule');
  });

  it('matches non-adhika tithi in masa predicates exactly', () => {
    const matches = tithiInMasa(8, 'krishna', 'Bhadrapada');
    const base = {
      tithi: { number: 8, paksha: 'krishna' },
      masa: { name: 'Bhadrapada', isAdhika: false },
    } as Panchanga;

    expect(matches(base)).toBe(true);
    expect(matches({ ...base, masa: { ...base.masa, isAdhika: true } } as Panchanga)).toBe(false);
    expect(matches({ ...base, tithi: { ...base.tithi, paksha: 'shukla' } } as Panchanga)).toBe(false);
  });
});

describe('pan-India festival registry', () => {
  it('uses unique keys with non-empty display names', () => {
    const seen = new Set<string>();
    const failures: string[] = [];

    for (const rule of PAN_INDIA_FESTIVALS) {
      if (!rule.key.trim()) failures.push('blank festival key');
      if (!rule.displayName.trim()) failures.push(`${rule.key}: blank English display name`);
      if (rule.displayNameHi !== undefined && !rule.displayNameHi.trim()) {
        failures.push(`${rule.key}: blank Hindi display name`);
      }
      if (seen.has(rule.key)) failures.push(`${rule.key}: duplicate key`);
      seen.add(rule.key);
    }

    expect(failures).toEqual([]);
  });
});
