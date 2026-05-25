// Lean translation runtime.
//
// `t(key, vars?)` returns the translated string for the active
// language, with {placeholder} interpolation. Per-language metadata
// (BCP-47 locale tag, postposition order, weekday-in-date flag) lives
// in a sibling `META` table so adding a new language is purely data —
// no `if (language === 'hi')` branches scattered through components.

import { en, type TranslationKey } from './en';
import { hi } from './hi';
import type { NumeralSystem } from '$lib/format/numerals';

export type Language = 'en' | 'hi';

const TABLES: Record<Language, Record<TranslationKey, string>> = { en, hi };

// Per-language behavior metadata. Components read from `localeMetaOf`
// rather than branching on language identity, so a Tamil/Telugu/Bangla
// addition is purely a new entry here + new translation files.
export interface LocaleMeta {
  // BCP-47 tag for Intl.DateTimeFormat. Drives weekday/month names.
  intlLocale: string;
  // True when the Intl-formatted long date already begins with the
  // weekday in the user's language (so appending a separate vara
  // would duplicate it). En-GB: "Thursday, 21 May 2026" — but the
  // vara "Guruvara" is a *different* Sanskrit word, so we still
  // append it. Hi-IN: "गुरुवार, 21 मई 2026" — the weekday IS the
  // vara, so skip the suffix.
  weekdayInLongDate: boolean;
  // 'prefix' for "upto 08:27" (English), 'postfix' for "08:27 तक"
  // (Hindi). Generalizes to any language whose grammar puts the
  // postposition after the time.
  //
  // (Note: the parallel "ends X · then Y" line in the hero is driven
  // by the `tithi.endsBefore` / `tithi.endsAfter` translation keys —
  // empty/non-empty fragments — so no separate meta flag is needed
  // for it.)
  uptoOrder: 'prefix' | 'postfix';
}

const META: Record<Language, LocaleMeta> = {
  en: {
    intlLocale: 'en-GB',
    weekdayInLongDate: false,
    uptoOrder: 'prefix',
  },
  hi: {
    intlLocale: 'hi-IN',
    weekdayInLongDate: true,
    uptoOrder: 'postfix',
  },
};

export function localeMetaOf(lang: Language): LocaleMeta {
  return META[lang] ?? META.en;
}

// Component code imports `preferences` from state, but this i18n core
// must stay pure (no Svelte runes here) so it can be called from
// anywhere. We expose a setter that the preferences store wires up at
// hydration.
let _language: Language = 'en';

export function setLanguage(lang: Language): void {
  _language = lang;
}

export function currentLanguage(): Language {
  return _language;
}

// Default numeral system per language. Unused now — the app keeps
// numerals as an independent preference — but exported for future
// callers who may want a "match my language" nudge in Settings.
export function defaultNumeralsFor(lang: Language): NumeralSystem {
  return lang === 'hi' ? 'devanagari' : 'latin';
}

export function t(
  key: TranslationKey,
  vars?: Record<string, string | number>,
  lang?: Language,
): string {
  const table = TABLES[lang ?? _language] ?? en;
  const raw = table[key] ?? en[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name) =>
    vars[name] !== undefined ? String(vars[name]) : `{${name}}`,
  );
}

export type { TranslationKey };

// Re-export the indexed name lookups from a sibling module to keep
// each table in a single place yet importable from `$lib/i18n`.
export {
  tithiNameByIndex,
  nakshatraNameByIndex,
  yogaNameByIndex,
  masaNameByIndex,
  rashiNameByIndex,
  samvatsaraNameByIndex,
  karanaNameByPosition,
  localizeTithi,
} from './names';
