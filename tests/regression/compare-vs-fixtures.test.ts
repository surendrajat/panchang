// Regression suite: every JSON fixture in tests/fixtures/drik-panchang/
// is loaded and compared against computePanchanga().

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { computePanchanga, PAN_INDIA_FESTIVALS, type Location } from '$lib/panchanga';

interface Fixture {
  fileName?: string;
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
const FESTIVAL_KEYS = new Set(PAN_INDIA_FESTIVALS.map((f) => f.key));

function loadFixtures(): Fixture[] {
  const dir = join(__dirname, '..', 'fixtures', 'drik-panchang');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => ({ ...(JSON.parse(readFileSync(join(dir, f), 'utf8')) as Fixture), fileName: f }));
}

describe('Drik-Panchang fixture regression', () => {
  const fixtures = loadFixtures();

  it('fixture corpus includes timed assertions', () => {
    const timed = fixtures.filter(hasTimedAssertion);
    expect(
      timed.length,
      'At least four committed fixtures must assert sunrise/sunset or limb end times.',
    ).toBeGreaterThanOrEqual(4);
  });

  it('fixture labels and files are unique', () => {
    const duplicateLabels = duplicates(fixtures.map((fx) => fx.label));
    const duplicateFiles = duplicates(fixtures.map((fx) => fx.fileName ?? ''));

    expect(duplicateLabels, `Duplicate fixture labels: ${duplicateLabels.join(', ')}`).toEqual([]);
    expect(duplicateFiles, `Duplicate fixture files: ${duplicateFiles.join(', ')}`).toEqual([]);
  });

  it('fixtures use valid civil dates', () => {
    const invalid = fixtures
      .filter((fx) => !isExactISODate(fx.civilDate))
      .map((fx) => `${fx.label}: ${fx.civilDate}`);

    expect(invalid, `Invalid fixture civil dates: ${invalid.join(', ')}`).toEqual([]);
  });

  it('fixtures use valid locations and non-empty expectations', () => {
    const invalid: string[] = [];

    for (const fx of fixtures) {
      if (!fx.location?.timezone) invalid.push(`${fixtureName(fx)}: missing timezone`);
      if (
        !Number.isFinite(fx.location?.latitude) ||
        fx.location.latitude < -90 ||
        fx.location.latitude > 90
      ) {
        invalid.push(`${fixtureName(fx)}: invalid latitude ${fx.location?.latitude}`);
      }
      if (
        !Number.isFinite(fx.location?.longitude) ||
        fx.location.longitude < -180 ||
        fx.location.longitude > 180
      ) {
        invalid.push(`${fixtureName(fx)}: invalid longitude ${fx.location?.longitude}`);
      }
      if (fx.location.altitude !== undefined && !Number.isFinite(fx.location.altitude)) {
        invalid.push(`${fixtureName(fx)}: invalid altitude ${fx.location.altitude}`);
      }
      if (Object.keys(fx.expect ?? {}).length === 0)
        invalid.push(`${fixtureName(fx)}: empty expect object`);
    }

    expect(invalid).toEqual([]);
  });

  it('fixtures use valid expected time fields and festival keys', () => {
    const invalid: string[] = [];

    for (const fx of fixtures) {
      for (const [label, value] of expectedTimeFields(fx)) {
        if (value !== null && !isExpectedInstantShape(value)) {
          invalid.push(`${fixtureName(fx)}: ${label} has invalid time "${value}"`);
        }
      }
      for (const key of fx.expect.festivals ?? []) {
        if (!FESTIVAL_KEYS.has(key))
          invalid.push(`${fixtureName(fx)}: unknown festival key ${key}`);
      }
    }

    expect(invalid).toEqual([]);
  });

  it('timed fixture corpus covers both sun events and limb end times', () => {
    const timed = fixtures.filter(hasTimedAssertion);
    const hasSunEvent = timed.some(
      (fx) => fx.expect.sunrise !== undefined || fx.expect.sunset !== undefined,
    );
    const hasLimbEnd = timed.some(
      (fx) =>
        fx.expect.tithi?.endTime ||
        fx.expect.nakshatra?.endTime ||
        fx.expect.yoga?.endTime ||
        fx.expect.karana?.endTime,
    );

    expect(
      hasSunEvent,
      'Timed fixtures should include at least one sunrise/sunset assertion.',
    ).toBe(true);
    expect(
      hasLimbEnd,
      'Timed fixtures should include at least one tithi/nakshatra/yoga/karana end assertion.',
    ).toBe(true);
  });

  it('timed fixture corpus covers multiple locations', () => {
    const locations = new Set(
      fixtures
        .filter(hasTimedAssertion)
        .map(
          (fx) =>
            `${fx.location.latitude.toFixed(4)},${fx.location.longitude.toFixed(4)},${fx.location.timezone}`,
        ),
    );

    expect(
      locations.size,
      'Timed fixtures should cover at least three distinct locations.',
    ).toBeGreaterThanOrEqual(3);
  });

  it('timed fixture corpus covers multiple civil dates', () => {
    const dates = new Set(fixtures.filter(hasTimedAssertion).map((fx) => fx.civilDate));

    expect(
      dates.size,
      'Timed fixtures should cover at least two civil dates.',
    ).toBeGreaterThanOrEqual(2);
  });

  it('fixtures with timed assertions include usable source metadata', () => {
    const missing = fixtures
      .filter(hasTimedAssertion)
      .filter((fx) => !hasUsableSourceMetadata(fx))
      .map((fx) => fx.label);

    expect(missing, `Timed fixtures missing usable source metadata: ${missing.join(', ')}`).toEqual(
      [],
    );
  });

  for (const fx of fixtures) {
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
      expectOptionalInstant(
        p.yoga.endTime,
        e.yoga?.endTime,
        fx,
        'yoga.endTime',
        LIMB_END_TOLERANCE_MS,
      );
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

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) dupes.add(value);
    seen.add(value);
  }
  return Array.from(dupes).sort();
}

function fixtureName(fx: Fixture): string {
  return fx.fileName ?? fx.label;
}

function expectedTimeFields(fx: Fixture): Array<[string, string | null]> {
  const fields: Array<[string, string | null | undefined]> = [
    ['sunrise', fx.expect.sunrise],
    ['sunset', fx.expect.sunset],
    ['moonrise', fx.expect.moonrise],
    ['moonset', fx.expect.moonset],
    ['tithi.endTime', fx.expect.tithi?.endTime],
    ['nakshatra.endTime', fx.expect.nakshatra?.endTime],
    ['yoga.endTime', fx.expect.yoga?.endTime],
    ['karana.endTime', fx.expect.karana?.endTime],
  ];
  return fields.filter((field): field is [string, string | null] => field[1] !== undefined);
}

function hasUsableSourceMetadata(fx: Fixture): boolean {
  return Boolean(
    fx.source?.notes?.trim() &&
    fx.source.urls?.length &&
    fx.source.urls.every((url) => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:' || parsed.protocol === 'http:';
      } catch {
        return false;
      }
    }),
  );
}

function isExactISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isExpectedInstantShape(value: string): boolean {
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(value)) return true;
  if (!value.includes('T')) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
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

function zonedParts(
  date: Date,
  timeZone: string,
): {
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
