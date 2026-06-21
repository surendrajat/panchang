// @vitest-environment happy-dom
//
// Regression tests for the four primary tabs (Day, Month/Calendar, Festivals,
// Kundli). These views are stable, so we lock their core behaviour: Day and Month
// are rendered (they compute synchronously from props); Festivals is exercised via
// the annual-list data it shows (its render path goes through a Worker/IndexedDB
// loader that doesn't run under happy-dom); Kundli via the birth-chart computation
// plus rendering its KundliChart with that chart.
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import { preferences } from '$lib/state/preferences.svelte';
import { findFestivals, MONTHLY_OBSERVANCE_KEYS, type Location } from '$lib/panchanga';
import { computeBirthChart } from '$lib/jyotish/chart';
import KundliChart from '$components/KundliChart.svelte';
import Day from '../../src/routes/Day.svelte';
import Month from '../../src/routes/Month.svelte';

const DELHI: Location = {
  name: 'New Delhi',
  latitude: 28.6139,
  longitude: 77.209,
  timezone: 'Asia/Kolkata',
};

beforeEach(() => {
  preferences.location = DELHI;
  preferences.language = 'en';
  // Day/Month gate their sync-compute on `hydrated` (set by hydratePreferences in
  // the app). Tests set it directly so the views compute instead of showing
  // "Loading…".
  preferences.hydrated = true;
});
afterEach(cleanup);

describe('Day tab', () => {
  it('renders the panchanga and the festival(s) for a date', () => {
    // 2026-11-08 carries Diwali (+ Naraka Chaturdashi + Amavasya).
    const { container } = render(Day, { props: { yyyymmdd: '2026-11-08' } });
    const text = container.textContent ?? '';
    expect(text).toContain('Diwali');
    // A real panchanga rendered (not the empty/invalid state).
    expect(container.querySelector('table, .day-card, [class*="card"]')).toBeTruthy();
  });

  it('handles an invalid date string without crashing', () => {
    const { container } = render(Day, { props: { yyyymmdd: 'not-a-date' } });
    expect(container).toBeTruthy();
    expect((container.textContent ?? '').toLowerCase()).not.toContain('diwali');
  });
});

describe('Month tab (calendar grid)', () => {
  it('renders a 7-column grid for the month', () => {
    const { container } = render(Month, { props: { yyyymm: '2026-11' } });
    expect(container.querySelectorAll('.cell').length).toBeGreaterThanOrEqual(28);
  });

  it('shows ALL THREE festivals on 2026-11-08 (Naraka + Diwali + Amavasya)', () => {
    // Regression for the multi-festival cell + the Amavasya-alongside-annual fix.
    const { container } = render(Month, { props: { yyyymm: '2026-11' } });
    const text = container.textContent ?? '';
    expect(text).toContain('Naraka');
    expect(text).toContain('Diwali');
    expect(text).toContain('Amavasya'); // the Pitru Amavasya is no longer suppressed
  });

  it('uses full vara names in the weekday header (not abbreviations)', () => {
    const { container } = render(Month, { props: { yyyymm: '2026-11' } });
    const headers = Array.from(container.querySelectorAll('.dh')).map((e) => e.textContent?.trim());
    expect(headers).toContain('Somavara'); // Monday, full vara
    expect(headers).toContain('Ravivara'); // Sunday, full vara
    expect(headers).not.toContain('Mon'); // old abbreviation gone
  });
});

describe('Festivals tab (annual list data)', () => {
  const occ = findFestivals(
    new Date(Date.UTC(2026, 0, 1, 6)),
    new Date(Date.UTC(2026, 11, 31, 6)),
    DELHI,
    undefined,
    { annualOnly: true },
  );
  const keys = new Set(occ.map((o) => o.key));

  it('contains the major annual festivals', () => {
    for (const k of ['makara_sankranti', 'maha_shivaratri', 'rama_navami', 'diwali', 'thiruvonam'])
      expect(keys.has(k), `annual list missing ${k}`).toBe(true);
  });

  it('excludes every monthly observance (incl. both Amavasya keys)', () => {
    for (const k of MONTHLY_OBSERVANCE_KEYS)
      expect(keys.has(k), `monthly key ${k} leaked into annual list`).toBe(false);
    expect(keys.has('amavasya_devakarya')).toBe(false);
  });
});

describe('Kundli tab', () => {
  // A fixed birth: 1990-01-15 10:30 IST, New Delhi.
  const chart = computeBirthChart(new Date('1990-01-15T10:30:00+05:30'), DELHI, true);

  it('computes a chart with 9 grahas, a lagna, and a moon rashi', () => {
    expect(chart.grahas.length).toBe(9); // Su Mo Ma Me Ju Ve Sa Ra Ke
    expect(chart.lagna).not.toBeNull(); // time known → lagna + houses
    expect(chart.moonRashi).toBeGreaterThanOrEqual(0);
    expect(chart.moonRashi).toBeLessThanOrEqual(11);
    // every graha placed in a rashi (0..11) and, with a known time, a house (1..12)
    for (const g of chart.grahas) {
      expect(g.rashi).toBeGreaterThanOrEqual(0);
      expect(g.rashi).toBeLessThanOrEqual(11);
      expect(g.house).toBeGreaterThanOrEqual(1);
      expect(g.house).toBeLessThanOrEqual(12);
    }
  });

  it('renders the KundliChart SVG for that chart', () => {
    const { container } = render(KundliChart, {
      props: { chart, lang: 'en', numerals: preferences.numerals, varga: 1 },
    });
    expect(container.querySelector('svg')).toBeTruthy();
  });
});
