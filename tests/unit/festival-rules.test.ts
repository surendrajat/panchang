import { describe, expect, it } from 'vitest';
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
