// IANA time zone resolution.
//
// Browsers don't ship a lat/lon → tz mapper, and bundling one (~1MB) is
// overkill for Phase 1. We rely on the cities list (each city has a tz
// baked in) and fall back to the user's browser tz when geolocating
// without an exact city match.
//
// For Phase 2 we can swap in a more accurate solution (e.g., a compact
// tz boundary lookup or a fetch from a tz-finder microservice).

export function browserTimezone(): string {
  if (typeof Intl === 'undefined') return 'UTC';
  return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
}

// Pragmatic fallback: choose the IANA zone whose UTC offset at the given
// instant most closely matches the longitude (15° per hour). Used only
// when we have a raw lat/lon from Geolocation and no city match.
export function approximateTimezoneFromLongitude(longitude: number): string {
  // Hour offset from UTC by longitude (rounded). Note: this is wildly
  // inaccurate near tz boundaries — the city list is much better. This
  // exists purely so geolocation-only flow doesn't crash.
  const offsetHours = Math.round(longitude / 15);
  if (offsetHours === 0) return 'Etc/UTC';
  // Etc/GMT signs are inverted from intuition: Etc/GMT-5 = UTC+5.
  const sign = offsetHours > 0 ? '-' : '+';
  return `Etc/GMT${sign}${Math.abs(offsetHours)}`;
}
