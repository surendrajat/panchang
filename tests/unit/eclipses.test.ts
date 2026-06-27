import { describe, it, expect } from 'vitest';
import { upcomingEclipses } from '$lib/astro/eclipses';

const ymd = (d: Date) => d.toISOString().slice(0, 10);

describe('upcomingEclipses', () => {
  const e = upcomingEclipses(new Date('2026-01-01T00:00:00Z'), 4);

  it('finds the 2026 eclipse sequence (vs published astronomical records)', () => {
    expect(e.map((x) => `${ymd(x.peak)} ${x.type} ${x.kind}`)).toEqual([
      '2026-02-17 solar annular',
      '2026-03-03 lunar total',
      '2026-08-12 solar total', // the well-known total solar eclipse over Spain/Iceland
      '2026-08-28 lunar partial',
    ]);
  });

  it('every eclipse sits at a node, and a season pairs opposite nodes (Rāhu/Ketu)', () => {
    for (const x of e) expect(['rahu', 'ketu']).toContain(x.node);
    // a new-moon (solar) eclipse and the full-moon (lunar) eclipse ~2 weeks later
    // are one eclipse season — the Moon is at opposite nodes for the two.
    expect(e[0].node).not.toBe(e[1].node); // Feb solar vs Mar lunar
    expect(e[2].node).not.toBe(e[3].node); // Aug solar vs Aug lunar
  });

  it('returns events in chronological order', () => {
    for (let i = 1; i < e.length; i++)
      expect(e[i].peak.getTime()).toBeGreaterThan(e[i - 1].peak.getTime());
  });
});
