// The sun's sign-transition fields (solar.signAtDayStart/End) drive sankranti
// detection and the masa/ayana logic, yet weren't asserted directly. Check two
// ingresses by their well-known dates — Makara (mid-Jan, sign 8→9) and Mesha
// (mid-Apr, sign 11→0, which exercises the 0°/360° seam).
import { describe, it, expect } from 'vitest';
import { computePanchanga } from '$lib/panchanga';
import { DELHI } from '../helpers';

function transitionsIn(year: number, month0: number, fromDay: number, toDay: number) {
  const hits: { day: number; from: number; to: number }[] = [];
  for (let d = fromDay; d <= toDay; d++) {
    const p = computePanchanga(new Date(Date.UTC(year, month0, d, 6, 0, 0)), DELHI);
    if (p.solar.signAtDayStart !== p.solar.signAtDayEnd) {
      hits.push({ day: d, from: p.solar.signAtDayStart, to: p.solar.signAtDayEnd });
    }
  }
  return hits;
}

describe('solar sign-transition (sankranti) detection', () => {
  it('detects Makara Sankranti (Dhanu 8 → Makara 9) in mid-January', () => {
    const hits = transitionsIn(2026, 0, 10, 17);
    expect(hits).toHaveLength(1);
    expect(hits[0].from).toBe(8);
    expect(hits[0].to).toBe(9);
  });

  it('detects Mesha Sankranti (Meena 11 → Mesha 0) across the 0° seam in mid-April', () => {
    const hits = transitionsIn(2026, 3, 10, 17);
    expect(hits).toHaveLength(1);
    expect(hits[0].from).toBe(11);
    expect(hits[0].to).toBe(0);
  });
});
