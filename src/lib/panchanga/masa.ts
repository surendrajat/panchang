// Masa — the lunar month, with adhika (intercalary) and kshaya (dropped)
// detection.
//
// A lunar month runs new-moon-to-new-moon (Amanta convention) or full-moon-
// to-full-moon (Purnimanta). The astronomy is identical; only the display
// label and the paksha/masa boundary shift.
//
// Naming rule (Drik Panchang convention): the month starting at new-moon
// N is named after the sidereal sign the Sun is in at the moment of N.
// See `MASA_INDEX_BY_SUN_SIGN` in names.ts.
//
// Adhik Maas: a lunar month in which the Sun does NOT enter a new
// sidereal sign. Two consecutive lunar months are then named the same;
// the first is "Adhika" (extra) and the second is the "Nija" (regular).
//
// Kshaya: a lunar month in which the Sun enters TWO sidereal signs.
// Extremely rare (~once per 19 years or so). The month name is then a
// hybrid; we just flag it.

import { SearchMoonPhase, type AstroTime } from 'astronomy-engine';

import {
  siderealFromTropical,
  dateToJulian,
  JD_UNIX_EPOCH,
  julianToDate,
  MS_PER_DAY,
  sunLongitudeAtJD,
} from '$lib/astro';
import type { AyanamsaSystem, MasaInfo, MonthSystem, Paksha } from './types';
import { MASA_INDEX_BY_SUN_SIGN, MASA_NAMES } from './names';

// astronomy-engine's SearchMoonPhase finds the next moon at a given
// Sun-Moon elongation. New moon is at 0°. Full moon is at 180°.
const NEW_MOON_PHASE = 0;

// Sidereal solar sign index 0..11 (Mesha = 0).
function sunSiderealSign(jd: number, system: AyanamsaSystem): number {
  const sidLong = siderealFromTropical(sunLongitudeAtJD(jd), jd, system);
  return Math.floor(sidLong / 30);
}

// New-moon cache. SearchMoonPhase is the hottest call on the panchanga
// critical path (each computePanchanga makes two: one back, one fwd).
// A year of festivals hits ~730 searches; bisection inside each costs
// ~30+ ephemeris evals. Caching by 30-day epoch bucket cuts that to
// ~12 unique searches per year, with one indirection on the rest.
//
// Key = floor(JD / 30). Each cached entry holds the JDs of all new
// moons in a window slightly wider than the bucket so adjacent JDs
// can answer "previous" / "next" without re-searching.
interface NewMoonCacheEntry {
  /** Sorted list of new-moon JDs covering the bucket and ±35 days. */
  jds: number[];
}
const NEW_MOON_CACHE = new Map<number, NewMoonCacheEntry>();
const BUCKET_DAYS = 30;

function newMoonsAround(jd: number): number[] {
  const bucket = Math.floor(jd / BUCKET_DAYS);
  const cached = NEW_MOON_CACHE.get(bucket);
  if (cached) return cached.jds;
  // Search a window from 40 days before the bucket start to 40 days
  // after its end. That guarantees we capture at least one new moon
  // *before* and one *after* any JD in the bucket (synodic month is
  // 29.53 days), so previous/next lookups are pure array scans.
  const winStart = bucket * BUCKET_DAYS - 40;
  const winEnd = (bucket + 1) * BUCKET_DAYS + 40;
  const jds: number[] = [];
  let cursor = new Date((winStart - JD_UNIX_EPOCH) * MS_PER_DAY);
  let safety = 6; // ~6 new moons in an 80-day window — plenty.
  while (safety-- > 0) {
    const limit = winEnd - dateToJulian(cursor);
    if (limit <= 0) break;
    const r: AstroTime | null = SearchMoonPhase(NEW_MOON_PHASE, cursor, limit);
    if (!r) break;
    const rjd = dateToJulian(r.date);
    if (rjd > winEnd) break;
    jds.push(rjd);
    // Advance by 24h after the found moon to find the next.
    cursor = new Date(r.date.getTime() + MS_PER_DAY);
  }
  NEW_MOON_CACHE.set(bucket, { jds });
  return jds;
}

// Find the JD of the new moon at or just before `jd`.
function previousNewMoon(jd: number): number {
  const candidates = newMoonsAround(jd);
  let lastBefore = -Infinity;
  for (const c of candidates) {
    if (c <= jd && c > lastBefore) lastBefore = c;
  }
  if (lastBefore === -Infinity) {
    throw new Error('No previous new moon found in cache near JD ' + jd);
  }
  return lastBefore;
}

// Find the JD of the new moon strictly after `jd`.
function nextNewMoon(jd: number): number {
  const candidates = newMoonsAround(jd);
  for (const c of candidates) {
    if (c > jd) return c;
  }
  // Cache miss at the upper edge — fall through to a direct search.
  const start = julianToDate(jd + 0.01);
  const result = SearchMoonPhase(NEW_MOON_PHASE, start, 35);
  if (!result) throw new Error('No next new moon found within 35 days of JD ' + jd);
  return dateToJulian(result.date);
}

export interface MasaContext {
  // JD bounds of the Amanta lunar month containing `jd`.
  startNewMoonJD: number;
  endNewMoonJD: number;
  // Sun sidereal sign at start (used to name the month) and at end (used
  // to detect Adhika / Kshaya).
  signAtStart: number;
  signAtEnd: number;
}

export function masaContext(jd: number, ayanamsaSystem: AyanamsaSystem): MasaContext {
  const startNewMoonJD = previousNewMoon(jd);
  const endNewMoonJD = nextNewMoon(jd);
  return {
    startNewMoonJD,
    endNewMoonJD,
    signAtStart: sunSiderealSign(startNewMoonJD, ayanamsaSystem),
    signAtEnd: sunSiderealSign(endNewMoonJD, ayanamsaSystem),
  };
}

export function computeMasa(ctx: MasaContext, paksha: Paksha, monthSystem: MonthSystem): MasaInfo {
  const { signAtStart, signAtEnd } = ctx;
  const signsCrossed = (signAtEnd - signAtStart + 12) % 12;

  // Sign-crossed semantics:
  //   0 → Adhika: Sun did not enter a new sidereal sign during this lunar month
  //   1 → Normal month
  //   2 → Kshaya: Sun crossed two signs during this lunar month
  const isAdhika = signsCrossed === 0;
  const isKshaya = signsCrossed === 2;

  // Name the Amanta month from the sun sign at the START new moon.
  // (Equivalent: name from sign Sun *enters* during the month — but for
  // Adhika we keep the same name as the following Nija month.)
  //
  // Drik Panchang's convention: an Adhika month takes the name of the
  // FOLLOWING (Nija) regular month. Equivalently, the Adhika month is
  // named from `signAtStart`, and the Nija month is also named from its
  // own `signAtStart` (which equals signAtEnd of the Adhika month).
  // Either way the name is `MASA_INDEX_BY_SUN_SIGN[signAtStart]`.
  const amantaMasaIndex = MASA_INDEX_BY_SUN_SIGN[signAtStart];
  const amantaName = MASA_NAMES[amantaMasaIndex - 1];

  // Purnimanta shift: in Purnimanta the month boundary is the full moon
  // mid-cycle, so the Krishna paksha of a *Nija* (regular) month
  // "belongs" to the next month name.
  //
  // CRITICAL: an Adhika (intercalary) month is the exception. Its
  // Krishna paksha keeps the Adhika name rather than shifting forward
  // — both pakshas of an Adhika lunar month read as "Adhika <X>".
  // Otherwise, in a year like 2026 where Adhika Jyeshtha occurs, the
  // Purnimanta display would jump Jyeshtha → Ashadha → Jyeshtha →
  // Ashadha as the calendar crosses lunar boundaries, which is wrong
  // and reads as a time-machine glitch to the user. With this guard
  // the sequence reads monotonically: Adhika Jyeshtha → Jyeshtha →
  // Ashadha.
  let displayIndex = amantaMasaIndex;
  if (monthSystem === 'purnimanta' && paksha === 'krishna' && !isAdhika) {
    displayIndex = (amantaMasaIndex % 12) + 1;
  }

  return {
    name: MASA_NAMES[displayIndex - 1],
    index: displayIndex,
    amantaName,
    amantaIndex: amantaMasaIndex,
    isAdhika,
    isKshaya,
    system: monthSystem,
  };
}
