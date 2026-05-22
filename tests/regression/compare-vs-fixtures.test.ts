// Regression suite: every JSON fixture in tests/fixtures/drik-panchang/
// is loaded and compared against computePanchanga().

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { computePanchanga, type Location } from '$lib/panchanga';

interface Fixture {
  label: string;
  location: Location;
  civilDate: string; // YYYY-MM-DD
  expect: {
    tithi?: { name?: string; paksha?: 'shukla' | 'krishna'; number?: number };
    nakshatra?: { name?: string; pada?: number };
    yoga?: { name?: string };
    karana?: { name?: string };
    masa?: { name?: string; isAdhika?: boolean; isKshaya?: boolean };
    festivals?: string[];
  };
}

function loadFixtures(): Fixture[] {
  const dir = join(__dirname, '..', 'fixtures', 'drik-panchang');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Fixture);
}

describe('Drik-Panchang fixture regression', () => {
  for (const fx of loadFixtures()) {
    it(fx.label, () => {
      const date = new Date(`${fx.civilDate}T06:00:00${tzOffset(fx.location.timezone, fx.civilDate)}`);
      const p = computePanchanga(date, fx.location);
      const e = fx.expect;

      if (e.tithi?.name) expect(p.tithi.name).toBe(e.tithi.name);
      if (e.tithi?.paksha) expect(p.tithi.paksha).toBe(e.tithi.paksha);
      if (e.tithi?.number !== undefined) expect(p.tithi.number).toBe(e.tithi.number);

      if (e.nakshatra?.name) expect(p.nakshatra.name).toBe(e.nakshatra.name);
      if (e.nakshatra?.pada !== undefined) expect(p.nakshatra.pada).toBe(e.nakshatra.pada);

      if (e.yoga?.name) expect(p.yoga.name).toBe(e.yoga.name);
      if (e.karana?.name) expect(p.karana.name).toBe(e.karana.name);

      if (e.masa?.name) expect(p.masa.name).toBe(e.masa.name);
      if (e.masa?.isAdhika !== undefined) expect(p.masa.isAdhika).toBe(e.masa.isAdhika);
      if (e.masa?.isKshaya !== undefined) expect(p.masa.isKshaya).toBe(e.masa.isKshaya);

      if (e.festivals) {
        for (const key of e.festivals) {
          expect(p.festivals, `missing festival ${key}`).toContain(key);
        }
      }
    });
  }
});

// Approximate offset string for a tz on a given civil date. We only need
// it to construct an anchor Date inside the civil day; computePanchanga
// re-anchors precisely. "+05:30" for India works for any city in IST.
function tzOffset(tz: string, _ymd: string): string {
  switch (tz) {
    case 'Asia/Kolkata':
      return '+05:30';
    case 'Asia/Kathmandu':
      return '+05:45';
    case 'America/New_York':
      return '-05:00';
    case 'Europe/London':
      return '+00:00';
    default:
      return 'Z';
  }
}
