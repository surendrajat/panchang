// Festival rule engine.
//
// Each festival is expressed as a predicate over a `Panchanga` value. The
// engine evaluates every rule for a given day and returns the keys of all
// matching rules. Display ordering is by `displayName`.
//
// `observance` is metadata for the caller (currently informational); the
// most common rule is "tithi present at sunrise of this civil date", which
// the standard panchanga already encodes — the tithi at sunrise IS the
// tithi for the day. Tie-breakers (e.g., which day Janmashtami falls on
// when Krishna Ashtami spans two sunrises) are documented in docs/methodology/
// and implemented as Smarta-default per docs/ARCHITECTURE.md §14.

import type { Panchanga } from '../types';

export interface FestivalRule {
  key: string;
  displayName: string;
  // Optional Hindi/Devanagari display name. Falls back to displayName
  // when absent — used by the i18n layer in components to render
  // festival ribbons / lists in the user's chosen language.
  displayNameHi?: string;
  observance?: 'sunrise_tithi' | 'sunset_tithi' | 'midnight_tithi';
  matches: (p: Panchanga) => boolean;
}

export function evaluateFestivals(rules: readonly FestivalRule[], p: Panchanga): string[] {
  const out: string[] = [];
  for (const rule of rules) {
    if (rule.matches(p)) out.push(rule.key);
  }
  return out;
}

// Convenience: build a "tithi N of paksha P in masa M" predicate.
export function tithiInMasa(
  tithiNumber: number,
  paksha: 'shukla' | 'krishna',
  masaName: string,
): (p: Panchanga) => boolean {
  return (p) =>
    p.tithi.number === tithiNumber &&
    p.tithi.paksha === paksha &&
    p.masa.name === masaName &&
    !p.masa.isAdhika;
}
