// Preference-aware display labels for signs and planets.
//
// The `transliteration` preference (default on) keeps the Sanskrit
// transliteration in English mode (Mesha, Maṅgala) so names read consistently
// across the app. Turned off, English equivalents are used where they exist
// (Aries, Mars). Hindi mode is always Devanagari, regardless of the setting.
//
// Read inside a component template, these track the preference and re-render.

import { preferences } from '$lib/state/preferences.svelte';
import { rashiNameByIndex } from '$lib/i18n';
import { grahaName } from '$lib/jyotish/names';
import { GRAHA_NAMES_EN } from '$lib/jyotish/names';
import { RASHI_SIGN_EN } from '$lib/jyotish/rashi-art';
import type { GrahaKey } from '$lib/jyotish';

export function rashiLabel(index0to11: number): string {
  if (preferences.language === 'hi') return rashiNameByIndex(index0to11, 'hi');
  return preferences.transliteration
    ? rashiNameByIndex(index0to11, 'en')
    : (RASHI_SIGN_EN[index0to11] ?? rashiNameByIndex(index0to11, 'en'));
}

export function grahaLabel(key: GrahaKey): string {
  if (preferences.language === 'hi') return grahaName(key, 'hi');
  return preferences.transliteration ? grahaName(key, 'en') : GRAHA_NAMES_EN[key];
}
