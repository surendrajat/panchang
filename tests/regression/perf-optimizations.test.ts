// Guards the festival/compute performance optimizations against silent
// regressions. These are the safety net described in the perf commits — most
// importantly, the FAST-PATH PARITY test below is what stops a future festival
// rule from silently breaking the annual Festivals list by reading a field the
// fast path stubs (yoga, karana, karanas, moonrise, moonset).
//
// If you add a festival that reads one of those fields, the fast-path parity
// test will fail (full vs fast festival sets diverge) — that is intentional.
// Fix it by NOT reading those fields in a rule, or by teaching computePanchanga's
// fast path to compute the field you need.
import { describe, it, expect } from 'vitest';
import {
  computePanchanga,
  findFestivals,
  PAN_INDIA_FESTIVALS,
  MONTHLY_OBSERVANCE_KEYS,
  type Location,
  type Panchanga,
} from '$lib/panchanga';
import { sunRiseSet, moonRiseSet } from '$lib/astro';
import { Body, Observer, SearchRiseSet } from 'astronomy-engine';

// Three cities chosen to exercise different regimes: India (no DST), a northern
// DST zone, and a southern-hemisphere DST zone.
const DELHI: Location = { name: 'Delhi', latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata' };
const NEW_YORK: Location = { name: 'New York', latitude: 40.7128, longitude: -74.006, timezone: 'America/New_York' };
const SYDNEY: Location = { name: 'Sydney', latitude: -33.8688, longitude: 151.2093, timezone: 'Australia/Sydney' };
const CITIES = [DELHI, NEW_YORK, SYDNEY];

// Walk every civil day across a span of years for each city.
function* eachDay(years: number[]): Generator<{ loc: Location; date: Date }> {
  for (const loc of CITIES) {
    for (const y of years) {
      for (let m = 0; m < 12; m++) {
        const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
        for (let d = 1; d <= dim; d++) {
          yield { loc, date: new Date(Date.UTC(y, m, d, 6, 30)) };
        }
      }
    }
  }
}

// Everything a festival rule is allowed to read (see the field map in the perf
// commits) plus the festival output itself. If the fast path altered any of
// these, festivals could differ — so this is the invariant that makes the fast
// path safe.
function festivalRelevantSig(p: Panchanga): string {
  return [
    p.festivals.slice().sort().join(','),
    p.tithi.number,
    p.tithi.paksha,
    p.tithi.index,
    p.masa.name,
    p.masa.isAdhika,
    p.nakshatra.index,
    p.solar.sign,
    p.solar.signAtDayStart,
    p.solar.signAtDayEnd,
    p.paksha,
    p.sunrise ? p.sunrise.getTime() : 'null',
    p.sunset ? p.sunset.getTime() : 'null',
  ].join('|');
}

const SPAN = [2024, 2025]; // 2 years x 3 cities ~= 2190 days

describe('fast-path festival parity (safety net for adding festivals)', () => {
  it('full and fast computePanchanga produce identical festivals + festival-relevant fields', () => {
    let days = 0;
    const mismatches: string[] = [];
    for (const { loc, date } of eachDay(SPAN)) {
      days++;
      const full = computePanchanga(date, loc);
      const fast = computePanchanga(date, loc, undefined, { fast: true });
      const a = festivalRelevantSig(full);
      const b = festivalRelevantSig(fast);
      if (a !== b && mismatches.length < 8) {
        mismatches.push(`${loc.name} ${date.toISOString().slice(0, 10)}: full[${a}] !== fast[${b}]`);
      }
    }
    expect(days).toBeGreaterThan(2000); // sanity: we really swept thousands of days
    expect(mismatches).toEqual([]);
  }, 120_000);

  it('annualOnly === full festivals minus the monthly recurrences (per day)', () => {
    const mismatches: string[] = [];
    for (const { loc, date } of eachDay(SPAN)) {
      const full = computePanchanga(date, loc).festivals;
      const annual = computePanchanga(date, loc, undefined, { annualOnly: true }).festivals;
      const expected = full.filter((k) => !MONTHLY_OBSERVANCE_KEYS.has(k)).sort();
      const got = annual.slice().sort();
      if (JSON.stringify(expected) !== JSON.stringify(got) && mismatches.length < 8) {
        mismatches.push(`${loc.name} ${date.toISOString().slice(0, 10)}: expected[${expected}] got[${got}]`);
      }
    }
    expect(mismatches).toEqual([]);
  }, 120_000);

  it('production findFestivals(annualOnly) === findFestivals(full) minus monthly, per city/year', () => {
    const norm = (a: { date: Date; key: string }[]) => a.map((o) => o.date.getTime() + '|' + o.key).sort();
    for (const loc of CITIES) {
      for (const y of SPAN) {
        const from = new Date(Date.UTC(y, 0, 1, 6)), to = new Date(Date.UTC(y, 11, 31, 6));
        const fullFiltered = norm(findFestivals(from, to, loc).filter((o) => !MONTHLY_OBSERVANCE_KEYS.has(o.key)));
        const annual = norm(findFestivals(from, to, loc, undefined, { annualOnly: true }));
        expect(annual, `${loc.name} ${y}`).toEqual(fullFiltered);
      }
    }
  }, 120_000);
});

describe('fast-path field contract (locks exactly what fast skips)', () => {
  it('full computes yoga/karana/karanas/moon rise-set; fast stubs/nulls them; the rest matches', () => {
    const date = new Date(Date.UTC(2026, 0, 15, 6, 30)); // a day Delhi has real moonrise + multiple karanas
    const full = computePanchanga(date, DELHI);
    const fast = computePanchanga(date, DELHI, undefined, { fast: true });

    // Full path computes the real values...
    expect(full.yoga.index).toBeGreaterThanOrEqual(1);
    expect(full.yoga.index).toBeLessThanOrEqual(27);
    expect(full.karana.index).toBeGreaterThanOrEqual(1);
    expect(full.karanas.length).toBeGreaterThan(0);
    // ...the fast path stubs them with out-of-range sentinels + nulls.
    expect(fast.yoga.index).toBe(0); // sentinel (real yoga is 1..27)
    expect(fast.karana.index).toBe(0); // sentinel (real karana is 1..11)
    expect(fast.karanas).toEqual([]);
    expect(fast.moonrise).toBeNull();
    expect(fast.moonset).toBeNull();

    // ...while every festival-relevant field is identical.
    expect(festivalRelevantSig(fast)).toBe(festivalRelevantSig(full));
  });
});

describe('monthly-observance key integrity', () => {
  it('every MONTHLY_OBSERVANCE_KEY is a real festival rule (no typo / dead key)', () => {
    const ruleKeys = new Set(PAN_INDIA_FESTIVALS.map((r) => r.key));
    for (const k of MONTHLY_OBSERVANCE_KEYS) {
      expect(ruleKeys.has(k), `monthly key "${k}" has no matching rule`).toBe(true);
    }
    expect(MONTHLY_OBSERVANCE_KEYS.size).toBe(7);
  });

  it('each monthly recurrence actually fires in a full year (not a dead rule)', () => {
    const occ = findFestivals(new Date(Date.UTC(2026, 0, 1, 6)), new Date(Date.UTC(2026, 11, 31, 6)), DELHI);
    const fired = new Set(occ.map((o) => o.key));
    for (const k of MONTHLY_OBSERVANCE_KEYS) {
      expect(fired.has(k), `monthly recurrence "${k}" never fired`).toBe(true);
    }
  });

  it('annualOnly output never contains a monthly-recurrence key', () => {
    const occ = findFestivals(new Date(Date.UTC(2026, 0, 1, 6)), new Date(Date.UTC(2026, 11, 31, 6)), DELHI, undefined, {
      annualOnly: true,
    });
    for (const o of occ) {
      expect(MONTHLY_OBSERVANCE_KEYS.has(o.key), `"${o.key}" leaked into annual list`).toBe(false);
    }
  });

  it('annual festivals that fall on monthly tithis are RETAINED in the annual list', () => {
    const occ = findFestivals(new Date(Date.UTC(2026, 0, 1, 6)), new Date(Date.UTC(2026, 11, 31, 6)), DELHI, undefined, {
      annualOnly: true,
    });
    const keys = new Set(occ.map((o) => o.key));
    for (const k of [
      'ganesh_chaturthi',
      'vaikuntha_ekadashi',
      'kartik_purnima',
      'buddha_purnima',
      'guru_purnima',
      'naraka_chaturdashi',
    ]) {
      expect(keys.has(k), `annual tithi-festival "${k}" missing from annual list`).toBe(true);
    }
  });
});

describe('recurrence-frequency guards (catch a mis-classified festival)', () => {
  const yearCounts = () => {
    const occ = findFestivals(new Date(Date.UTC(2026, 0, 1, 6)), new Date(Date.UTC(2026, 11, 31, 6)), DELHI);
    const c = new Map<string, number>();
    for (const o of occ) c.set(o.key, (c.get(o.key) ?? 0) + 1);
    return c;
  };

  it('any festival firing frequently (>6x/year) is a known monthly recurrence', () => {
    // Annual festivals fire ~once a year; the monthly recurrences fire 11-25x. So
    // a future monthly-style rule added WITHOUT its key in MONTHLY_OBSERVANCE_KEYS
    // would fire ~12x here and trip this test — stopping it from silently swamping
    // the annual Festivals list (the maintainability gap called out in review).
    for (const [key, n] of yearCounts()) {
      if (n > 6) {
        expect(MONTHLY_OBSERVANCE_KEYS.has(key), `"${key}" fires ${n}x/yr but is not flagged monthly`).toBe(true);
      }
    }
  });

  it('each monthly recurrence fires within its expected yearly range (regression smoke)', () => {
    // Frequency coverage for the 6 monthly rules (whose exact dates are not yet
    // Drik-pinned): a broken vyapini/chandrodaya rule that stopped matching, or
    // one that over-matched, moves the count out of range. ~24 = twice a month
    // (Ekadashi/Pradosh, both pakshas), ~12 = once a month. Ranges are loose to
    // tolerate adhika-masa years.
    const c = yearCounts();
    const ranges: Record<string, [number, number]> = {
      ekadashi: [22, 27],
      pradosh: [22, 27],
      sankashti_chaturthi: [10, 14],
      amavasya: [10, 14],
      purnima: [10, 14],
      masik_shivaratri: [10, 14],
    };
    for (const [key, [lo, hi]] of Object.entries(ranges)) {
      const n = c.get(key) ?? 0;
      expect(n, `${key} fired ${n}x (expected ${lo}-${hi})`).toBeGreaterThanOrEqual(lo);
      expect(n, `${key} fired ${n}x (expected ${lo}-${hi})`).toBeLessThanOrEqual(hi);
    }
  });
});

describe('sunRiseSet / moonRiseSet memo correctness', () => {
  const refSun = (loc: Location, dayStart: Date) => {
    const obs = new Observer(loc.latitude, loc.longitude, loc.altitude ?? 0);
    const rise = SearchRiseSet(Body.Sun, obs, +1, dayStart, 1);
    const set = SearchRiseSet(Body.Sun, obs, -1, dayStart, 1);
    return { rise: rise ? rise.date.getTime() : null, set: set ? set.date.getTime() : null };
  };
  const refMoon = (loc: Location, dayStart: Date) => {
    const obs = new Observer(loc.latitude, loc.longitude, loc.altitude ?? 0);
    const rise = SearchRiseSet(Body.Moon, obs, +1, dayStart, 1.25);
    const set = SearchRiseSet(Body.Moon, obs, -1, dayStart, 1.25);
    return { rise: rise ? rise.date.getTime() : null, set: set ? set.date.getTime() : null };
  };
  const ms = (e: { rise: Date | null; set: Date | null }) => ({
    rise: e.rise ? e.rise.getTime() : null,
    set: e.set ? e.set.getTime() : null,
  });

  it('returns values identical to a fresh astronomy-engine computation', () => {
    for (const loc of CITIES) {
      for (let m = 0; m < 12; m += 2) {
        const d = new Date(Date.UTC(2025, m, 10, 0, 0));
        expect(ms(sunRiseSet(loc, d)), `sun ${loc.name} ${m}`).toEqual(refSun(loc, d));
        expect(ms(moonRiseSet(loc, d)), `moon ${loc.name} ${m}`).toEqual(refMoon(loc, d));
      }
    }
  });

  it('is keyed by location — different cities give different values, no cross-contamination', () => {
    const d = new Date(Date.UTC(2025, 5, 21, 0, 0));
    const delhi1 = ms(sunRiseSet(DELHI, d));
    const ny = ms(sunRiseSet(NEW_YORK, d));
    const delhi2 = ms(sunRiseSet(DELHI, d)); // re-query after another location
    expect(delhi1).not.toEqual(ny); // different cities, different sunrise
    expect(delhi2).toEqual(delhi1); // Delhi unchanged by the NY query
    expect(delhi1).toEqual(refSun(DELHI, d)); // and correct
  });

  it('survives cache eviction (>4096 distinct keys) without corruption', () => {
    const d0 = new Date(Date.UTC(2025, 2, 1, 0, 0));
    const before = ms(sunRiseSet(DELHI, d0));
    // Force well past the 4096 cap so the cache clears, evicting d0.
    for (let i = 0; i < 4200; i++) {
      sunRiseSet(DELHI, new Date(Date.UTC(2000, 0, 1 + i, 0, 0)));
    }
    const after = ms(sunRiseSet(DELHI, d0)); // recomputed after eviction
    expect(after).toEqual(before);
    expect(after).toEqual(refSun(DELHI, d0));
  }, 60_000);
});
