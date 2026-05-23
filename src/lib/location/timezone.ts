// IANA time zone resolution for app defaults.
//
// Browsers expose the user's current IANA zone, but not a general
// latitude/longitude -> timezone mapper. Location search and geolocation use
// the bundled city list, where every city has an explicit timezone.

export function browserTimezone(): string {
  if (typeof Intl === 'undefined') return 'UTC';
  return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
}
