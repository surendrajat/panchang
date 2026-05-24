// Shared test fixtures: location constants and date helpers.
// Import these instead of duplicating across test files.

import type { Location } from '$lib/panchanga';

export const DELHI: Location = {
  name: 'New Delhi, India',
  latitude: 28.6139,
  longitude: 77.209,
  altitude: 216,
  timezone: 'Asia/Kolkata',
};

export const BENGALURU: Location = {
  name: 'Bengaluru, India',
  latitude: 12.9716,
  longitude: 77.5946,
  altitude: 920,
  timezone: 'Asia/Kolkata',
};

/** Format a Date as YYYY-MM-DD in the given IANA timezone. */
export function toYMD(d: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(d);
}
