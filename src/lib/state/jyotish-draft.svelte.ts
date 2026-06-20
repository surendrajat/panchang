// Draft state for the kundli + matching forms, held at module scope so it
// survives component unmount/remount. The #/kundli and #/match routes are
// lazy-loaded and unmount when you navigate away (or the lazy chunk reloads),
// which would otherwise wipe a half-entered form. Components initialise their
// local $state from these drafts and sync changes back via a single $effect.

import type { Location } from '$lib/panchanga';
import type { BirthChart, MatchResult } from '$lib/jyotish';

export interface KundliDraft {
  name: string;
  date: string;
  time: string;
  timeKnown: boolean;
  place: Location | null;
  chart: BirthChart | null;
  editing: boolean;
  saved: boolean;
}

export const kundliDraft = $state<KundliDraft>({
  name: '',
  date: '',
  time: '12:00',
  timeKnown: true,
  place: null,
  chart: null,
  editing: true,
  saved: false,
});

export interface PersonDraft {
  name: string;
  date: string;
  time: string;
  place: Location | null;
}

export interface MatchOutput {
  result: MatchResult;
  g: { nak: number; rashi: number };
  b: { nak: number; rashi: number };
}

export interface MatchDraft {
  groom: PersonDraft;
  bride: PersonDraft;
  out: MatchOutput | null;
}

export const matchDraft = $state<MatchDraft>({
  groom: { name: '', date: '', time: '12:00', place: null },
  bride: { name: '', date: '', time: '12:00', place: null },
  out: null,
});
