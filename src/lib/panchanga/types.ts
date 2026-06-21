// Core panchanga types. Re-exported from $lib/panchanga/index.ts.
// All times in storage are UTC Date objects; display layer converts to local.

export interface Location {
  latitude: number; // degrees, -90 to 90
  longitude: number; // degrees, -180 to 180
  altitude?: number; // meters above sea level, default 0
  timezone: string; // IANA tz, e.g. "Asia/Kolkata"
  name?: string; // "Bengaluru, India"
}

export type AyanamsaSystem = 'lahiri' | 'raman' | 'kp' | 'yukteshwar' | 'true_chitra';
export type MonthSystem = 'amanta' | 'purnimanta';
export type Paksha = 'shukla' | 'krishna';

export interface PanchangaOptions {
  ayanamsa: AyanamsaSystem; // default 'lahiri'
  monthSystem: MonthSystem; // engine default 'amanta' (app default is purnimanta)
}

export interface TithiInfo {
  index: number; // 1..30; 1..15 shukla, 16..30 krishna
  number: number; // 1..15 within paksha
  name: string; // "Ashtami"
  paksha: Paksha;
  endTime: Date; // UTC instant when this tithi ends
  fraction: number; // 0..1 progress through tithi at the anchor instant
}

export interface NakshatraInfo {
  index: number; // 1..27
  name: string; // "Rohini"
  pada: 1 | 2 | 3 | 4; // quarter
  endTime: Date;
  fraction: number;
}

export interface YogaInfo {
  index: number; // 1..27
  name: string;
  endTime: Date;
  fraction: number;
}

export interface KaranaInfo {
  index: number; // 1..11 (the 11 named karanas)
  positionInCycle: number; // 0..59
  name: string;
  endTime: Date;
  fraction: number;
}

export type Vara =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday';

export interface MasaInfo {
  name: string; // "Shravana"
  index: number; // 1..12, Chaitra=1 — display index in the selected system
  amantaName: string; // canonical Amanta name; system-invariant. Use in festival rules.
  amantaIndex: number; // canonical Amanta index 1..12
  isAdhika: boolean; // intercalary "Adhik Maas"
  isKshaya: boolean; // dropped month (rare)
  system: MonthSystem;
}

export interface SamvatInfo {
  vikrama: number;
  shaka: number;
  kali: number;
  yearName?: string; // 60-year Jovian cycle name, e.g., "Vishvavasu"
}

export type Ritu = 'vasanta' | 'grishma' | 'varsha' | 'sharad' | 'hemanta' | 'shishira';

// Sun's sidereal sign at the panchanga anchor plus its sign at the
// civil-day boundaries (so festival rules can detect a sankranti =
// sign-transition without re-running the ephemeris).
//
// Convention: a sign-transition that happens between `signAtDayStart`
// and `signAtDayEnd` falls on this civil day — i.e., the sankranti is
// observed on the day during which the Sun enters the new sign.
export interface SolarContext {
  sign: number; // 0..11 at the anchor, Mesha = 0
  signAtDayStart: number; // sign at civil midnight (start of this date)
  signAtDayEnd: number; // sign at civil midnight of the next day
}

export interface MoonPhaseInfo {
  illumination: number; // 0..1
  ageInDays: number; // 0..29.53, days since new moon
  phaseName: string; // "Waxing Crescent" etc.
  phaseAngle: number; // 0..360 degrees
}

export interface MuhurtaInterval {
  start: Date;
  end: Date;
}

export interface MuhurtaInfo {
  // Inauspicious (1/8 of daylight each).
  rahuKaal: MuhurtaInterval;
  yamaganda: MuhurtaInterval;
  gulika: MuhurtaInterval;
  // Auspicious / observance windows.
  abhijit: MuhurtaInterval | null; // null on Wednesdays per Smarta tradition
  brahmaMuhurta: MuhurtaInterval; // 96–48 min before sunrise
  pratahSandhya: MuhurtaInterval; // last 48 min before sunrise
  vijayaMuhurta: MuhurtaInterval; // 11th of 15 daylight muhurtas
  godhuli: MuhurtaInterval; // 24 min around sunset
  sayahnaSandhya: MuhurtaInterval; // 48 min after sunset
  nishitaKaal: MuhurtaInterval; // 8th of 15 night muhurtas (midnight period)
}

export interface Panchanga {
  date: Date; // civil date at this location (midnight local in UTC)
  location: Location;
  options: PanchangaOptions;
  sunrise: Date | null;
  sunset: Date | null;
  moonrise: Date | null;
  moonset: Date | null;
  tithi: TithiInfo;
  nakshatra: NakshatraInfo;
  yoga: YogaInfo;
  karana: KaranaInfo; // karana active at sunrise (backward-compat)
  karanas: KaranaInfo[]; // all karanas active during this panchanga day (2-3)
  vara: Vara;
  masa: MasaInfo;
  samvat: SamvatInfo;
  ritu: Ritu;
  ayana: 'uttarayana' | 'dakshinayana';
  paksha: Paksha;
  moonPhase: MoonPhaseInfo;
  muhurta: MuhurtaInfo;
  solar: SolarContext; // sun's sidereal sign today + yesterday
  festivals: string[]; // festival keys observed today
}

export interface FestivalOccurrence {
  date: Date; // civil date (midnight in location tz) on which the festival is observed
  key: string;
  displayName: string;
}

export const DEFAULT_OPTIONS: PanchangaOptions = {
  ayanamsa: 'lahiri',
  // The ENGINE default is amanta (the pan-Indian/southern lunar-month
  // convention). The APP product default is purnimanta (DEFAULT_PREFERENCES,
  // North-Indian) and the UI always passes it explicitly — so these two
  // defaults differ intentionally; they are not meant to be kept in sync.
  monthSystem: 'amanta',
};
