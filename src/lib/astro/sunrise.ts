// Sunrise / sunset / moonrise / moonset using astronomy-engine.
//
// astronomy-engine's SearchRiseSet handles the standard horizon (sun
// center 0°50' below true horizon, accounting for refraction + solar
// semi-diameter), which matches what Drik Panchang reports.
//
// Polar latitudes: at ~|lat| > 66.5° the sun may not rise on a given
// day. SearchRiseSet returns null in that case; callers must handle it.

import { Body, Observer, SearchRiseSet } from 'astronomy-engine';
import type { Location } from '$lib/panchanga/types';

export interface RiseSetEvents {
  rise: Date | null;
  set: Date | null;
}

function observerFor(location: Location): Observer {
  return new Observer(location.latitude, location.longitude, location.altitude ?? 0);
}

// Search a 24h window starting at `dateStart` for both rise and set events.
function searchDay(body: Body, observer: Observer, dateStart: Date): RiseSetEvents {
  const rise = SearchRiseSet(body, observer, +1, dateStart, 1);
  const set = SearchRiseSet(body, observer, -1, dateStart, 1);
  return {
    rise: rise ? rise.date : null,
    set: set ? set.date : null,
  };
}

// sunRiseSet / moonRiseSet are pure functions of (observer, day-start instant),
// but the festival rule engine calls sunRiseSet ~20x for the SAME civil day —
// every vyapini rule recomputes that day's sunrise. A small bounded memo
// collapses those to a single search per (location, day), speeding up every
// computePanchanga (Day, Month, and the festival walk) with ZERO accuracy impact
// — the identical value is returned. Bounded so it can't grow without limit
// across many locations/years; clearing just forces a cheap re-warm. The
// returned values are treated as immutable everywhere (consistent with the rest
// of the engine), so sharing the cached object is safe.
const RISE_SET_CACHE_MAX = 4096;
const riseSetCache = new Map<string, RiseSetEvents>();

function riseSetKey(prefix: string, location: Location, dayStart: Date): string {
  return `${prefix}|${location.latitude},${location.longitude},${location.altitude ?? 0}|${dayStart.getTime()}`;
}

function rememberRiseSet(key: string, events: RiseSetEvents): RiseSetEvents {
  if (riseSetCache.size >= RISE_SET_CACHE_MAX) riseSetCache.clear();
  riseSetCache.set(key, events);
  return events;
}

export function sunRiseSet(location: Location, dayStart: Date): RiseSetEvents {
  const key = riseSetKey('s', location, dayStart);
  const hit = riseSetCache.get(key);
  if (hit) return hit;
  return rememberRiseSet(key, searchDay(Body.Sun, observerFor(location), dayStart));
}

// Moon may rise 0, 1, or 2 times in a 24-hour window. We return the first
// rise and first set after dayStart that fall before dayStart + 30h, which
// is enough to cover the sunrise-to-sunrise day boundary that panchanga
// uses.
export function moonRiseSet(location: Location, dayStart: Date): RiseSetEvents {
  const key = riseSetKey('m', location, dayStart);
  const hit = riseSetCache.get(key);
  if (hit) return hit;
  const observer = observerFor(location);
  const rise = SearchRiseSet(Body.Moon, observer, +1, dayStart, 1.25);
  const set = SearchRiseSet(Body.Moon, observer, -1, dayStart, 1.25);
  return rememberRiseSet(key, {
    rise: rise ? rise.date : null,
    set: set ? set.date : null,
  });
}

// Sunrise on the civil date (used as the anchor for tithi-at-sunrise,
// vara, festival observance, muhurta divisions). `dayStart` should be the
// civil midnight in the location's IANA time zone, expressed as a UTC Date.
export function sunriseOnDay(location: Location, dayStart: Date): Date | null {
  return sunRiseSet(location, dayStart).rise;
}

export function sunsetOnDay(location: Location, dayStart: Date): Date | null {
  return sunRiseSet(location, dayStart).set;
}
