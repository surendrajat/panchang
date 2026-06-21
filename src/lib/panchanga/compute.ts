// Top-level orchestration: civil date + location → full Panchanga value.
//
// The anchor for a day's panchanga is "sunrise on this civil date at the
// location". All five elements (tithi, nakshatra, yoga, karana, vara) are
// reported as they are at that sunrise; their end times are computed by
// bisection from that anchor forward.
//
// Pure function. No I/O, no caching. Memoization is the storage layer's job.

import {
  civilMidnightInZone,
  civilTimeInZone,
  civilYMDInZone,
  sunRiseSet,
  moonRiseSet,
  dateToJulian,
  siderealFromTropical,
  sunLongitudeAtJD,
  MS_PER_DAY,
} from '$lib/astro';
import { evaluateFestivals } from './festivals/rules';
import { PAN_INDIA_FESTIVALS, MONTHLY_OBSERVANCE_KEYS } from './festivals/pan-india';
import { tithiAtInstant } from './tithi';
import { nakshatraAtInstant } from './nakshatra';
import { yogaAtInstant } from './yoga';
import { karanaAtInstant, karanaSequenceForDay } from './karana';
import { varaAtSunrise } from './vara';
import { computeMasa, masaContext } from './masa';
import { computeSamvat } from './samvat';
import { rituFromSunSiderealSign } from './ritu';
import { ayanaFromSunSiderealSign } from './ayana';
import { computeMuhurta } from './muhurta';
import { moonPhaseAtInstant } from './moon-phase';

import {
  DEFAULT_OPTIONS,
  type FestivalOccurrence,
  type Location,
  type Panchanga,
  type PanchangaOptions,
} from './types';

// One civil-day step for date walks: advance 28h then snap back to local
// midnight. 28h exceeds the longest DST day (25h), so a spring-forward never
// makes us skip a date and a fall-back never makes us repeat one.
const DAY_STEP_MS = 28 * 3600_000;
// Half a day — the noon anchor (when a polar day has no sunrise) and the
// sunset fallback (anchor + 12h when there is no sunset).
const HALF_DAY_MS = 12 * 3600_000;

function resolveOptions(o?: Partial<PanchangaOptions>): PanchangaOptions {
  return { ...DEFAULT_OPTIONS, ...(o ?? {}) };
}

// Annual festivals = all festivals minus the monthly recurrences. The annual
// list excludes the monthly ones anyway, and they are ~half the festival-
// evaluation cost (their vyapini rules do extra sunrise/moonrise searches), so
// the annual walk skips them entirely.
const ANNUAL_FESTIVALS = PAN_INDIA_FESTIVALS.filter((r) => !MONTHLY_OBSERVANCE_KEYS.has(r.key));

// Internal toggles used only by findFestivals' annual walk — NOT part of the
// public options (no effect on the cache key, never set by Day/Month/Today).
//
// `fast`: skip the fields no festival rule reads — yoga, karana(s),
//   moonrise/moonset — the heaviest unused work (karanaSequenceForDay alone is
//   ~0.8 ms/day). Everything the rules DO read (tithi, nakshatra, masa, solar
//   sign, sunrise/sunset) is computed identically, so `festivals` is byte-for-
//   byte the same as the full path.
// `annualOnly`: evaluate only annual festivals, skipping the monthly recurrences
//   the year view discards (saves ~0.4 ms/day — about half the eval cost).
//
// Both are verified output-identical (after the year view's monthly filter) by a
// multi-year, multi-city diff. Default off; Day/Month/Today get the full result.
interface ComputeInternal {
  fast?: boolean;
  annualOnly?: boolean;
}

// Compute the panchanga for a civil date at a location.
//
// `date` is interpreted as "midnight in the location's IANA time zone".
// We accept either a UTC Date that already represents that midnight, or
// any Date inside the civil day — we re-anchor to local midnight in either
// case for consistency.
export function computePanchanga(
  date: Date,
  location: Location,
  options?: Partial<PanchangaOptions>,
  internal: ComputeInternal = {},
): Panchanga {
  const { fast = false, annualOnly = false } = internal;
  const opts = resolveOptions(options);
  const dayStart = civilMidnightInZone(date, location.timezone);

  const sunEvents = sunRiseSet(location, dayStart);
  const moonEvents = fast ? { rise: null, set: null } : moonRiseSet(location, dayStart);
  const sunrise = sunEvents.rise;
  const sunset = sunEvents.set;

  // Anchor for tithi/nakshatra/yoga/karana is sunrise, per ARCHITECTURE
  // §6.6. If sunrise doesn't exist (polar latitudes), fall back to local
  // noon of the civil date for the panchanga anchor.
  const anchor = sunrise ?? new Date(dayStart.getTime() + HALF_DAY_MS);

  const tithi = tithiAtInstant(anchor);
  const nakshatra = nakshatraAtInstant(anchor, opts.ayanamsa);
  // No festival rule reads yoga or karana(s) — stub them on the fast path. These
  // are the priciest unused computations (each does its own end-time bisection;
  // karanaSequenceForDay does ~3). The stubs use OUT-OF-RANGE sentinels (a real
  // yoga index is 1..27, karana 1..11) so that if a future festival rule ever
  // reads these on the fast path, its result diverges from the full path and the
  // perf-optimizations regression test (full vs fast festival parity) trips —
  // rather than silently matching a plausible value.
  const yoga = fast
    ? { index: 0, name: '', endTime: anchor, fraction: 0 }
    : yogaAtInstant(anchor, opts.ayanamsa);
  const karana = fast
    ? { index: 0, positionInCycle: -1, name: '', endTime: anchor, fraction: 0 }
    : karanaAtInstant(anchor);
  // A panchanga day spans 24h from the anchor (sunrise) and typically
  // contains 2–3 karanas, since each karana is ~12h (half a tithi).
  const karanas = fast ? [] : karanaSequenceForDay(anchor);
  const vara = varaAtSunrise(sunrise, anchor, location);
  const moonPhase = moonPhaseAtInstant(anchor);

  const anchorJD = dateToJulian(anchor);

  // Solar context — sun's sidereal sign at the anchor (drives ritu and
  // ayana) and at the civil-day boundaries (drives sankranti detection).
  // A sankranti happens on the civil day during which the sun crosses
  // a sign boundary, i.e. `signAtDayStart !== signAtDayEnd`.
  const sunSiderealAt = (jd: number): number =>
    siderealFromTropical(sunLongitudeAtJD(jd), jd, opts.ayanamsa);
  const sunSidereal = sunSiderealAt(anchorJD);
  const sunSign = Math.floor(sunSidereal / 30);

  const dayStartJD = dateToJulian(dayStart);
  const dayEndJD = dayStartJD + 1;
  const sunSignAtDayStart = Math.floor(sunSiderealAt(dayStartJD) / 30);
  const sunSignAtDayEnd = Math.floor(sunSiderealAt(dayEndJD) / 30);

  const ritu = rituFromSunSiderealSign(sunSign);
  const ayana = ayanaFromSunSiderealSign(sunSign);

  // Lunar month context — find bracketing new moons and detect adhika/kshaya.
  const masaCtx = masaContext(anchorJD, opts.ayanamsa);
  const masa = computeMasa(masaCtx, tithi.paksha, opts.monthSystem);

  // Samvat — switches on Chaitra Shukla Pratipada. Outside the
  // March/April boundary window the Gregorian month is decisive; inside
  // it, use the computed Amanta lunar month at sunrise.
  const ymd = civilYMDInZone(anchor, location.timezone);
  const afterChaitraNewYear =
    ymd.month > 4 ||
    (ymd.month >= 3 && (masa.amantaName === 'Chaitra' || masa.amantaName === 'Vaishakha'));
  const samvat = computeSamvat(ymd.year, afterChaitraNewYear);

  // Muhurta requires concrete sunrise/sunset. If polar, skip and produce
  // degenerate intervals so downstream code doesn't have to special-case.
  const muhurta = computeMuhurta(
    vara,
    sunrise ?? anchor,
    sunset ?? new Date(anchor.getTime() + HALF_DAY_MS),
  );

  // Build a temporary panchanga and run festival rules over it.
  const partial: Panchanga = {
    date: dayStart,
    location,
    options: opts,
    sunrise,
    sunset,
    moonrise: moonEvents.rise,
    moonset: moonEvents.set,
    tithi,
    nakshatra,
    yoga,
    karana,
    karanas,
    vara,
    masa,
    samvat,
    ritu,
    ayana,
    paksha: tithi.paksha,
    moonPhase,
    muhurta,
    solar: {
      sign: sunSign,
      signAtDayStart: sunSignAtDayStart,
      signAtDayEnd: sunSignAtDayEnd,
    },
    festivals: [],
  };

  partial.festivals = evaluateFestivals(
    annualOnly ? ANNUAL_FESTIVALS : PAN_INDIA_FESTIVALS,
    partial,
  );
  return partial;
}

export function computeMonth(
  year: number,
  month: number, // 1..12 Gregorian
  location: Location,
  options?: Partial<PanchangaOptions>,
): Panchanga[] {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const result: Panchanga[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const guess = civilTimeInZone(year, month, d, location.timezone, 12);
    result.push(computePanchanga(guess, location, options));
  }
  return result;
}

export function findFestivals(
  fromDate: Date,
  toDate: Date,
  location: Location,
  options?: Partial<PanchangaOptions>,
  // `annualOnly` (the annual Festivals view) skips the monthly recurrences the
  // view filters out anyway — about half the per-day festival-evaluation cost.
  // Default off, so this stays a faithful "all festivals in range" API.
  walkOptions: { annualOnly?: boolean } = {},
): FestivalOccurrence[] {
  const out: FestivalOccurrence[] = [];
  const opts = resolveOptions(options);
  const annualOnly = walkOptions.annualOnly ?? false;

  // Walking by MS_PER_DAY breaks across DST transitions (spring-forward
  // and fall-back make local "days" 23h or 25h). India has no DST so
  // the bug never surfaces for the default user, but it bites diaspora
  // users on US/EU calendars. We re-anchor to civil midnight in the
  // location's tz on each iteration, then add a generous step (28h)
  // so we always cross into the next civil day even at the longest
  // DST transition. `civilMidnightInZone` snaps back to local 00:00.
  const startMs = civilMidnightInZone(fromDate, location.timezone).getTime();
  const endMs = civilMidnightInZone(toDate, location.timezone).getTime();
  if (endMs < startMs) return out;

  // Memoize displayName lookup once per call (rather than once per
  // festival occurrence) — fast O(1) Map lookup after the first hit.
  const displayCache = new Map<string, string>();
  const getDisplay = (key: string): string => {
    let v = displayCache.get(key);
    if (v === undefined) {
      v = PAN_INDIA_FESTIVALS.find((f) => f.key === key)?.displayName ?? key;
      displayCache.set(key, v);
    }
    return v;
  };

  let cursor = startMs;
  const safetyLimit = Math.ceil((endMs - startMs) / MS_PER_DAY) + 7;
  for (let i = 0; i < safetyLimit && cursor <= endMs; i++) {
    const p = computePanchanga(new Date(cursor), location, opts, { fast: true, annualOnly });
    for (const key of p.festivals) {
      out.push({ date: p.date, key, displayName: getDisplay(key) });
    }
    // Step ahead by 28 hours, then snap to the next local midnight.
    // This works whether the previous day was 23h, 24h, or 25h.
    cursor = civilMidnightInZone(new Date(cursor + DAY_STEP_MS), location.timezone).getTime();
  }
  return out;
}

// findNextTithi: scan day-by-day forward looking for a matching civil
// date. This is intentionally simple — for the criteria we care about
// (a specific tithi+masa pairing), a day-by-day scan over up to ~400 days
// is fast enough and avoids tricky bracket logic at masa boundaries.
export function findNextTithi(
  fromDate: Date,
  criteria: { tithiIndex: number; masaIndex?: number; nakshatraIndex?: number },
  location: Location,
  options?: Partial<PanchangaOptions>,
): Date | null {
  const opts = resolveOptions(options);
  const startMs = civilMidnightInZone(fromDate, location.timezone).getTime();
  const MAX_DAYS = 400; // covers any tithi+masa pairing across an Adhik year

  let cursor = startMs;
  for (let i = 0; i < MAX_DAYS; i++) {
    const p = computePanchanga(new Date(cursor), location, opts);
    const matches =
      p.tithi.index === criteria.tithiIndex &&
      (criteria.masaIndex === undefined || p.masa.index === criteria.masaIndex) &&
      (criteria.nakshatraIndex === undefined || p.nakshatra.index === criteria.nakshatraIndex);
    if (matches) return p.date;
    cursor = civilMidnightInZone(new Date(cursor + DAY_STEP_MS), location.timezone).getTime();
  }
  return null;
}
