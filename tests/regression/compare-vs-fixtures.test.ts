// Regression suite: every JSON fixture in tests/fixtures/drik-panchang/
// is loaded and compared against computePanchanga().

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { computePanchanga, type Location } from '$lib/panchanga';

interface Fixture {
  label: string;
  source?: {
    urls?: string[];
    notes?: string;
  };
  location: Location;
  civilDate: string; // YYYY-MM-DD
  expect: {
    sunrise?: string;
    sunset?: string;
    moonrise?: string | null;
    moonset?: string | null;
    tithi?: {
      name?: string;
      paksha?: 'shukla' | 'krishna';
      number?: number;
      endTime?: string;
    };
    nakshatra?: { name?: string; pada?: number; endTime?: string };
    yoga?: { name?: string; endTime?: string };
    karana?: { name?: string; endTime?: string };
    masa?: { name?: string; isAdhika?: boolean; isKshaya?: boolean };
    festivals?: string[];
  };
}

const SUN_EVENT_TOLERANCE_MS = 30_000;
const LIMB_END_TOLERANCE_MS = 2 * 60_000;

function loadFixtures(): Fixture[] {
  const dir = join(__dirname, '..', 'fixtures', 'drik-panchang');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Fixture);
}

describe('Drik-Panchang fixture regression', () => {
  const fixtures = loadFixtures();

  it('fixture corpus includes timed assertions', () => {
    const timed = fixtures.filter(hasTimedAssertion);
    expect(
      timed.length,
      'At least one committed fixture must assert sunrise/sunset or limb end times.',
    ).toBeGreaterThanOrEqual(1);
  });

  it('fixtures with timed assertions include source metadata', () => {
    const missing = fixtures
      .filter(hasTimedAssertion)
      .filter((fx) => !fx.source?.urls?.length)
      .map((fx) => fx.label);

    expect(missing, `Timed fixtures missing source URLs: ${missing.join(', ')}`).toEqual([]);
  });

  for (const fx of loadFixtures()) {
    it(fx.label, () => {
      const date = instantInZone(fx.civilDate, '06:00:00', fx.location.timezone);
      const p = computePanchanga(date, fx.location);
      const e = fx.expect;

      expectOptionalInstant(p.sunrise, e.sunrise, fx, 'sunrise', SUN_EVENT_TOLERANCE_MS);
      expectOptionalInstant(p.sunset, e.sunset, fx, 'sunset', SUN_EVENT_TOLERANCE_MS);
      expectOptionalInstant(p.moonrise, e.moonrise, fx, 'moonrise', SUN_EVENT_TOLERANCE_MS);
      expectOptionalInstant(p.moonset, e.moonset, fx, 'moonset', SUN_EVENT_TOLERANCE_MS);

      if (e.tithi?.name) expect(p.tithi.name).toBe(e.tithi.name);
      if (e.tithi?.paksha) expect(p.tithi.paksha).toBe(e.tithi.paksha);
      if (e.tithi?.number !== undefined) expect(p.tithi.number).toBe(e.tithi.number);
      expectOptionalInstant(
        p.tithi.endTime,
        e.tithi?.endTime,
        fx,
        'tithi.endTime',
        LIMB_END_TOLERANCE_MS,
      );

      if (e.nakshatra?.name) expect(p.nakshatra.name).toBe(e.nakshatra.name);
      if (e.nakshatra?.pada !== undefined) expect(p.nakshatra.pada).toBe(e.nakshatra.pada);
      expectOptionalInstant(
        p.nakshatra.endTime,
        e.nakshatra?.endTime,
        fx,
        'nakshatra.endTime',
        LIMB_END_TOLERANCE_MS,
      );

      if (e.yoga?.name) expect(p.yoga.name).toBe(e.yoga.name);
      expectOptionalInstant(p.yoga.endTime, e.yoga?.endTime, fx, 'yoga.endTime', LIMB_END_TOLERANCE_MS);
      if (e.karana?.name) expect(p.karana.name).toBe(e.karana.name);
      expectOptionalInstant(
        p.karana.endTime,
        e.karana?.endTime,
        fx,
        'karana.endTime',
        LIMB_END_TOLERANCE_MS,
      );

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

function hasTimedAssertion(fx: Fixture): boolean {
  const e = fx.expect;
  return Boolean(
    e.sunrise !== undefined ||
      e.sunset !== undefined ||
      e.moonrise !== undefined ||
      e.moonset !== undefined ||
      e.tithi?.endTime ||
      e.nakshatra?.endTime ||
      e.yoga?.endTime ||
      e.karana?.endTime,
  );
}

function expectOptionalInstant(
  actual: Date | null,
  expected: string | null | undefined,
  fx: Fixture,
  label: string,
  toleranceMs: number,
): void {
  if (expected === undefined) return;
  if (expected === null) {
    expect(actual, `${fx.label}: expected ${label} to be null`).toBeNull();
    return;
  }
  expect(actual, `${fx.label}: missing ${label}`).not.toBeNull();
  if (!actual) return;
  const expectedDate = parseExpectedInstant(expected, fx);
  const delta = Math.abs(actual.getTime() - expectedDate.getTime());
  expect(
    delta,
    `${fx.label}: ${label} expected ${expectedDate.toISOString()}, got ${actual.toISOString()} (${Math.round(delta / 1000)}s delta)`,
  ).toBeLessThanOrEqual(toleranceMs);
}

// Expected instants may be full ISO strings (preferred), or `HH:mm` /
// `HH:mm:ss` local civil times for the fixture date. Local time strings
// are useful while hand-capturing Drik data; full ISO strings are safer
// for limb end times that can fall after local midnight.
function parseExpectedInstant(value: string, fx: Fixture): Date {
  if (value.includes('T')) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`${fx.label}: invalid expected instant "${value}".`);
    }
    return parsed;
  }
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    const withSeconds = value.length === 5 ? `${value}:00` : value;
    return instantInZone(fx.civilDate, withSeconds, fx.location.timezone);
  }
  throw new Error(
    `${fx.label}: invalid expected instant "${value}". Use ISO datetime or HH:mm[:ss].`,
  );
}

function instantInZone(civilDate: string, time: string, timeZone: string): Date {
  const [year, month, day] = civilDate.split('-').map(Number);
  const [hour, minute, second = 0] = time.split(':').map(Number);
  const desiredUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = new Date(desiredUtc);

  for (let i = 0; i < 3; i++) {
    const actual = zonedParts(guess, timeZone);
    const actualUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    const delta = desiredUtc - actualUtc;
    if (delta === 0) return guess;
    guess = new Date(guess.getTime() + delta);
  }

  return guess;
}

function zonedParts(date: Date, timeZone: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}
