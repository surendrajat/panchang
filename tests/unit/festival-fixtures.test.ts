import { describe, expect, it } from 'vitest';
import { PAN_INDIA_FESTIVALS } from '$lib/panchanga';
import { FESTIVAL_FIXTURES } from '../fixtures/festivals-multi-year';

const FESTIVAL_KEYS = new Set(PAN_INDIA_FESTIVALS.map((f) => f.key));
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

describe('festival fixture metadata', () => {
  it('references implemented festival keys', () => {
    const unknown = FESTIVAL_FIXTURES.map((f) => f.key).filter((key) => !FESTIVAL_KEYS.has(key));
    expect(unknown).toEqual([]);
  });

  it('uses valid date strings whose year matches the fixture year', () => {
    const invalid: string[] = [];
    for (const fixture of FESTIVAL_FIXTURES) {
      for (const [year, date] of Object.entries(fixture.expected)) {
        const parsed = new Date(`${date}T00:00:00Z`);
        const normalized = parsed.toISOString().slice(0, 10);
        if (!DATE_RE.test(date) || Number.isNaN(parsed.getTime()) || normalized !== date) {
          invalid.push(`${fixture.key} ${year}: invalid date ${date}`);
          continue;
        }
        if (date.slice(0, 4) !== year) {
          invalid.push(`${fixture.key} ${year}: expected date ${date} is in a different year`);
        }
      }
    }
    expect(invalid).toEqual([]);
  });

  it('documents every soft tiebreaker fixture with a rule note', () => {
    const missing = FESTIVAL_FIXTURES.filter((f) => f.auditTier === 'tiebreaker' && !f.ruleNote).map(
      (f) => f.key,
    );
    expect(missing).toEqual([]);
  });

  it('keeps unresolved known issues out of strict fixtures', () => {
    const invalid = FESTIVAL_FIXTURES.filter((f) => (f.auditTier ?? 'strict') === 'strict' && f.knownIssue).map(
      (f) => f.key,
    );
    expect(invalid).toEqual([]);
  });
});
