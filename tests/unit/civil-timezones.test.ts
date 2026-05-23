import { describe, expect, it } from 'vitest';
import { civilMidnightInZone, civilTimeInZone, civilYMDInZone } from '$lib/astro';
import { CITIES } from '$lib/location/cities';

const PROBE_DATES: ReadonlyArray<readonly [number, number, number]> = [
  [2026, 1, 1],
  [2026, 3, 8],
  [2026, 3, 29],
  [2026, 10, 25],
  [2026, 11, 1],
  [2026, 12, 31],
];

describe('civil time construction across bundled city timezones', () => {
  it('builds civil noon and midnight for every bundled city on DST-sensitive dates', () => {
    const failures: string[] = [];

    for (const city of CITIES) {
      for (const [year, month, day] of PROBE_DATES) {
        try {
          const noon = civilTimeInZone(year, month, day, city.timezone, 12);
          const noonParts = civilYMDInZone(noon, city.timezone);
          if (
            noonParts.year !== year ||
            noonParts.month !== month ||
            noonParts.day !== day ||
            noonParts.hour !== 12
          ) {
            failures.push(`${city.name} ${city.timezone}: noon ${year}-${month}-${day} -> ${JSON.stringify(noonParts)}`);
          }

          const midnight = civilMidnightInZone(noon, city.timezone);
          const midnightParts = civilYMDInZone(midnight, city.timezone);
          if (
            midnightParts.year !== year ||
            midnightParts.month !== month ||
            midnightParts.day !== day ||
            midnightParts.hour !== 0
          ) {
            failures.push(
              `${city.name} ${city.timezone}: midnight ${year}-${month}-${day} -> ${JSON.stringify(midnightParts)}`,
            );
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          failures.push(`${city.name} ${city.timezone}: ${year}-${month}-${day} threw ${msg}`);
        }
      }
    }

    expect(failures).toEqual([]);
  });
});
