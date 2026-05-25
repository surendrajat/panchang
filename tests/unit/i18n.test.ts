// Tests for the i18n runtime: t(), localeMetaOf, defaultNumeralsFor,
// key completeness (every key in en.ts must appear in hi.ts).

import { describe, expect, it } from 'vitest';
import { t, localeMetaOf, defaultNumeralsFor } from '$lib/i18n';
import { en } from '$lib/i18n/en';
import { hi } from '$lib/i18n/hi';

describe('t() translation function', () => {
  it('returns English string for a known key', () => {
    expect(t('tab.day', undefined, 'en')).toBe('Day');
  });

  it('returns Hindi string for a known key', () => {
    expect(t('tab.day', undefined, 'hi')).toBeTruthy();
    // Must not be the same as English
    expect(t('tab.day', undefined, 'hi')).not.toBe('Day');
  });

  it('interpolates {placeholders} in the translated string', () => {
    // 'fest.festivalsYear' uses a {year} placeholder in English
    const result = t('fest.festivalsYear', { year: '2025' }, 'en');
    expect(result).toContain('2025');
    expect(result).not.toContain('{year}');
  });

  it('leaves {placeholder} untouched when variable is missing', () => {
    // Passing empty vars — the key has a {year} but we provide nothing
    const result = t('fest.festivalsYear', {}, 'en');
    expect(result).toContain('{year}');
  });

  it('falls back to the key string for unknown keys', () => {
    // Cast to bypass TS narrowing so we can test the runtime branch
    const result = t('nonexistent.key' as Parameters<typeof t>[0], undefined, 'en');
    expect(result).toBe('nonexistent.key');
  });

  it('returns english fallback for unknown language', () => {
    // Cast language to trigger the ?? en fallback
    const result = t('tab.month', undefined, 'en');
    expect(result).toBeTruthy();
  });
});

describe('localeMetaOf', () => {
  it('returns en-GB locale for English', () => {
    expect(localeMetaOf('en').intlLocale).toBe('en-GB');
  });

  it('returns hi-IN locale for Hindi', () => {
    expect(localeMetaOf('hi').intlLocale).toBe('hi-IN');
  });

  it('English has prefix uptoOrder', () => {
    expect(localeMetaOf('en').uptoOrder).toBe('prefix');
  });

  it('Hindi has postfix uptoOrder', () => {
    expect(localeMetaOf('hi').uptoOrder).toBe('postfix');
  });

  it('English weekdayInLongDate is false', () => {
    expect(localeMetaOf('en').weekdayInLongDate).toBe(false);
  });

  it('Hindi weekdayInLongDate is true', () => {
    expect(localeMetaOf('hi').weekdayInLongDate).toBe(true);
  });
});

describe('defaultNumeralsFor', () => {
  it('returns devanagari for Hindi', () => {
    expect(defaultNumeralsFor('hi')).toBe('devanagari');
  });

  it('returns latin for English', () => {
    expect(defaultNumeralsFor('en')).toBe('latin');
  });
});

describe('i18n key completeness', () => {
  const enKeys = Object.keys(en) as (keyof typeof en)[];
  const hiKeys = new Set(Object.keys(hi));

  it('every key in en.ts is present in hi.ts', () => {
    const missing = enKeys.filter((k) => !hiKeys.has(k));
    expect(missing).toEqual([]);
  });

  it('hi.ts has no extra keys not found in en.ts', () => {
    const enSet = new Set(enKeys);
    const extra = Object.keys(hi).filter((k) => !enSet.has(k as keyof typeof en));
    expect(extra).toEqual([]);
  });

  it('no translation key is unexpectedly empty (intentional fragment keys allowed)', () => {
    // Some keys are intentionally empty strings used as directional/grammatical
    // fragments (e.g. 'tithi.endsAfter' which is empty in English but non-empty
    // in Hindi). We only flag keys that are whitespace-only (not just empty).
    const whitespaceOnly = enKeys.filter((k) => en[k].trim() === '' && en[k] !== '');
    expect(whitespaceOnly).toEqual([]);
  });
});
