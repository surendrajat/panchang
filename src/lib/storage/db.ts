// IndexedDB schema via Dexie.
//
// Three tables:
//   - preferences (singleton row, the user's settings)
//   - savedLocations (list of bookmarked cities)
//   - cachedPanchangas (memoized compute results, LRU)

import Dexie, { type Table } from 'dexie';
import type { AyanamsaSystem, Location, MonthSystem, Panchanga } from '$lib/panchanga';

export interface Preferences {
  id: 'singleton';
  location: Location | null;
  ayanamsa: AyanamsaSystem;
  monthSystem: MonthSystem;
  topocentric: boolean;
  theme: 'auto' | 'light' | 'dark';
  weekStart: 'sunday' | 'monday';
  numerals: 'latin' | 'devanagari';
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

export class PanchangaDB extends Dexie {
  preferences!: Table<Preferences, 'singleton'>;
  savedLocations!: Table<SavedLocation, number>;
  cachedPanchangas!: Table<CachedPanchangaRow, string>;

  constructor() {
    super('panchanga-db');
    this.version(1).stores({
      preferences: 'id',
      savedLocations: '++id, name, isDefault',
      cachedPanchangas: 'cacheKey, createdAt',
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
  topocentric: false,
  theme: 'auto',
  // Sunday-first matches the canonical Vedic week — Ravi/Sunday is
  // the first vara. Users can flip to Monday-first via Settings.
  weekStart: 'sunday',
  numerals: 'latin',
  language: 'en',
};
