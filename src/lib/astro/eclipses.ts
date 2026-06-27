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
  GeoVector,
  Body,
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

/** All eclipses (solar + lunar) whose peak falls in [from, to). */
export function eclipsesBetween(from: Date, to: Date): EclipseEvent[] {
  const toMs = to.getTime();
  const out: EclipseEvent[] = [];
  for (
    let lun = SearchLunarEclipse(from);
    lun.peak.date.getTime() < toMs;
    lun = NextLunarEclipse(lun.peak)
  ) {
    out.push({
      type: 'lunar',
      kind: lun.kind,
      peak: lun.peak.date,
      obscuration: lun.obscuration,
      node: nodeAtPeak(lun.peak.date),
    });
  }
  for (
    let sol = SearchGlobalSolarEclipse(from);
    sol.peak.date.getTime() < toMs;
    sol = NextGlobalSolarEclipse(sol.peak)
  ) {
    out.push({
      type: 'solar',
      kind: sol.kind,
      peak: sol.peak.date,
      obscuration: sol.obscuration ?? null,
      node: nodeAtPeak(sol.peak.date),
    });
  }
  return out.sort((a, b) => a.peak.getTime() - b.peak.getTime());
}

// ── disk geometry: what the eclipse actually looks like ──────────────────────────
const AU_KM = 1.495978707e8;
const SUN_RADIUS_KM = 695700;
const MOON_RADIUS_KM = 1737.4;
const EARTH_RADIUS_KM = 6378.14;
const REL_SPEED = 0.51 / 60; // °/min — Moon relative to the Sun / Earth's shadow
const toDeg = (rad: number) => (rad * 180) / Math.PI;

export interface EclipseGeometry {
  type: EclipseType;
  kind: EclipseKind;
  obscuration: number; // fraction of the covered disc hidden at peak (0..1)
  // apparent angular radii, degrees
  sunR: number;
  moonR: number;
  umbraR: number; // lunar: Earth's umbra at the Moon's distance
  penumbraR: number; // lunar: penumbra
  minSepDeg: number; // centre-to-centre separation at peak (chord's closest approach)
  windowMin: number; // ± minutes to scrub for the whole event
}

// Overlap area of two circles, radii R and r, centres `d` apart.
function lensArea(R: number, r: number, d: number): number {
  if (d >= R + r) return 0;
  if (d <= Math.abs(R - r)) return Math.PI * Math.min(R, r) ** 2;
  const clamp = (x: number) => Math.max(-1, Math.min(1, x));
  const a = R * R * Math.acos(clamp((d * d + R * R - r * r) / (2 * d * R)));
  const b = r * r * Math.acos(clamp((d * d + r * r - R * R) / (2 * d * r)));
  const c = 0.5 * Math.sqrt(Math.max(0, (-d + R + r) * (d + R - r) * (d - R + r) * (d + R + r)));
  return a + b - c;
}

// Centre separation at which a disc of radius `cR` hides a fraction `obsc` of a
// disc of radius `vR`. Coverage falls monotonically with separation → bisection.
function sepForCoverage(cR: number, vR: number, obsc: number): number {
  const area = Math.PI * vR * vR;
  if (obsc >= lensArea(cR, vR, 0) / area) return 0; // can't hide more → concentric
  let lo = 0;
  let hi = cR + vR;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (lensArea(cR, vR, mid) / area > obsc) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Apparent-disk geometry for an eclipse, from the real distances at its peak. */
export function eclipseGeometry(e: EclipseEvent): EclipseGeometry {
  const t = e.peak;
  const moonDistKm = EclipticGeoMoon(t).dist * AU_KM;
  const sv = GeoVector(Body.Sun, t, false);
  const sunDistKm = Math.hypot(sv.x, sv.y, sv.z) * AU_KM;

  const moonR = toDeg(Math.asin(MOON_RADIUS_KM / moonDistKm));
  const sunR = toDeg(Math.asin(SUN_RADIUS_KM / sunDistKm));
  // shadow cones at the Moon's distance (Meeus): π_moon + π_sun ∓ s_sun, ×1.02 for air
  const piMoon = toDeg(Math.asin(EARTH_RADIUS_KM / moonDistKm));
  const piSun = toDeg(Math.asin(EARTH_RADIUS_KM / sunDistKm));
  const umbraR = 1.02 * (piMoon + piSun - sunR);
  const penumbraR = 1.02 * (piMoon + piSun + sunR);

  const obsc = e.obscuration ?? 0;
  let minSepDeg: number;
  let windowMin: number;
  if (e.type === 'solar') {
    minSepDeg = sepForCoverage(moonR, sunR, obsc);
    windowMin = (sunR + moonR) / REL_SPEED;
  } else if (e.kind === EclipseKind.Penumbral) {
    minSepDeg = umbraR + moonR + 0.3 * (penumbraR - umbraR); // grazes the penumbra only
    windowMin = (penumbraR + moonR) / REL_SPEED;
  } else {
    minSepDeg = sepForCoverage(umbraR, moonR, obsc);
    windowMin = (penumbraR + moonR) / REL_SPEED;
  }
  return {
    type: e.type,
    kind: e.kind,
    obscuration: obsc,
    sunR,
    moonR,
    umbraR,
    penumbraR,
    minSepDeg,
    windowMin,
  };
}

/** Centre-to-centre separation `tauMin` minutes from peak, in degrees. */
export function eclipseSeparationDeg(g: EclipseGeometry, tauMin: number): number {
  return Math.hypot(REL_SPEED * tauMin, g.minSepDeg);
}

/** Fraction of the obscured disc (Sun, or Moon for lunar) hidden at `tauMin`. */
export function eclipseCoverageAt(g: EclipseGeometry, tauMin: number): number {
  const sep = eclipseSeparationDeg(g, tauMin);
  if (g.type === 'solar') return lensArea(g.moonR, g.sunR, sep) / (Math.PI * g.sunR ** 2);
  return lensArea(g.umbraR, g.moonR, sep) / (Math.PI * g.moonR ** 2);
}
