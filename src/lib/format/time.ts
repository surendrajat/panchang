// Time-of-day formatting in the user's chosen format.
//
// 24h and 12h are obvious. Ghati/pala is the traditional Hindu time unit:
// 1 day (sunrise to sunrise) = 60 ghati; 1 ghati = 60 pala = 24 minutes.

import { applyNumerals, type NumeralSystem } from './numerals';

export type TimeFormat = '24h' | '12h' | 'ghati';

/** Localization for the ghati/pala format (it has Hindi words + numerals). */
export interface TimeFormatOpts {
  lang?: 'en' | 'hi';
  numerals?: NumeralSystem;
}

export function formatTime(
  instant: Date,
  timezone: string,
  format: TimeFormat = '24h',
  sunriseAnchor?: Date | null,
  opts?: TimeFormatOpts,
): string {
  if (format === 'ghati') {
    if (!sunriseAnchor) return formatTime(instant, timezone, '24h');
    return formatGhatiPala(instant, sunriseAnchor, opts);
  }
  const hour12 = format === '12h';
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: hour12 ? 'numeric' : '2-digit',
    minute: '2-digit',
    hour12,
  });
  return fmt.format(instant);
}

export function formatTimeShort(
  instant: Date,
  timezone: string,
  format: TimeFormat = '24h',
  sunriseAnchor?: Date | null,
): string {
  return formatTime(instant, timezone, format, sunriseAnchor);
}

// Pretty date: "Mon, 20 May 2026" (en-GB) or "सोम, 20 मई 2026"
// (hi-IN). Locale tag is passed in so the caller can pick based on
// the active language preference.
export function formatDate(instant: Date, timezone: string, localeTag: string = 'en-GB'): string {
  return new Intl.DateTimeFormat(localeTag, {
    timeZone: timezone,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(instant);
}

// YYYY-MM-DD in the location's time zone. Use this for URL building
// — never `toISOString().slice(0, 10)`, which silently uses UTC and
// off-by-ones East-of-UTC zones (panchanga.date is local-midnight-as-
// UTC, e.g. Jul 28 18:30 UTC for Jul 29 IST → UTC date is Jul 28).
export function localYMD(instant: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

const MS_PER_PALA = 24_000; // 24 seconds — 60 pala per ghati
const MS_PER_GHATI = 24 * 60 * 1000; // 24 minutes

function formatGhatiPala(instant: Date, sunrise: Date, opts?: TimeFormatOpts): string {
  const lang = opts?.lang ?? 'en';
  const numerals = opts?.numerals ?? 'latin';
  const elapsed = instant.getTime() - sunrise.getTime();
  if (elapsed < 0) return lang === 'hi' ? 'सूर्योदय से पूर्व' : 'before sunrise';
  const ghati = Math.floor(elapsed / MS_PER_GHATI);
  const palaRemainderMs = elapsed - ghati * MS_PER_GHATI;
  const pala = Math.floor(palaRemainderMs / MS_PER_PALA);
  const num = (n: number) => applyNumerals(String(n), numerals);
  const gh = lang === 'hi' ? 'घ' : 'gh';
  const pa = lang === 'hi' ? 'प' : 'p';
  return `${num(ghati)}${gh} ${num(pala)}${pa}`;
}
