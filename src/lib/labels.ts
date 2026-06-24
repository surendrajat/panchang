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
import type { AyanamsaSystem } from '$lib/panchanga';

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

// Compact ayanamsa + node labels for the Kundli/Match methodology notes, so those
// notes report the settings actually used (these are user-selectable) rather than
// a hardcoded "Lahiri · mean node" that drifts from the real defaults.
const AYANAMSA_SHORT: Record<AyanamsaSystem, { en: string; hi: string }> = {
  lahiri: { en: 'Lahiri', hi: 'लाहिरी' },
  raman: { en: 'Raman', hi: 'रमण' },
};

export function ayanamsaShortLabel(system: AyanamsaSystem): string {
  return AYANAMSA_SHORT[system][preferences.language === 'hi' ? 'hi' : 'en'];
}

export function nodeShortLabel(nodeType: 'mean' | 'true'): string {
  if (preferences.language === 'hi') return nodeType === 'true' ? 'सत्य राहु' : 'मध्य राहु';
  return nodeType === 'true' ? 'true node' : 'mean node';
}
