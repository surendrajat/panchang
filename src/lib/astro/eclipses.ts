// Eclipse search — a thin, typed wrapper over astronomy-engine's eclipse finders,
// plus the Hindu-astronomy hook: every eclipse happens at a lunar node, which is
// Rāhu (the ascending node) or Ketu (the descending node). That's not folklore
// bolted on — it's the geometry. An eclipse can only occur when a new/full Moon
// lands on the ecliptic, i.e. exactly at a node; the rest of the month the Moon
// passes above or below the Sun/shadow because its orbit is tilted ~5°.
import {
  SearchLunarEclipse,
  NextLunarEclipse,
  SearchGlobalSolarEclipse,
  NextGlobalSolarEclipse,
  EclipticGeoMoon,
  EclipseKind,
} from 'astronomy-engine';

export { EclipseKind };
export type EclipseType = 'solar' | 'lunar';

export interface EclipseEvent {
  type: EclipseType;
  kind: EclipseKind; // 'penumbral' | 'partial' | 'annular' | 'total'
  peak: Date; // UTC instant of greatest eclipse
  /** Fraction of the disc obscured at peak (0..1); null when not provided. */
  obscuration: number | null;
  /** The node the Moon occupies — ascending = Rāhu, descending = Ketu. */
  node: 'rahu' | 'ketu';
}

// The Moon's ecliptic latitude is ~0 at an eclipse (it sits on the ecliptic, at a
// node). Whether it's rising or falling through the plane names the node: rising
// (south → north) is the ascending node = Rāhu; falling is descending = Ketu.
function nodeAtPeak(peak: Date): 'rahu' | 'ketu' {
  const h = 3_600_000; // ±1 hour finite difference
  const before = EclipticGeoMoon(new Date(peak.getTime() - h)).lat;
  const after = EclipticGeoMoon(new Date(peak.getTime() + h)).lat;
  return after > before ? 'rahu' : 'ketu';
}

/** The next `count` eclipses (solar + lunar, interleaved) at/after `from`. */
export function upcomingEclipses(from: Date, count: number): EclipseEvent[] {
  const events: EclipseEvent[] = [];
  let lunar = SearchLunarEclipse(from);
  let solar = SearchGlobalSolarEclipse(from);
  // Collect `count` of each type, then merge by date and trim — so a near-term
  // eclipse of one type is never missed while we walk forward in the other.
  for (let i = 0; i < count; i++) {
    events.push({
      type: 'lunar',
      kind: lunar.kind,
      peak: lunar.peak.date,
      obscuration: lunar.obscuration,
      node: nodeAtPeak(lunar.peak.date),
    });
    events.push({
      type: 'solar',
      kind: solar.kind,
      peak: solar.peak.date,
      obscuration: solar.obscuration ?? null,
      node: nodeAtPeak(solar.peak.date),
    });
    lunar = NextLunarEclipse(lunar.peak);
    solar = NextGlobalSolarEclipse(solar.peak);
  }
  return events.sort((a, b) => a.peak.getTime() - b.peak.getTime()).slice(0, count);
}
