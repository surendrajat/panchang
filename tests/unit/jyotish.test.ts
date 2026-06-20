import { describe, it, expect } from 'vitest';
import { computePanchanga } from '$lib/panchanga';
import {
  civilMidnightInZone,
  sunRiseSet,
  dateToJulian,
  MS_PER_DAY,
} from '$lib/astro';
import {
  computeBirthChart,
  birthInstant,
  computeGrahas,
  grahaSiderealLongitude,
  vimshottariMahadashas,
  antardashasOf,
  GRAHA_ORDER,
} from '$lib/jyotish';
import { DELHI, BENGALURU } from '../helpers';

// Smallest angular separation between two ecliptic longitudes (degrees).
function sep(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360) + 360) % 360;
  return Math.min(d, 360 - d);
}

describe('jyotish — graha positions', () => {
  it('all nine grahas present, longitudes and rashis in range', () => {
    const grahas = computeGrahas(new Date('1990-08-15T10:30:00+05:30'), 'lahiri', 'mean');
    expect(grahas.map((g) => g.key)).toEqual([...GRAHA_ORDER]);
    for (const g of grahas) {
      expect(g.longitude).toBeGreaterThanOrEqual(0);
      expect(g.longitude).toBeLessThan(360);
      expect(g.rashi).toBeGreaterThanOrEqual(0);
      expect(g.rashi).toBeLessThanOrEqual(11);
      expect(g.degInRashi).toBeGreaterThanOrEqual(0);
      expect(g.degInRashi).toBeLessThan(30);
      expect(g.nakshatra).toBeGreaterThanOrEqual(1);
      expect(g.nakshatra).toBeLessThanOrEqual(27);
      expect(g.pada).toBeGreaterThanOrEqual(1);
      expect(g.pada).toBeLessThanOrEqual(4);
    }
  });

  it('Rahu and Ketu are exactly 180° apart and both retrograde', () => {
    const grahas = computeGrahas(new Date('2001-04-10T12:00:00+05:30'), 'lahiri', 'mean');
    const rahu = grahas.find((g) => g.key === 'rahu')!;
    const ketu = grahas.find((g) => g.key === 'ketu')!;
    expect(sep(rahu.longitude, ketu.longitude)).toBeCloseTo(180, 4);
    expect(rahu.retrograde).toBe(true);
    expect(ketu.retrograde).toBe(true);
  });

  it('Sun and Moon never marked retrograde', () => {
    for (const iso of ['1975-01-01T00:00:00Z', '2010-09-09T18:00:00Z', '2026-06-20T06:00:00Z']) {
      const grahas = computeGrahas(new Date(iso), 'lahiri', 'mean');
      expect(grahas.find((g) => g.key === 'sun')!.retrograde).toBe(false);
      expect(grahas.find((g) => g.key === 'moon')!.retrograde).toBe(false);
    }
  });

  it("ABSOLUTE: Sun's sidereal sign on 2026-06-20 is Mithuna (index 2)", () => {
    // Mithuna Sankranti ~15 Jun; by the 20th the Sun is a few degrees in.
    const jd = dateToJulian(new Date('2026-06-20T12:00:00+05:30'));
    const lon = grahaSiderealLongitude('sun', jd, 'lahiri', 'mean');
    expect(Math.floor(lon / 30)).toBe(2);
  });
});

describe('jyotish — consistency with the audited panchanga engine', () => {
  it("kundli Moon nakshatra+pada matches computePanchanga at the same instant", () => {
    for (const iso of ['2024-01-15', '2025-06-15', '2026-03-01', '2026-06-20']) {
      const instant = new Date(`${iso}T06:00:00+05:30`);
      const p = computePanchanga(instant, BENGALURU);
      const grahas = computeGrahas(instant, p.options.ayanamsa, 'mean');
      const moon = grahas.find((g) => g.key === 'moon')!;
      expect(moon.nakshatra).toBe(p.nakshatra.index);
      expect(moon.pada).toBe(p.nakshatra.pada);
    }
  });

  it("kundli Sun rashi matches the panchanga's solar sign at sunrise", () => {
    const dayStart = civilMidnightInZone(new Date('2026-06-20T06:00:00+05:30'), DELHI.timezone);
    const p = computePanchanga(dayStart, DELHI);
    const grahas = computeGrahas(p.sunrise!, p.options.ayanamsa, 'mean');
    expect(grahas.find((g) => g.key === 'sun')!.rashi).toBe(p.solar.sign);
  });
});

describe('jyotish — lagna (ascendant)', () => {
  it('ABSOLUTE: ascendant at sunrise ≈ the Sun (proves it is the rising point, not the descendant)', () => {
    // At sunrise the Sun sits on the eastern horizon, which is exactly the
    // ascending point. A descendant/sign error would show ~180° / large gaps.
    for (const loc of [DELHI, BENGALURU]) {
      for (const iso of ['2026-03-21', '2026-06-20', '2026-09-23', '2026-12-21']) {
        const dayStart = civilMidnightInZone(new Date(`${iso}T06:00:00+05:30`), loc.timezone);
        const sunrise = sunRiseSet(loc, dayStart).rise!;
        const chart = computeBirthChart(sunrise, loc, true);
        const sunLon = chart.grahas.find((g) => g.key === 'sun')!.longitude;
        expect(sep(chart.lagna!.longitude, sunLon)).toBeLessThan(12);
      }
    }
  });

  it('whole-sign houses: a graha in the lagna sign is in house 1; all houses 1..12', () => {
    const chart = computeBirthChart(new Date('1988-11-20T04:15:00+05:30'), DELHI, true);
    expect(chart.lagna).not.toBeNull();
    for (const g of chart.grahas) {
      expect(g.house).not.toBeNull();
      expect(g.house!).toBeGreaterThanOrEqual(1);
      expect(g.house!).toBeLessThanOrEqual(12);
      const expectedHouse = ((g.rashi - chart.lagna!.rashi + 12) % 12) + 1;
      expect(g.house).toBe(expectedHouse);
    }
  });

  it('time-unknown chart suppresses lagna/houses but keeps graha rashis + Moon', () => {
    const chart = computeBirthChart(new Date('1988-11-20T04:15:00+05:30'), DELHI, false);
    expect(chart.lagna).toBeNull();
    expect(chart.grahas.every((g) => g.house === null)).toBe(true);
    expect(chart.moonRashi).toBeGreaterThanOrEqual(0);
    expect(chart.moonRashi).toBeLessThanOrEqual(11);
  });

  it('birthInstant builds the correct UTC instant from civil date+time', () => {
    // 1990-08-15 10:30 IST == 05:00 UTC.
    const inst = birthInstant('1990-08-15', '10:30', 'Asia/Kolkata');
    expect(inst.toISOString()).toBe('1990-08-15T05:00:00.000Z');
  });
});

describe('jyotish — Vimshottari dasha', () => {
  const birth = new Date('1990-08-15T10:30:00+05:30');
  const moonLon = grahaSiderealLongitude('moon', dateToJulian(birth), 'lahiri', 'mean');
  const periods = vimshottariMahadashas(birth, moonLon);

  it('produces 9 contiguous mahadashas summing to 120 years', () => {
    expect(periods).toHaveLength(9);
    const total = periods.reduce((s, p) => s + p.years, 0);
    expect(total).toBe(120);
    for (let i = 1; i < periods.length; i++) {
      expect(periods[i].start.getTime()).toBe(periods[i - 1].end.getTime());
    }
  });

  it('the birth instant falls inside the first (running) mahadasha', () => {
    expect(birth.getTime()).toBeGreaterThanOrEqual(periods[0].start.getTime());
    expect(birth.getTime()).toBeLessThan(periods[0].end.getTime());
  });

  it('each mahadasha span matches its lord (first period back-dated by balance)', () => {
    // Period span in years ≈ the lord's canonical Vimshottari years.
    for (const p of periods) {
      const span = (p.end.getTime() - p.start.getTime()) / (365.25 * MS_PER_DAY);
      expect(span).toBeCloseTo(p.years, 3);
    }
  });

  it('antardashas of a mahadasha sum to the mahadasha span', () => {
    const sub = antardashasOf(periods[0]);
    expect(sub).toHaveLength(9);
    const span = (periods[0].end.getTime() - periods[0].start.getTime()) / (365.25 * MS_PER_DAY);
    const subTotal = sub.reduce((s, p) => s + p.years, 0);
    expect(subTotal).toBeCloseTo(span, 6);
    expect(sub[0].start.getTime()).toBe(periods[0].start.getTime());
    expect(sub[8].end.getTime()).toBe(periods[0].end.getTime());
  });
});
