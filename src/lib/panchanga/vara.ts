// Vara: the Hindu weekday.
//
// The Hindu day runs sunrise-to-sunrise (not midnight-to-midnight). For
// a civil date D we compute sunrise(D) at the location, then the vara is
// just the JavaScript weekday at that sunrise instant in local time. If
// the user asks "what is the vara at 2 AM today?", they actually mean
// yesterday's vara — but the API accepts a civil date (not an instant),
// which makes the anchor unambiguous: sunrise of that civil date.

import type { Location, Vara } from './types';
import { VARA_NAMES } from './names';

// Compute vara for a sunrise instant. If sunrise is null (polar latitudes),
// fall back to the weekday at local noon.
export function varaAtSunrise(
  sunrise: Date | null,
  fallbackInstant: Date,
  location: Location,
): Vara {
  const instant = sunrise ?? fallbackInstant;
  const weekday = weekdayInZone(instant, location.timezone);
  return VARA_NAMES[weekday] as Vara;
}

function weekdayInZone(date: Date, timezone: string): number {
  // 'en-US' weekday short returns Sun/Mon/Tue/Wed/Thu/Fri/Sat.
  const fmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: timezone });
  const day = fmt.format(date);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[day] ?? 0;
}
