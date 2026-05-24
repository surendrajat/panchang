// Festival-date tiebreaker rules ("vyapini" rules).
//
// Most major Hindu festivals are tied to a particular tithi falling
// inside a particular muhurta window — Pradosha (evening), Nishita
// (midnight), Aparahna (late afternoon), Madhyahna (midday), or
// Chandrodaya (moonrise). When the tithi spans two sunrises, Drik
// Panchang picks the day on which the tithi is *present at the named
// window* (and prefers the earlier or later day per a per-festival
// convention).
//
// Beyond the basic vyapini rule, two extra layers apply to certain
// festivals:
//
//   1. Bhadra-Kaal exclusion — Holika Dahan and Raksha Bandhan are not
//      observed during the Vishti (Bhadra) karana. When Bhadra blocks
//      the window on day X, observance shifts to day X+1 even if the
//      target tithi isn't "vyapini" on X+1.
//
//   2. Sunrise-tithi fallback — when the tithi is "kshaya" (short
//      enough to skip the named window on every day it touches), the
//      observance falls on the civil day where the tithi is present at
//      sunrise.
//
// All helpers are date+location based so we can evaluate "yesterday's
// rule" without computing a full panchanga (e.g., to derive Holi as
// "day after Holika Dahan").
//
// Conventions:
//   - Pradosha: 48 minutes after sunset (center of the 96-minute
//     pradosha kala used by Drik for the most common evening rule).
//   - Nishita: midpoint of the night (sunset → next sunrise).
//   - Aparahna: 3/5 of daylight after sunrise (afternoon).
//   - Madhyahna: midpoint of daylight.
//   - Chandrodaya: the actual moonrise instant for the day.

import {
  sunMoonElongationAtJD,
  dateToJulian,
  sunRiseSet,
  moonRiseSet,
  moonLongitudeAtJD,
  ayanamsa,
  sunLongitudeAtJD,
  julianToDate,
  civilMidnightInZone,
} from '$lib/astro';
import type { Panchanga, Location, AyanamsaSystem } from './types';

export type Window = 'pradosha' | 'nishita' | 'aparahna' | 'madhyahna' | 'chandrodaya';

const PRADOSHA_OFFSET_MIN = 48;
const TITHI_DEGREES = 12;
const KARANA_DEGREES = 6;
const NAKSHATRA_DEGREES = 360 / 27;
const MS_PER_DAY = 86_400_000;
// Bhadra ephemeris-drift tolerance. astronomy-engine's Moon position
// may differ from Drik's Swiss-Ephemeris result by up to ~3 arcsec,
// which can shift the Vishti karana boundary by 1–3 minutes at the
// extremes. This guard treats Bhadra as "still active at the cutoff"
// if it ended within `BHADRA_GUARD_BAND_MS` of the cutoff instant.
const BHADRA_GUARD_BAND_MS = 5 * 60_000;

function tithiIndexAtJD(jd: number): number {
  const e = sunMoonElongationAtJD(jd);
  return Math.floor(e / TITHI_DEGREES) + 1;
}

// Sidereal nakshatra index (1..27, Ashwini = 1) at a given JD.
// Used by Vijayadashami's Shravana-preferred tiebreaker.
export function nakshatraIndexAtJD(jd: number, ayanamsaSys: AyanamsaSystem): number {
  const moonTrop = moonLongitudeAtJD(jd);
  const moonSid = (((moonTrop - ayanamsa(jd, ayanamsaSys)) % 360) + 360) % 360;
  return Math.floor(moonSid / NAKSHATRA_DEGREES) + 1;
}

// Vishti (Bhadra) is the 7th of the 7 movable karanas. In the 60-karana
// half-tithi cycle: position 0 is the fixed Kintughna, positions 1..56
// are the 7 movables repeating 8 times, and positions 57..59 are the
// remaining fixed karanas. Bhadra falls at positions where
// (position - 1) % 7 === 6 within the movable range.
function isBhadraAtJD(jd: number): boolean {
  const e = sunMoonElongationAtJD(jd);
  const pos = Math.floor(e / KARANA_DEGREES);
  return pos >= 1 && pos <= 56 && (pos - 1) % 7 === 6;
}

// Nishita Kaal is the 8th muhurta of the 15-muhurta night. As an
// *interval* (not just a center point), it runs from 7/15 of the
// night after sunset to 8/15. Returns true iff the target tithi is
// present at any instant within this interval. Tithi is monotonic
// in elongation, so we just check the interval's endpoints.
//
// Used by Smarta Janmashtami: the default rule is "Ashtami prevails
// during Nishita Kaal", not "Ashtami at the center". Centerpoint check
// misses cases where Ashtami starts late in the muhurta window
// (e.g., Kolkata 2025: Ashtami starts 23:50 IST, Kolkata's Nishita
// center is 23:40 → center says miss, but interval [23:19, 00:03]
// catches it).
export function tithiOverlapsNishitaKaal(loc: Location, date: Date, tithiIndex: number): boolean {
  const events = sunRiseSet(loc, date);
  if (!events.rise || !events.set) return false;
  const nextEvents = sunRiseSet(loc, new Date(date.getTime() + MS_PER_DAY));
  const nextRise = nextEvents.rise ?? new Date(events.rise.getTime() + MS_PER_DAY);
  const nightMs = nextRise.getTime() - events.set.getTime();
  const kaalStart = new Date(events.set.getTime() + (7 * nightMs) / 15);
  const kaalEnd = new Date(events.set.getTime() + (8 * nightMs) / 15);
  const startTithi = tithiIndexAtJD(dateToJulian(kaalStart));
  const endTithi = tithiIndexAtJD(dateToJulian(kaalEnd));
  // Tithi is monotonic in elongation → check the [start, end] range.
  return tithiIndex >= startTithi && tithiIndex <= endTithi;
}

// Smarta Janmashtami rule (app default):
//   1. Ashtami (Krishna 8 = tithi index 23) must prevail during the
//      Nishita Kaal of the night following the candidate day.
//   2. If two consecutive days both qualify, pick the LATER day.
//   3. If neither qualifies, fall back to the day with Ashtami at
//      sunrise (= the day after Ashtami enters the night).
//
// Verified against drikpanchang.com Indian-calendar pages for
// Delhi 2025 (Aug 15) and Kolkata 2025 (Aug 15) — both pick the
// same civil day even though local Nishita differs by ~45 min.
//
// Split years: some public calendars publish a later Vaishnava/ISKCON
// date (e.g. Aug 25 in 2016). The app's single default remains Smarta;
// Vaishnava should be added as an explicit variant, not folded into
// this predicate.
export function smartaJanmashtamiMatches(p: Panchanga, masa: string): boolean {
  if (p.masa.amantaName !== masa || p.masa.isAdhika) return false;
  const target = 23; // Krishna Ashtami
  const todayAtKaal = tithiOverlapsNishitaKaal(p.location, p.date, target);
  const tomorrowAtKaal = tithiOverlapsNishitaKaal(
    p.location,
    new Date(p.date.getTime() + MS_PER_DAY),
    target,
  );
  if (todayAtKaal) {
    // 'later' pick: defer to tomorrow if it also qualifies.
    return !tomorrowAtKaal;
  }
  // Sunrise fallback: today has Ashtami at sunrise AND no neighbor
  // qualified via Nishita Kaal.
  if (p.tithi.index !== target) return false;
  const yesterdayAtKaal = tithiOverlapsNishitaKaal(
    p.location,
    new Date(p.date.getTime() - MS_PER_DAY),
    target,
  );
  if (yesterdayAtKaal) return false;
  if (tomorrowAtKaal) return false;
  return true;
}

// Returns the canonical instant at the center of the named muhurta
// window for a given sunrise/sunset pair (and optional moonrise for
// the Chandrodaya case). Returns null when the window can't be
// computed from the available data (e.g., no moonrise on a polar day).
export function windowInstant(
  win: Window,
  sunrise: Date,
  sunset: Date,
  moonrise: Date | null,
): Date | null {
  switch (win) {
    case 'pradosha':
      return new Date(sunset.getTime() + PRADOSHA_OFFSET_MIN * 60_000);
    case 'nishita': {
      // Nishita kaal is the 8th of 15 muhurtas of the night. Midpoint
      // between sunset and the next sunrise approximates it within a
      // few minutes — sufficient for the day-picker tiebreaker.
      const nextSunriseApprox = sunrise.getTime() + MS_PER_DAY;
      return new Date((sunset.getTime() + nextSunriseApprox) / 2);
    }
    case 'aparahna': {
      // The classical 5-part division of daylight places aparahna at
      // 3/5 through the day (after purvahna, madhyahna). Used for
      // Vijayadashami.
      const daylight = sunset.getTime() - sunrise.getTime();
      return new Date(sunrise.getTime() + (daylight * 3) / 5);
    }
    case 'madhyahna': {
      // Midday — exact midpoint of daylight.
      const daylight = sunset.getTime() - sunrise.getTime();
      return new Date(sunrise.getTime() + daylight / 2);
    }
    case 'chandrodaya':
      return moonrise;
  }
}

// Internal: given a location and a civil day, compute the named
// window's center and the tithi index at it. Returns null on any
// missing input. We cache the moonrise call so we don't pay it
// when the window isn't 'chandrodaya'.
interface WindowProbe {
  instant: Date;
  tithiIndex: number;
}
function probeWindow(loc: Location, date: Date, win: Window): WindowProbe | null {
  const events = sunRiseSet(loc, date);
  if (!events.rise || !events.set) return null;
  const moonrise = win === 'chandrodaya' ? moonRiseSet(loc, date).rise : null;
  const instant = windowInstant(win, events.rise, events.set, moonrise);
  if (!instant) return null;
  return { instant, tithiIndex: tithiIndexAtJD(dateToJulian(instant)) };
}

// Date-based vyapini check. The festival fires on `date` when the
// target tithi is present at TODAY'S window, AND the adjacent "other"
// day does NOT also qualify — `pick` decides which side wins when two
// consecutive days both have the tithi at their window.
//
//   pick: 'earlier' — fire on the FIRST qualifying day
//   pick: 'later'   — fire on the SECOND qualifying day
//
// When the adjacent day's data is indeterminate we err on the side of
// firing rather than skipping.
export function vyapiniMatchesForDate(
  loc: Location,
  date: Date,
  win: Window,
  tithiIndex: number,
  pick: 'earlier' | 'later' = 'earlier',
): boolean {
  const today = probeWindow(loc, date, win);
  if (!today || today.tithiIndex !== tithiIndex) return false;
  const offset = pick === 'earlier' ? -MS_PER_DAY : MS_PER_DAY;
  const otherDate = new Date(date.getTime() + offset);
  const other = probeWindow(loc, otherDate, win);
  if (!other) return true; // can't disprove
  return other.tithiIndex !== tithiIndex;
}

// Convenience wrapper used by festival rules that already have a
// Panchanga in hand.
export function vyapiniMatches(
  p: Panchanga,
  win: Window,
  tithiIndex: number,
  pick: 'earlier' | 'later' = 'earlier',
): boolean {
  return vyapiniMatchesForDate(p.location, p.date, win, tithiIndex, pick);
}

// Vyapini with a preferred-nakshatra tiebreaker. When two consecutive
// days both qualify (tithi at window), the day where the preferred
// nakshatra is also at the same window wins. Otherwise falls back to
// `'earlier'` pick + sunrise-tithi fallback.
//
// Used by Vijayadashami: the classical rule prefers the Aparahna-
// vyapini Dashami day on which **Shravana nakshatra** is also present
// at Aparahna. Without Shravana, the earlier of two qualifying days
// wins. With Shravana on the later day, the later day wins.
//
// Verified against Drik for:
//   2019: Oct 7 Dashami+Uttara Ashadha; Oct 8 Dashami+Shravana → Drik Oct 8.
//   2026: Oct 20 Dashami+Shravana; Oct 21 Dashami+Dhanishta   → Drik Oct 20.
//   2022: Oct 5 Dashami (sunrise-fallback path) + Shravana    → Drik Oct 5.
export function vyapiniWithNakshatraPreference(
  p: Panchanga,
  win: Window,
  tithiIndex: number,
  preferredNakshatra: number,
): boolean {
  const today = probeWindow(p.location, p.date, win);
  const yesterday = probeWindow(p.location, new Date(p.date.getTime() - MS_PER_DAY), win);
  const tomorrow = probeWindow(p.location, new Date(p.date.getTime() + MS_PER_DAY), win);

  const hasTithi = (probe: typeof today) => probe?.tithiIndex === tithiIndex;
  const hasNak = (probe: typeof today) =>
    probe &&
    nakshatraIndexAtJD(dateToJulian(probe.instant), p.options.ayanamsa) === preferredNakshatra;

  if (hasTithi(today)) {
    // If today has both tithi + nakshatra → fire.
    if (hasNak(today)) return true;
    // Else: if tomorrow has tithi + preferred nakshatra, defer to tomorrow.
    if (hasTithi(tomorrow) && hasNak(tomorrow)) return false;
    // Else: 'earlier' pick.
    if (hasTithi(yesterday)) {
      // Yesterday already qualified — but did yesterday have preferred
      // nakshatra? If so, yesterday already fired; today doesn't.
      // If yesterday didn't have nakshatra either, yesterday won via
      // 'earlier' pick → today doesn't fire.
      return false;
    }
    return true;
  }

  // Today doesn't have tithi at window — sunrise fallback.
  if (p.tithi.index !== tithiIndex) return false;
  // No adjacent day with the strict vyapini should claim today.
  if (hasTithi(yesterday) || hasTithi(tomorrow)) return false;
  return true;
}

// `BhadraCutoff` defines how strictly Bhadra blocks observance.
//
//   'window'  — Any Bhadra overlap with the observance window shifts
//               the festival to the next day. Used by Raksha Bandhan
//               (afternoon-only festival).
//   'sunset'  — Bhadra tolerated if it ends before sunset.
//   'prahar1' — Bhadra tolerated if it ends before the end of Prahar
//               1 of the night (sunset + 1/4 × nightLength, ≈ 2h30m
//               after sunset in mid-latitudes). Used by Raksha
//               Bandhan: the festival can be tied during Pradosha
//               after Bhadra ends, but only if Bhadra ends within
//               the first quarter of the night.
//   'prahar4' — Bhadra in the window is tolerated as long as it ends
//               before the start of the 4th prahar of the night
//               (~3/4 into the night between sunset and next sunrise).
//   'brahmaMuhurta' — Bhadra must end before next-day Brahma Muhurta
//                     (= sunrise − 96 min). Not wired to any festival.
//                     For Holika Dahan: correctly handles 2012/2013
//                     (no shift) but regresses 2016 (incorrectly no-
//                     shift when Drik shifts). Gap between 2016 Bhadra
//                     end and BM start is only ~25 min; 2012 is ~28 min
//                     — indistinguishable within ephemeris precision.
//   'sunriseMinus120' — Bhadra must end at least 120 min before next
//                       sunrise (nominal cutoff sunrise−115 min, with
//                       5-min guard → effective check at sunrise−120 min).
//                       Same failure mode as brahmaMuhurta: correctly
//                       handles 2012/2013 but regresses 2016 (2016 gap
//                       is ~121 min, only ~3 min above threshold — within
//                       ephemeris uncertainty). Not wired to any festival.
export type BhadraCutoff =
  | 'window'
  | 'sunset'
  | 'prahar1'
  | 'prahar4'
  | 'brahmaMuhurta'
  | 'sunriseMinus120';

// Brahma Muhurta starts 96 minutes before sunrise (= sunrise − 96 min).
const BRAHMA_MUHURTA_BEFORE_SUNRISE_MS = 96 * 60_000;
// sunriseMinus120 nominal offset: with the 5-min guard band, the
// effective check lands at sunrise − 120 min (2 hours before sunrise).
const SUNRISE_MINUS_120_NOMINAL_MS = 115 * 60_000;

// Returns the cutoff instant used to decide whether Bhadra extends
// "too far" on day `date`. Returns null when sunrise/sunset are
// missing.
function bhadraCutoffInstant(
  loc: Location,
  date: Date,
  win: Window,
  cutoff: BhadraCutoff,
  windowInstantValue: Date,
): Date | null {
  if (cutoff === 'window') return windowInstantValue;
  const events = sunRiseSet(loc, date);
  if (!events.rise || !events.set) return null;
  if (cutoff === 'sunset') return events.set;
  // All remaining cutoffs need the next-day sunrise.
  const nextEvents = sunRiseSet(loc, new Date(date.getTime() + MS_PER_DAY));
  const nextSunrise = nextEvents.rise ?? new Date(events.rise.getTime() + MS_PER_DAY);
  // `win` is reserved for future per-window cutoff rules.
  void win;
  if (cutoff === 'brahmaMuhurta') {
    return new Date(nextSunrise.getTime() - BRAHMA_MUHURTA_BEFORE_SUNRISE_MS);
  }
  if (cutoff === 'sunriseMinus120') {
    return new Date(nextSunrise.getTime() - SUNRISE_MINUS_120_NOMINAL_MS);
  }
  // 'prahar1' / 'prahar4' divide the night into 4 prahars.
  const nightMs = nextSunrise.getTime() - events.set.getTime();
  const fraction = cutoff === 'prahar1' ? 0.25 : 0.75;
  return new Date(events.set.getTime() + fraction * nightMs);
}

// Bhadra-Kaal aware vyapini check (used by Holika Dahan, Raksha
// Bandhan). Drik's rule:
//
//   A) Today directly satisfies the vyapini condition. Bhadra at the
//      observance window MAY block, depending on the cutoff:
//        - 'window'  : any Bhadra in the window blocks → shift.
//        - 'prahar4' : Bhadra blocks only if it's still active at the
//                      start of Prahar 4 (3/4 of the night).
//   B) Today does NOT satisfy the vyapini condition, but YESTERDAY
//      had the tithi at its window AND Bhadra forced a shift forward
//      → today is the Bhadra-shifted observance day.
export function bhadraAwareVyapiniMatchesForDate(
  loc: Location,
  date: Date,
  win: Window,
  tithiIndex: number,
  cutoff: BhadraCutoff = 'prahar4',
): boolean {
  // Case A — today has tithi at window.
  const todayProbe = probeWindow(loc, date, win);
  if (todayProbe && todayProbe.tithiIndex === tithiIndex) {
    // Later-pick: if tomorrow also has tithi at window, defer.
    const tomorrowProbe = probeWindow(loc, new Date(date.getTime() + MS_PER_DAY), win);
    if (tomorrowProbe && tomorrowProbe.tithiIndex === tithiIndex) return false;
    if (!isBhadraAtJD(dateToJulian(todayProbe.instant))) return true;
    // Bhadra at window. Check cutoff (with guard band — see comment
    // on BHADRA_GUARD_BAND_MS). "Bhadra extends past cutoff" if it's
    // active at (cutoff - guard).
    const cutoffInstant = bhadraCutoffInstant(loc, date, win, cutoff, todayProbe.instant);
    if (!cutoffInstant) return false;
    const cutoffMinusGuard = new Date(cutoffInstant.getTime() - BHADRA_GUARD_BAND_MS);
    return !isBhadraAtJD(dateToJulian(cutoffMinusGuard));
  }

  // Case B — yesterday's Bhadra forced the shift to today.
  const yesterdayDate = new Date(date.getTime() - MS_PER_DAY);
  const yesterdayProbe = probeWindow(loc, yesterdayDate, win);
  if (!yesterdayProbe || yesterdayProbe.tithiIndex !== tithiIndex) return false;
  if (!isBhadraAtJD(dateToJulian(yesterdayProbe.instant))) return false;
  const yCutoffInstant = bhadraCutoffInstant(
    loc,
    yesterdayDate,
    win,
    cutoff,
    yesterdayProbe.instant,
  );
  if (!yCutoffInstant) return false;
  const yCutoffMinusGuard = new Date(yCutoffInstant.getTime() - BHADRA_GUARD_BAND_MS);
  return isBhadraAtJD(dateToJulian(yCutoffMinusGuard));
}

export function bhadraAwareVyapiniMatches(
  p: Panchanga,
  win: Window,
  tithiIndex: number,
  cutoff: BhadraCutoff = 'prahar4',
): boolean {
  return bhadraAwareVyapiniMatchesForDate(p.location, p.date, win, tithiIndex, cutoff);
}

// Bhadra-aware vyapini with sunrise-tithi fallback. Used by Raksha
// Bandhan where, in tithi-kshaya years (Purnima doesn't span any
// day's Aparahna), observance falls on the day where Purnima is at
// sunrise. Checks the bhadra-aware condition on today / yesterday /
// tomorrow; if NONE match and today's sunrise tithi is the target,
// today fires as the sunrise fallback.
export function bhadraAwareVyapiniWithSunriseFallback(
  p: Panchanga,
  win: Window,
  tithiIndex: number,
  cutoff: BhadraCutoff,
): boolean {
  if (bhadraAwareVyapiniMatchesForDate(p.location, p.date, win, tithiIndex, cutoff)) return true;
  if (p.tithi.index !== tithiIndex) return false;
  const yesterday = new Date(p.date.getTime() - MS_PER_DAY);
  const tomorrow = new Date(p.date.getTime() + MS_PER_DAY);
  if (bhadraAwareVyapiniMatchesForDate(p.location, yesterday, win, tithiIndex, cutoff))
    return false;
  if (bhadraAwareVyapiniMatchesForDate(p.location, tomorrow, win, tithiIndex, cutoff)) return false;
  return true;
}

// Standard vyapini check with a sunrise-tithi fallback. When the tithi
// is short enough to "kshaya" past every day's named window, fall back
// to the civil day where the tithi is present at sunrise — provided
// neither adjacent day fires via the strict vyapini rule.
//
// `tithiAtSunrise` is the index we'd compute from p.tithi.index for
// today; the caller passes it in (rather than us reaching back into p)
// so this works for the Krishna paksha where index 16..30 maps to
// "krishna 1..15".
export function vyapiniWithSunriseFallback(
  p: Panchanga,
  win: Window,
  tithiIndex: number,
  pick: 'earlier' | 'later' = 'earlier',
): boolean {
  if (vyapiniMatchesForDate(p.location, p.date, win, tithiIndex, pick)) return true;
  // Fallback: today's sunrise tithi is the target AND neither adjacent
  // day fires the strict vyapini rule. The "adjacent" search has to
  // cover both sides because the kshaya could fall either way.
  if (p.tithi.index !== tithiIndex) return false;
  const yesterday = new Date(p.date.getTime() - MS_PER_DAY);
  const tomorrow = new Date(p.date.getTime() + MS_PER_DAY);
  if (vyapiniMatchesForDate(p.location, yesterday, win, tithiIndex, pick)) return false;
  if (vyapiniMatchesForDate(p.location, tomorrow, win, tithiIndex, pick)) return false;
  return true;
}

// Sun sankranti with the Drik "Punya Kaal" convention: if the sun
// enters the target sidereal sign *after* sunset on day N, observance
// shifts to day N+1.
//
// `p.solar.signAtDayStart !== p.solar.signAtDayEnd` (already on the
// panchanga) tells us the transit occurs on day N — but to decide if
// it's before or after sunset we have to locate the transit JD by
// linear interpolation (Sun moves ~1° in 24h, so a single-step linear
// estimate is accurate to seconds for our purposes).
//
// We don't have the precise transit JD on the panchanga, so we fall
// back to a structural test: if today's signAtDayEnd matches target
// AND today's sign at sunset is still the OLD sign, the transit
// hasn't happened by sunset → Sankranti = tomorrow. Otherwise today.
// (ayanamsa, sunLongitudeAtJD, julianToDate, civilMidnightInZone are
//  imported at the top of this file alongside the other astro deps.)

// Unused — `findSankrantiTransitJD` computes sidereal directly. Retained
// in the codebase for potential future per-day sign tests.
// function sunSiderealSign(jd: number, p: Panchanga): number {
//   const trop = sunLongitudeAtJD(jd);
//   const sid = (((trop - ayanamsa(jd, p.options.ayanamsa)) % 360) + 360) % 360;
//   return Math.floor(sid / 30);
// }

// Bisect-find the JD at which the Sun's sidereal longitude crosses
// `targetDeg`. Bracket spans 4 days centered ~2 days before the
// expected crossing.
function findSankrantiTransitJD(
  bracketStartJD: number,
  targetDeg: number,
  ayanamsaSys: 'lahiri' | 'raman' | 'kp' | 'yukteshwar' | 'true_chitra',
): number {
  let lo = bracketStartJD;
  let hi = lo + 4;
  const siderealAt = (jd: number) =>
    (((sunLongitudeAtJD(jd) - ayanamsa(jd, ayanamsaSys)) % 360) + 360) % 360;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (siderealAt(mid) < targetDeg) lo = mid;
    else hi = mid;
    if (hi - lo < 1e-8) break;
  }
  return (lo + hi) / 2;
}

// Sun sankranti with Drik's **Sunset cutoff** "Punya Kaal" rule:
//
//   - Find the exact transit instant by bisection on sidereal Sun
//     longitude (sub-second precision).
//   - Compare against sunset of the transit's civil day in location tz.
//   - Transit BEFORE sunset → observance = transit civil day.
//   - Transit AT OR AFTER sunset → observance = next civil day.
//
// This is the rule drikpanchang.com publishes for Makara Sankranti
// (Punya Kaal Muhurta begins next day when Sankranti happens after
// sunset). Verified across 2015–2028 against the Drik Indian calendar
// page (`/calendars/indian/indiancalendar.html?year=YYYY`):
//
//   year   transit IST       drik date    cutoff result
//   2015   Jan 14 18:42      Jan 15       after sunset → next ✓
//   2016   Jan 15 00:43      Jan 15       — (transit civil day)
//   2017   Jan 14 06:58      Jan 14       before sunset → same ✓
//   2018   Jan 14 13:08      Jan 14       same ✓
//   2019   Jan 14 19:14      Jan 15       after sunset → next ✓
//   2020   Jan 15 01:31      Jan 15       same ✓
//   2021   Jan 14 07:38      Jan 14       same ✓
//   2022   Jan 14 13:51      Jan 14       same ✓
//   2023   Jan 14 20:06      Jan 15       after sunset → next ✓
//   2024   Jan 15 02:02      Jan 15       same ✓
//   2025   Jan 14 08:12      Jan 14       same ✓
//   2026   Jan 14 14:21      Jan 14       same ✓
//   2027   Jan 14 20:23      Jan 15       after sunset → next ✓
//
// All 13 years match Drik with the sunset cutoff.
// "Bridge-day" rule for Kartika Shukla 1 (Govardhan Puja):
//
// When Kartika Pratipada begins AFTER sunrise the standard masa-gated
// vyapini rule fails because the panchanga masa is still 'Ashvina' at
// sunrise.  The correct window is MADHYAHNA (midday): Govardhan Puja
// falls on the day when Kartika Shukla Pratipada is present at midday.
//
//   Vyapini (e.g. 2010): Pratipada starts Nov 6 at 10:22 AM (< noon).
//   Nov 6 madhyahna = Pratipada ✓.  Nov 7 madhyahna = Dvitiya (ends
//   08:06 AM).  'Later' = only qualifying day = Nov 6.  Drik: ✓
//
//   Kshaya (e.g. 2029): Pratipada starts Nov 6 at 09:53 AM (< noon).
//   Nov 6 madhyahna = Pratipada ✓.  Nov 7 madhyahna = Dvitiya.  ✓
//
//   Non-bridge years (e.g. 2022, 2023): Amavasya ends at 4:18 PM / 2:56 PM
//   — both AFTER madhyahna.  Nov 6/Nov 13 madhyahna = Amavasya ✗.
//   Bridge day does NOT fire; the clean Kartika day has Pratipada past
//   noon and wins via vyapiniShukla instead.  No false firing. ✓
//
// Complement: for years where Pratipada arrives before or exactly at
// sunrise (the common case), the sunrise panchanga masa is already
// 'Kartika' and the standard vyapiniShukla path handles it.
export function kartikaPratipadaBridgeDay(p: Panchanga): boolean {
  // Sunrise masa must still be Ashvina — Kartika hasn't started yet.
  if (p.masa.amantaName !== 'Ashvina' || p.masa.isAdhika) return false;
  if (!p.sunrise) return false;
  // Sunrise tithi must be Amavasya (last tithi of Ashvina, index 30).
  if (p.tithi.index !== 30) return false;
  // Amavasya must end AFTER sunrise so Pratipada starts today.
  if (p.tithi.endTime <= p.sunrise) return false;
  // Pratipada (index 1) must be present at today's madhyahna (midday).
  // 'Later' pick: if an extraordinary long Pratipada also reaches the
  // next Kartika day's madhyahna, that clean day wins instead.
  return vyapiniMatchesForDate(p.location, p.date, 'madhyahna', 1, 'later');
}

export function sankrantiInto(targetSign: number): (p: Panchanga) => boolean {
  const targetDeg = targetSign * 30;
  return (p) => {
    if (!p.sunrise || !p.sunset) return false;
    // Pre-filter: the transit happens once per year. If today's solar
    // sign is unrelated to the target on either day-boundary, skip.
    if (p.solar.signAtDayStart !== targetSign && p.solar.signAtDayEnd !== targetSign) {
      return false;
    }
    const transitJD = findSankrantiTransitJD(
      dateToJulian(p.date) - 2,
      targetDeg,
      p.options.ayanamsa,
    );
    const transitDate = julianToDate(transitJD);
    // Civil midnight of the transit's civil day in location tz.
    const transitCivilMidnight = civilMidnightInZone(transitDate, p.location.timezone);
    // Sunset of the transit civil day.
    const evToday = sunRiseSet(p.location, transitCivilMidnight);
    if (!evToday.set) return false;
    const observanceMidnight =
      transitDate.getTime() < evToday.set.getTime()
        ? transitCivilMidnight
        : new Date(transitCivilMidnight.getTime() + MS_PER_DAY);
    return observanceMidnight.getTime() === p.date.getTime();
  };
}
