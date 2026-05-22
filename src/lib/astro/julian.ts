// Julian Date <-> civil date helpers.
//
// We keep all astronomy in Julian Date (UT). The boundary with civil dates
// is the only place where time zones matter. The browser provides a UTC
// timestamp on every Date object; we convert to JD with the same epoch
// astronomy-engine uses (J2000.0 = JD 2451545.0, which is 2000-01-01T12:00:00Z).

export const JD_J2000 = 2451545.0;
export const JD_UNIX_EPOCH = 2440587.5; // 1970-01-01T00:00:00Z
export const MS_PER_DAY = 86_400_000;

export function dateToJulian(date: Date): number {
  return JD_UNIX_EPOCH + date.getTime() / MS_PER_DAY;
}

export function julianToDate(jd: number): Date {
  return new Date(Math.round((jd - JD_UNIX_EPOCH) * MS_PER_DAY));
}

export function julianCenturiesSinceJ2000(jd: number): number {
  return (jd - JD_J2000) / 36525;
}

export function julianYearsSinceJ2000(jd: number): number {
  return (jd - JD_J2000) / 365.25;
}

// Civil midnight in the given IANA time zone, returned as a UTC Date.
// Used as the "anchor" for a day's panchanga (vara, masa display, etc.).
//
// Iterative fixpoint: encode our current guess's local time into a fake
// UTC instant, compare it to the desired local midnight (also encoded as
// fake UTC), and shift `guess` by the difference. Converges in 1–2 steps
// even across DST boundaries because the formatter is exact at each step.
export function civilMidnightInZone(date: Date, timezone: string): Date {
  const { year, month, day } = civilYMDInZone(date, timezone);
  const targetAsFakeUtc = Date.UTC(year, month - 1, day, 0, 0, 0);

  let guess = targetAsFakeUtc;
  for (let i = 0; i < 4; i++) {
    const here = civilYMDInZone(new Date(guess), timezone);
    const localAsFakeUtc = Date.UTC(
      here.year,
      here.month - 1,
      here.day,
      here.hour,
      here.minute,
      here.second,
    );
    const delta = targetAsFakeUtc - localAsFakeUtc;
    if (delta === 0) break;
    guess += delta;
  }
  return new Date(guess);
}

export interface CivilYMD {
  year: number;
  month: number; // 1..12
  day: number; // 1..31
  hour: number; // 0..23
  minute: number; // 0..59
  second: number; // 0..59
}

const intlCache = new Map<string, Intl.DateTimeFormat>();

function intlFor(timezone: string): Intl.DateTimeFormat {
  let f = intlCache.get(timezone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    intlCache.set(timezone, f);
  }
  return f;
}

export function civilYMDInZone(date: Date, timezone: string): CivilYMD {
  const parts = intlFor(timezone).formatToParts(date);
  const out: Record<string, number> = {};
  for (const p of parts) {
    if (p.type === 'literal') continue;
    out[p.type] = parseInt(p.value, 10);
  }
  // Intl returns hour=24 on the day boundary in some engines; normalize.
  if (out.hour === 24) out.hour = 0;
  return {
    year: out.year,
    month: out.month,
    day: out.day,
    hour: out.hour ?? 0,
    minute: out.minute ?? 0,
    second: out.second ?? 0,
  };
}
