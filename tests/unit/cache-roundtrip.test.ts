// The panchanga IndexedDB cache round-trip — previously UNTESTED (the audit flagged
// that only the cacheKey string builder had coverage; happy-dom's IndexedDB doesn't
// work with Dexie). fake-indexeddb is pure-JS and runs in the default node env, so
// it finally exercises put → get through Dexie, including that Date fields survive
// the structured clone and that the key is complete (a changed input misses).
import 'fake-indexeddb/auto'; // installs indexedDB + IDBKeyRange globals — MUST be first
import { beforeEach, describe, expect, it } from 'vitest';
import { putCached, getCached, cacheKey } from '$lib/storage/cache';
import { db } from '$lib/storage/db';
import { computePanchanga, DEFAULT_OPTIONS, type Location } from '$lib/panchanga';

const DELHI: Location = {
  name: 'Delhi',
  latitude: 28.6139,
  longitude: 77.209,
  altitude: 216,
  timezone: 'Asia/Kolkata',
};
const DATE = new Date(Date.UTC(2026, 0, 15, 6));

beforeEach(async () => {
  // db() is a module-level singleton; reset between tests for isolation.
  await db().delete();
  await db().open();
});

describe('panchanga cache round-trip (fake-indexeddb)', () => {
  it('a miss returns null (not a throw)', async () => {
    expect(await getCached('panchanga|does-not-exist')).toBeNull();
  });

  it('put → get returns the value with tithi/nakshatra and Date fields intact', async () => {
    const p = computePanchanga(DATE, DELHI, DEFAULT_OPTIONS);
    const key = cacheKey(DATE, DELHI, DEFAULT_OPTIONS);
    await putCached(key, p);
    const got = await getCached(key);

    expect(got).not.toBeNull();
    expect(got!.tithi.index).toBe(p.tithi.index);
    expect(got!.nakshatra.index).toBe(p.nakshatra.index);
    expect(got!.masa.name).toBe(p.masa.name);
    // Date fields must survive the structured clone (the db layer claims this).
    expect(got!.sunrise instanceof Date).toBe(true);
    expect(got!.sunrise?.getTime()).toBe(p.sunrise?.getTime());
    expect(got!.tithi.endTime instanceof Date).toBe(true);
  });

  it('key completeness: a changed altitude (or ayanamsa) misses, not stale-hits', async () => {
    const p = computePanchanga(DATE, DELHI, DEFAULT_OPTIONS);
    await putCached(cacheKey(DATE, DELHI, DEFAULT_OPTIONS), p);

    // Same date, different altitude → different key → must miss (else stale wrong data).
    expect(await getCached(cacheKey(DATE, { ...DELHI, altitude: 999 }, DEFAULT_OPTIONS))).toBeNull();
    // Different ayanamsa → must miss.
    const otherOpts = { ...DEFAULT_OPTIONS, ayanamsa: 'raman' as const };
    expect(await getCached(cacheKey(DATE, DELHI, otherOpts))).toBeNull();
  });
});
