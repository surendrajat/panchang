// IndexedDB schema via Dexie.
//
// Tables:
//   - preferences (singleton row, the user's settings)
//   - savedLocations (bookmarked cities)
//   - cachedPanchangas / cachedFestivals (best-effort memoized compute results;
//     read/written by the Today/Day/Month/Festivals routes — see cache.ts)
//   - birthProfiles (saved births for the kundli / matching features)

import Dexie, { type Table } from 'dexie';
import type {
  AyanamsaSystem,
  Location,
  MonthSystem,
  Panchanga,
  FestivalOccurrence,
} from '$lib/panchanga';

export interface Preferences {
  id: 'singleton';
  location: Location | null;
  ayanamsa: AyanamsaSystem;
  monthSystem: MonthSystem;
  // Lunar-node convention for kundli Rahu/Ketu: 'mean' or 'true'.
  nodeType: 'mean' | 'true';
  topocentric: boolean;
  theme: 'auto' | 'light' | 'dark';
  weekStart: 'sunday' | 'monday';
  numerals: 'latin' | 'devanagari';
  // Clock format for every time-of-day display, app-wide.
  timeFormat: '12h' | '24h';
  language: 'en' | 'hi';
}

export interface SavedLocation {
  id?: number;
  name: string;
  latitude: number;
  longitude: number;
  altitude: number;
  timezone: string;
  isDefault: boolean;
}

export interface CachedPanchangaRow {
  cacheKey: string;
  // Panchanga objects contain Dates; Dexie + structured clone handle them fine.
  data: Panchanga;
  createdAt: Date;
}

export interface CachedFestivalsRow {
  cacheKey: string;
  data: FestivalOccurrence[];
  createdAt: Date;
}

// A saved birth record for the kundli / matching features. `timeKnown`
// false means the lagna and houses are omitted (rashis + dasha still hold).
export interface BirthProfile {
  id?: number;
  name: string;
  date: string; // YYYY-MM-DD (civil, at birth place)
  time: string; // HH:MM (24h, local at birth place)
  timeKnown: boolean;
  location: Location;
  createdAt: Date;
}

export class PanchangaDB extends Dexie {
  preferences!: Table<Preferences, 'singleton'>;
  savedLocations!: Table<SavedLocation, number>;
  cachedPanchangas!: Table<CachedPanchangaRow, string>;
  cachedFestivals!: Table<CachedFestivalsRow, string>;
  birthProfiles!: Table<BirthProfile, number>;

  constructor() {
    super('panchanga-db');
    this.version(1).stores({
      preferences: 'id',
      savedLocations: '++id, name, isDefault',
      cachedPanchangas: 'cacheKey, createdAt',
    });
    this.version(2).stores({
      cachedFestivals: 'cacheKey, createdAt',
    });
    // v3: saved birth records for kundli + matching (additive).
    this.version(3).stores({
      birthProfiles: '++id, name, createdAt',
    });
  }
}

let _db: PanchangaDB | null = null;
export function db(): PanchangaDB {
  if (!_db) _db = new PanchangaDB();
  return _db;
}

export const DEFAULT_PREFERENCES: Preferences = {
  id: 'singleton',
  location: null,
  ayanamsa: 'lahiri',
  // Purnimanta default — matches the North-Indian convention used in
  // most published Hindi/Sanskrit panchangas (and Drik Panchang's
  // default for non-southern locations).
  monthSystem: 'purnimanta',
  nodeType: 'mean',
  topocentric: false,
  theme: 'auto',
  // Sunday-first matches the canonical Vedic week — Ravi/Sunday is
  // the first vara. Users can flip to Monday-first via Settings.
  weekStart: 'sunday',
  numerals: 'latin',
  timeFormat: '24h',
  language: 'en',
};
