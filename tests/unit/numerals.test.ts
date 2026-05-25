// Unit tests for renderNumber() and applyNumerals().

import { describe, expect, it } from 'vitest';
import { renderNumber, applyNumerals } from '$lib/format/numerals';

const DEVANAGARI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

describe('renderNumber', () => {
  it('latin system returns string representation unchanged', () => {
    expect(renderNumber(0, 'latin')).toBe('0');
    expect(renderNumber(42, 'latin')).toBe('42');
    expect(renderNumber(2026, 'latin')).toBe('2026');
  });

  it('devanagari maps each digit 0–9', () => {
    for (let i = 0; i <= 9; i++) {
      expect(renderNumber(i, 'devanagari')).toBe(DEVANAGARI_DIGITS[i]);
    }
  });

  it('devanagari multi-digit number', () => {
    expect(renderNumber(2026, 'devanagari')).toBe('२०२६');
    expect(renderNumber(1947, 'devanagari')).toBe('१९४७');
  });

  it('defaults to latin when no system given', () => {
    expect(renderNumber(5)).toBe('5');
  });
});

describe('applyNumerals', () => {
  it('latin leaves string unchanged', () => {
    expect(applyNumerals('12:30', 'latin')).toBe('12:30');
    expect(applyNumerals('06:30 AM', 'latin')).toBe('06:30 AM');
  });

  it('devanagari converts only digit characters', () => {
    expect(applyNumerals('12:30', 'devanagari')).toBe('१२:३०');
  });

  it('non-digit characters are preserved verbatim', () => {
    expect(applyNumerals('abc 123 xyz', 'devanagari')).toBe('abc १२३ xyz');
  });

  it('empty string is returned unchanged', () => {
    expect(applyNumerals('', 'latin')).toBe('');
    expect(applyNumerals('', 'devanagari')).toBe('');
  });

  it('string with no digits is returned unchanged', () => {
    expect(applyNumerals('Vasanta', 'devanagari')).toBe('Vasanta');
  });

  it('handles percentages and decimals', () => {
    expect(applyNumerals('98.6%', 'devanagari')).toBe('९८.६%');
  });

  it('full date string conversion', () => {
    expect(applyNumerals('25 May 2026', 'devanagari')).toBe('२५ May २०२६');
  });
});
