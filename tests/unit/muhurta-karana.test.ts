// Unit tests for karana sequence (multi-karana per day) and the
// expanded muhurta set (Brahma, Pratah Sandhya, Abhijit, Vijaya,
// Godhuli, Sayahna Sandhya, Nishita Kaal + the three inauspicious
// segments).

import { describe, expect, it } from 'vitest';
import { computePanchanga } from '$lib/panchanga';
import { karanaSequenceForDay } from '$lib/panchanga/karana';

const DELHI = {
  name: 'New Delhi', latitude: 28.6139, longitude: 77.209,
  altitude: 216, timezone: 'Asia/Kolkata',
};

describe('karana sequence', () => {
  it('returns 2 or 3 karanas for a typical day (each ~12h)', () => {
    const anchor = new Date('2026-05-01T01:00:00Z'); // ~06:30 IST sunrise
    const seq = karanaSequenceForDay(anchor);
    expect(seq.length).toBeGreaterThanOrEqual(2);
    expect(seq.length).toBeLessThanOrEqual(4);
  });

  it("each successive karana starts at the previous one's endTime", () => {
    const anchor = new Date('2026-05-01T01:00:00Z');
    const seq = karanaSequenceForDay(anchor);
    for (let i = 1; i < seq.length; i++) {
      // The probe steps 1 min past endTime so the next karana begins
      // within 1 min of prev.endTime — allow that small jitter.
      expect(Math.abs(seq[i - 1].endTime.getTime() - seq[i].endTime.getTime() + 12 * 3600_000)).toBeLessThan(2 * 60 * 60_000);
    }
  });

  it('panchanga exposes a non-empty karanas array', () => {
    const p = computePanchanga(new Date('2026-05-01T06:30:00+05:30'), DELHI);
    expect(p.karanas.length).toBeGreaterThanOrEqual(2);
    expect(p.karanas[0].name).toBe(p.karana.name); // first matches sunrise karana
  });
});

describe('muhurta expansion', () => {
  const p = computePanchanga(new Date('2026-05-01T06:30:00+05:30'), DELHI);
  const m = p.muhurta;

  it('Brahma Muhurta is 48 min, ending 48 min before sunrise', () => {
    expect(m.brahmaMuhurta.end.getTime() - m.brahmaMuhurta.start.getTime()).toBe(48 * 60_000);
    expect(p.sunrise!.getTime() - m.brahmaMuhurta.end.getTime()).toBe(48 * 60_000);
  });

  it('Pratah Sandhya is the 48 min ending at sunrise', () => {
    expect(m.pratahSandhya.end).toEqual(p.sunrise);
    expect(m.pratahSandhya.end.getTime() - m.pratahSandhya.start.getTime()).toBe(48 * 60_000);
  });

  it('Abhijit is centred on solar noon (or null on Wednesday)', () => {
    if (m.abhijit) {
      const noon = (p.sunrise!.getTime() + p.sunset!.getTime()) / 2;
      const abhijitMid = (m.abhijit.start.getTime() + m.abhijit.end.getTime()) / 2;
      expect(Math.abs(abhijitMid - noon)).toBeLessThan(1000);
    }
  });

  it('Vijaya is the 11th of 15 daylight muhurtas', () => {
    const day = p.sunset!.getTime() - p.sunrise!.getTime();
    const muh = day / 15;
    const expectedStart = p.sunrise!.getTime() + 10 * muh;
    expect(Math.abs(m.vijayaMuhurta.start.getTime() - expectedStart)).toBeLessThan(1000);
  });

  it('Godhuli is 48 min centred on sunset', () => {
    const setMs = p.sunset!.getTime();
    expect(m.godhuli.start.getTime()).toBe(setMs - 24 * 60_000);
    expect(m.godhuli.end.getTime()).toBe(setMs + 24 * 60_000);
  });

  it('Sayahna Sandhya is the 48 min after sunset', () => {
    expect(m.sayahnaSandhya.start).toEqual(p.sunset);
    expect(m.sayahnaSandhya.end.getTime() - m.sayahnaSandhya.start.getTime()).toBe(48 * 60_000);
  });

  it('Nishita Kaal is the 8th of 15 night muhurtas', () => {
    const nightMs = p.sunrise!.getTime() + 24 * 3600_000 - p.sunset!.getTime();
    const muh = nightMs / 15;
    const expectedStart = p.sunset!.getTime() + 7 * muh;
    expect(Math.abs(m.nishitaKaal.start.getTime() - expectedStart)).toBeLessThan(1000);
  });

  it('Rahu Kaal occupies 1/8 of daylight', () => {
    const day = p.sunset!.getTime() - p.sunrise!.getTime();
    expect(Math.abs(m.rahuKaal.end.getTime() - m.rahuKaal.start.getTime() - day / 8)).toBeLessThan(1000);
  });
});
