// Jyotish (kundli) core types. All longitudes are sidereal ecliptic
// degrees [0, 360); all instants are UTC Date objects. Pure data — the
// engine functions in this folder take an instant + Location + options
// and return these shapes with no I/O.

import type { AyanamsaSystem, Location } from '$lib/panchanga/types';

// The nine grahas of classical Jyotish. Order is the canonical
// "vara/graha" order (Sun … Saturn) followed by the two lunar nodes.
export type GrahaKey =
  | 'sun'
  | 'moon'
  | 'mars'
  | 'mercury'
  | 'jupiter'
  | 'venus'
  | 'saturn'
  | 'rahu'
  | 'ketu';

export const GRAHA_ORDER: readonly GrahaKey[] = [
  'sun',
  'moon',
  'mars',
  'mercury',
  'jupiter',
  'venus',
  'saturn',
  'rahu',
  'ketu',
];

export interface GrahaPosition {
  key: GrahaKey;
  longitude: number; // sidereal ecliptic longitude [0, 360)
  rashi: number; // 0..11 (Mesha = 0)
  degInRashi: number; // 0..30, degrees into the sign
  nakshatra: number; // 1..27
  pada: 1 | 2 | 3 | 4;
  retrograde: boolean; // vakri; nodes are retrograde by convention
  house: number | null; // 1..12 bhava (whole-sign); null when lagna unknown
}

export interface Lagna {
  longitude: number; // sidereal ecliptic longitude of the ascendant
  rashi: number; // 0..11
  degInRashi: number; // 0..30
}

export type NodeType = 'mean' | 'true';

export interface BirthChartOptions {
  ayanamsa: AyanamsaSystem; // default 'lahiri'
  nodeType: NodeType; // default 'true' (see DEFAULT_CHART_OPTIONS)
}

export const DEFAULT_CHART_OPTIONS: BirthChartOptions = {
  ayanamsa: 'lahiri',
  // True node — matches Drik / modern Vedic software (see DEFAULT_PREFERENCES).
  nodeType: 'true',
};

export interface BirthChart {
  instant: Date; // birth instant in UTC
  location: Location;
  options: BirthChartOptions;
  // Lagna requires a known birth time. When the time is unknown the
  // caller passes timeKnown=false and lagna/houses are null, but graha
  // rashis and the Moon-based dasha are still valid.
  lagna: Lagna | null;
  grahas: GrahaPosition[];
  moonNakshatra: { index: number; pada: 1 | 2 | 3 | 4 };
  moonRashi: number; // 0..11 — the janma rashi
}

export interface DashaPeriod {
  lord: GrahaKey;
  start: Date;
  end: Date;
  years: number; // span of this period in (Vimshottari) years
  antardashas?: DashaPeriod[]; // sub-periods, when expanded
}
