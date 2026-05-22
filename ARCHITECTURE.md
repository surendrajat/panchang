# Panchanga — Architecture & Build Spec

> An open, accessible, long-lasting Hindu calendar app. Static PWA, all
> computation in the browser, no backend, deployable for $0 forever.

This document is the source of truth for the project. Implementation should
follow it. Where it's silent, prefer the simplest possible solution. Where it
conflicts with personal preference, change the doc first, then the code.

## 1. Goals & Non-Goals

### Goals (in priority order)

1. **Correctness** — panchanga values match drikpanchang.com within ±2 minutes
   on tithi/nakshatra/yoga end-times for any location and date in 1900–2100.
2. **Openness** — AGPL-3.0, source on GitHub, no telemetry, no analytics, no
   third-party SDKs.
3. **Accessibility** — works in any modern browser, on any device, with no
   install required. Keyboard-navigable. Screen-reader friendly. Loads on 3G.
4. **Durability** — buildable from a clean checkout 10 years from now.
   Reproducible build, pinned versions, vendored binaries.
5. **Zero ongoing cost** — static hosting, no server, no paid APIs.
6. **Offline-first** — once visited, fully functional without network.

### Non-goals (explicitly out of scope for v1)

- Horoscope / kundali / birth charts
- Dasha / antardasha / vimshottari
- Muhurta selection for events (just display rahu-kaal etc., don't pick auspicious times)
- User accounts, sync, cloud storage
- Push notifications (defer to Phase 3)
- Multi-language UI (English first; Phase 2 for Hindi/Sanskrit/regional)
- Native mobile apps (Phase 3 via Bubblewrap if warranted)
- Astrological predictions or "rashiphal"
- Monetization features

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript (strict) | Type safety for astronomical math; long-term refactorability |
| UI framework | Svelte 5 | Smallest runtime, compiler-based, stable, simple mental model |
| Build tool | Vite | De-facto standard, fast, minimal config |
| Ephemeris | `astronomy-engine` (MIT) | Sub-arcminute accuracy, MIT-licensed, pure JS, ~200KB |
| State | Svelte runes + stores | Built-in, no extra dep |
| Persistence | Dexie (IndexedDB) | Thin wrapper, future-proof, widely supported |
| Service worker | Workbox | Battle-tested, declarative caching strategies |
| Routing | `svelte-routing` or hash routing | Static-hosting-compatible |
| Date math | Native `Date` + `Temporal` polyfill if needed | Avoid moment/dayjs bloat |
| Testing | Vitest (unit) + Playwright (E2E, later) | Standard, fast |
| Hosting | Cloudflare Pages (primary) | Free, Indian edge POPs, no rate limits, simple |
| CI | GitHub Actions | Free for public repos |

**Explicitly not using:** React, Next.js, SvelteKit (SSR overkill for static),
Tailwind (CSS variables + nesting is enough), moment.js, lodash, any
"astrology API" service, Swiss Ephemeris WASM (AGPL contagion + 2MB binary
when astronomy-engine handles the same use case).

### Why astronomy-engine over Swiss Ephemeris

For panchanga calculations, the inputs are Sun and Moon ecliptic longitudes.
Drik Panchang itself runs on Swiss Ephemeris with claimed millisecond
accuracy. astronomy-engine's accuracy is ~1 arcminute for Moon and better
for Sun — translating to tithi-end-time errors of < 2 seconds. This is
indistinguishable from Swiss Ephemeris for any practical user-facing
purpose. The MIT license, ~200KB size, and zero data file dependency are
worth the theoretical accuracy trade. If a future requirement genuinely
demands Swiss Ephemeris precision (it won't), the `ephemeris.ts` interface
below is the only file that needs swapping.

## 3. Repository Layout

```
oops/calendar/
├── .github/
│   └── workflows/
│       ├── ci.yml              # lint + test on PR
│       └── deploy.yml          # publish to Cloudflare Pages on main
├── public/
│   ├── manifest.webmanifest
│   ├── icons/                  # 192, 512, maskable, monochrome
│   ├── robots.txt
│   └── _headers                # Cloudflare Pages headers
├── src/
│   ├── lib/
│   │   ├── astro/              # PURE ephemeris layer, framework-agnostic
│   │   │   ├── ephemeris.ts    # wraps astronomy-engine, exposes longitudes
│   │   │   ├── ayanamsa.ts     # Lahiri (default), KP, Raman, Yukteshwar
│   │   │   ├── sunrise.ts      # sunrise/sunset/moonrise/moonset with refraction
│   │   │   ├── julian.ts       # JD <-> civil date conversions
│   │   │   └── index.ts
│   │   ├── panchanga/          # PURE calendar logic, depends on astro/ only
│   │   │   ├── tithi.ts
│   │   │   ├── nakshatra.ts
│   │   │   ├── yoga.ts
│   │   │   ├── karana.ts
│   │   │   ├── vara.ts
│   │   │   ├── masa.ts         # month name + adhik/kshaya logic
│   │   │   ├── samvat.ts       # Vikram, Shaka, Kali year numbers
│   │   │   ├── ritu.ts         # 6 seasons
│   │   │   ├── ayana.ts        # uttarayana/dakshinayana
│   │   │   ├── muhurta.ts      # rahu-kaal, yamaganda, gulika, choghadiya
│   │   │   ├── moon-phase.ts   # illumination, age in days
│   │   │   ├── festivals/
│   │   │   │   ├── rules.ts    # rule engine
│   │   │   │   ├── pan-india.ts
│   │   │   │   └── regional.ts # Phase 2+
│   │   │   ├── types.ts
│   │   │   ├── names.ts        # constants: tithi/nakshatra/yoga/masa names
│   │   │   ├── compute.ts      # top-level computePanchanga()
│   │   │   └── index.ts
│   │   ├── location/
│   │   │   ├── geocode.ts      # local CSV of major cities, offline lookup
│   │   │   ├── geolocation.ts  # Browser Geolocation API wrapper
│   │   │   ├── timezone.ts     # IANA tz resolution from coords
│   │   │   └── cities.ts       # static city list (bundled, ~10K cities)
│   │   ├── storage/
│   │   │   ├── db.ts           # Dexie schema
│   │   │   ├── preferences.ts
│   │   │   ├── cache.ts        # memoized panchanga results
│   │   │   └── saved-locations.ts
│   │   └── format/
│   │       ├── numerals.ts     # Devanagari / Tamil / Roman numerals
│   │       └── time.ts         # 24h / 12h / vedic ghati-pala
│   ├── components/
│   │   ├── DayCard.svelte
│   │   ├── MonthGrid.svelte
│   │   ├── PanchangaTable.svelte
│   │   ├── MoonPhase.svelte    # SVG, no images
│   │   ├── LocationPicker.svelte
│   │   ├── SettingsPanel.svelte
│   │   └── FestivalList.svelte
│   ├── routes/
│   │   ├── Today.svelte
│   │   ├── Month.svelte
│   │   ├── Day.svelte          # /day/YYYY-MM-DD
│   │   ├── Festivals.svelte    # year view
│   │   ├── Settings.svelte
│   │   └── About.svelte        # methodology, credits, license
│   ├── styles/
│   │   ├── tokens.css          # CSS variables (colors, type, spacing)
│   │   ├── reset.css
│   │   └── app.css
│   ├── App.svelte
│   ├── main.ts
│   └── sw.ts                   # service worker (Workbox)
├── tests/
│   ├── unit/
│   │   ├── tithi.test.ts
│   │   ├── nakshatra.test.ts
│   │   ├── masa.test.ts        # adhik maas detection
│   │   └── sunrise.test.ts
│   ├── fixtures/
│   │   ├── drik-panchang/      # known-good values: city × date → panchanga
│   │   │   └── *.json
│   │   └── README.md           # how fixtures were captured
│   └── regression/
│       └── compare-vs-fixtures.test.ts
├── scripts/
│   ├── build-cities.ts         # generate cities.ts from raw geo data
│   └── capture-fixtures.ts     # one-time scrape helper (not committed if not needed)
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── pnpm-lock.yaml              # commit it
├── .nvmrc                      # pin Node version
├── README.md
├── ARCHITECTURE.md             # this file
├── METHODOLOGY.md              # user-facing explanation of how it's calculated
├── CONTRIBUTING.md
└── LICENSE                     # AGPL-3.0
```

## 4. Core Types

```typescript
// src/lib/panchanga/types.ts

export interface Location {
  latitude: number;       // degrees, -90 to 90
  longitude: number;      // degrees, -180 to 180
  altitude?: number;      // meters above sea level, default 0
  timezone: string;       // IANA tz, e.g. "Asia/Kolkata"
  name?: string;          // "Bengaluru, India"
}

export type AyanamsaSystem = 'lahiri' | 'raman' | 'kp' | 'yukteshwar' | 'true_chitra';
export type MonthSystem = 'amanta' | 'purnimanta';
export type Paksha = 'shukla' | 'krishna';

export interface PanchangaOptions {
  ayanamsa: AyanamsaSystem;        // default 'lahiri'
  monthSystem: MonthSystem;         // default 'amanta' for south, 'purnimanta' for north
  topocentric: boolean;             // default false (geocentric, matches drik)
  sunriseHorizon: 'standard' | 'civil'; // default 'standard' (0°50' below horizon)
}

export interface TithiInfo {
  index: number;          // 1..30; 1..15 shukla, 16..30 krishna
  number: number;         // 1..15 within paksha (e.g., Krishna Ashtami → 8)
  name: string;           // "Ashtami"
  paksha: Paksha;
  endTime: Date;          // UTC instant when this tithi ends
  fraction: number;       // 0..1 progress through tithi at sunrise
}

export interface NakshatraInfo {
  index: number;          // 1..27
  name: string;           // "Rohini"
  pada: 1 | 2 | 3 | 4;    // quarter
  endTime: Date;
  fraction: number;
}

export interface YogaInfo { index: number; name: string; endTime: Date; fraction: number; }
export interface KaranaInfo { index: number; name: string; endTime: Date; fraction: number; }

export type Vara = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

export interface MasaInfo {
  name: string;           // "Shravana"
  index: number;          // 1..12, Chaitra=1
  isAdhika: boolean;      // intercalary "Adhik Maas"
  isKshaya: boolean;      // dropped month (rare)
  system: MonthSystem;
}

export interface SamvatInfo {
  vikrama: number;        // e.g., 2082 for 2025-26
  shaka: number;          // e.g., 1947
  kali: number;           // e.g., 5126
  yearName?: string;      // 60-year Jovian cycle name, e.g., "Vishvavasu"
}

export type Ritu = 'vasanta' | 'grishma' | 'varsha' | 'sharad' | 'hemanta' | 'shishira';

export interface MoonPhaseInfo {
  illumination: number;   // 0..1
  ageInDays: number;      // 0..29.53, days since new moon
  phaseName: string;      // "Waxing Crescent" etc.
  phaseAngle: number;     // 0..360 degrees
}

export interface MuhurtaInfo {
  rahuKaal: { start: Date; end: Date };
  yamaganda: { start: Date; end: Date };
  gulika: { start: Date; end: Date };
  abhijit: { start: Date; end: Date } | null;  // null on certain days
  brahmaMuhurta: { start: Date; end: Date };
}

export interface Panchanga {
  date: Date;                       // civil date at this location (midnight local)
  location: Location;
  options: PanchangaOptions;
  sunrise: Date;
  sunset: Date;
  moonrise: Date | null;
  moonset: Date | null;
  tithi: TithiInfo;
  nakshatra: NakshatraInfo;
  yoga: YogaInfo;
  karana: KaranaInfo;
  vara: Vara;
  masa: MasaInfo;
  samvat: SamvatInfo;
  ritu: Ritu;
  ayana: 'uttarayana' | 'dakshinayana';
  paksha: Paksha;
  moonPhase: MoonPhaseInfo;
  muhurta: MuhurtaInfo;
  festivals: string[];               // festival keys observed today
}
```

## 5. Public API

The `src/lib/panchanga/index.ts` exports exactly these:

```typescript
export function computePanchanga(
  date: Date,
  location: Location,
  options?: Partial<PanchangaOptions>
): Panchanga;

export function computeMonth(
  year: number,
  month: number,                    // 1..12, Gregorian
  location: Location,
  options?: Partial<PanchangaOptions>
): Panchanga[];

export function findFestivals(
  fromDate: Date,
  toDate: Date,
  location: Location,
  options?: Partial<PanchangaOptions>
): FestivalOccurrence[];

export function findNextTithi(
  fromDate: Date,
  criteria: { tithiIndex: number; masaIndex?: number; nakshatraIndex?: number },
  location: Location,
  options?: Partial<PanchangaOptions>
): Date | null;

export const DEFAULT_OPTIONS: PanchangaOptions;
```

All compute functions are pure. No side effects. No I/O. Memoization happens
in the storage layer, not here.

## 6. Algorithms (Concrete)

### 6.1 Tithi at instant

```
sunLong  = ephemeris.eclipticLongitude(SUN, jd)   // tropical
moonLong = ephemeris.eclipticLongitude(MOON, jd)
diff = (moonLong - sunLong + 360) % 360
tithiIndex = floor(diff / 12) + 1                  // 1..30
paksha = tithiIndex <= 15 ? 'shukla' : 'krishna'
```

**Critical note:** tithi is invariant under ayanamsa because the subtraction
cancels the offset. Do NOT apply ayanamsa here. (Apply it for nakshatra, yoga,
masa, rashi — see below.)

### 6.2 Tithi end-time (bisection)

Find `t` such that `(moonLong(t) - sunLong(t)) mod 360 == tithiIndex * 12`.

```typescript
function findTithiEndTime(currentJD: number, currentTithi: number): Date {
  const targetDiff = currentTithi * 12;
  // Tithi is at most ~26 hours. Bracket the search to next 30 hours.
  let lo = currentJD;
  let hi = currentJD + 30/24;

  for (let i = 0; i < 50; i++) {  // 50 iterations = sub-second precision
    const mid = (lo + hi) / 2;
    const diff = normalizeDiff(moonLong(mid) - sunLong(mid));
    // diff wraps at 360; handle the wrap carefully near end of tithi 30
    if (diffBeforeTarget(diff, targetDiff)) lo = mid;
    else hi = mid;
  }
  return jdToDate((lo + hi) / 2);
}
```

Acceptance: end-time precision < 1 second. Compare against Drik Panchang
fixtures; tolerance ±2 minutes.

### 6.3 Nakshatra (sidereal — applies ayanamsa)

```
moonLongSidereal = (moonLong(jd) - ayanamsa(jd) + 360) % 360
nakshatraIndex = floor(moonLongSidereal / (360/27)) + 1   // 1..27
pada = floor((moonLongSidereal % (360/27)) / (360/108)) + 1  // 1..4
```

End-time: bisect on `moonLongSidereal` crossing the next 13°20′ boundary.

### 6.4 Yoga

```
sumLongSidereal = (sunLong(jd) + moonLong(jd) - 2*ayanamsa(jd)) % 360
yogaIndex = floor(sumLongSidereal / (360/27)) + 1
```

End-time: bisect on `(sun + moon - 2*ayanamsa)` crossing 13°20′ boundary.

### 6.5 Karana

```
karanaIndex = floor(diff / 6)        // 0..59 within a tithi cycle
// Fixed karanas at positions 57, 58, 59, 0 (last 4 of cycle, before Pratipada)
// Variable karanas repeat in 8-cycles between positions 1..56
```

See Wikipedia's Karana article for the exact name mapping table.

### 6.6 Vara (weekday)

Anchored to sunrise. The Hindu day runs sunrise-to-sunrise. So compute
sunrise for the *civil* date, then the vara of that day is the standard
weekday name (Sunday/Monday/...). The subtlety: if you ask "what is the
vara at 2 AM?", the answer is *yesterday's* vara, because today's sunrise
hasn't happened yet. Make this explicit in the API: `computePanchanga`
takes a civil date (not an instant) for this reason.

### 6.7 Sunrise / sunset

Use astronomy-engine's `SearchRiseSet` with `body=Sun`, observer set from
`Location`, direction=+1 for rise / -1 for set. The "standard" horizon
applies atmospheric refraction (34′) and solar semi-diameter (16′) for an
apparent horizon of 0°50′ below true horizon — this matches Drik Panchang.

Edge case: at latitudes above ~66.5°, the sun may not rise on certain
days. Return `null` and let the UI degrade gracefully (fall back to civil
twilight, or show a banner). Tithi/nakshatra etc. can still be computed at
noon UTC as a fallback anchor.

### 6.8 Moonrise / moonset

Same approach with `body=Moon`. Moon can rise and set 0, 1, or 2 times per
24-hour window. Return the rise/set events whose times fall within
sunrise(today) to sunrise(tomorrow). Either may be `null`.

### 6.9 Adhik Maas detection

This is the trickiest algorithm in the codebase. Read it carefully.

```
For lunar month M (which spans new-moon N₁ to new-moon N₂):
  s1 = solarSiderealSign(N₁)   // floor(sunLongSidereal / 30), 0..11
  s2 = solarSiderealSign(N₂)
  
  if s1 == s2:
    // Sun did not enter a new sidereal sign during this lunar month.
    // M is ADHIKA.
    name = M.regularName  // same name as the regular month it precedes
    isAdhika = true
  else if (s2 - s1 + 12) % 12 == 2:
    // Sun entered TWO sidereal signs during this lunar month.
    // M is KSHAYA — extremely rare.
    isKshaya = true
  else:
    // Normal month.
    isAdhika = false
```

Month naming rule: a lunar month is named after the solar sidereal sign the
Sun is in at the time of its **new moon** (or the sign Sun *enters* during
the month, depending on tradition — go with the standard rule used by Drik
Panchang: sign at moment of new moon → that determines next month's name).

| Sun sidereal sign at new moon | Month name |
|---|---|
| Mesha (0) | Vaishakha |
| Vrishabha (1) | Jyeshtha |
| Mithuna (2) | Ashadha |
| Karka (3) | Shravana |
| Simha (4) | Bhadrapada |
| Kanya (5) | Ashvina |
| Tula (6) | Kartika |
| Vrishchika (7) | Margashirsha |
| Dhanu (8) | Pausha |
| Makara (9) | Magha |
| Kumbha (10) | Phalguna |
| Meena (11) | Chaitra |

(I.e., the sign Sun is in at new moon names the *next* lunar month.)

### 6.10 Purnimanta conversion

Purnimanta names are computed from Amanta names by a shift:

```
if (currentPaksha == 'krishna' && monthSystem == 'purnimanta'):
  // Krishna paksha belongs to the NEXT month in Purnimanta naming
  displayMasaIndex = (amantaMasaIndex % 12) + 1
else:
  displayMasaIndex = amantaMasaIndex
```

The underlying astronomy is identical; only the display label shifts.

### 6.11 Muhurta intervals

Standard divisions of daylight (sunrise→sunset) and night (sunset→sunrise+1)
into 8 equal segments each. Rahu-kaal, Yamaganda, Gulika each occupy one
weekday-determined daytime segment. See `muhurta.ts` for the lookup table.

```
Rahu-kaal segment by weekday (1-indexed, 1 = first 1/8 of day):
  Sunday: 8, Monday: 2, Tuesday: 7, Wednesday: 5,
  Thursday: 6, Friday: 4, Saturday: 3
```

Abhijit Muhurta: 48 minutes centered on local noon (mean of sunrise and
sunset). Does not occur on Wednesdays per most traditions.

Brahma Muhurta: 96 minutes before sunrise, lasting 48 minutes.

### 6.12 Moon phase

```
phaseAngle = (moonLong - sunLong + 360) % 360
illumination = (1 - cos(phaseAngle * π/180)) / 2
ageInDays = phaseAngle / (360 / 29.5305882)  // synodic month
phaseName = nameFromAngle(phaseAngle)  // New, Waxing Crescent, First Quarter, etc.
```

## 7. Festival Rule Engine

`festivals/rules.ts` defines predicates:

```typescript
type FestivalRule = {
  key: string;                    // "diwali", "rama_navami"
  displayName: string;
  matches: (p: Panchanga) => boolean;
  // Some festivals span days or have tiebreaker logic
  observance?: 'sunrise_tithi' | 'sunset_tithi' | 'midnight_tithi';
};

const RAMA_NAVAMI: FestivalRule = {
  key: 'rama_navami',
  displayName: 'Rama Navami',
  matches: (p) =>
    p.tithi.number === 9 &&
    p.tithi.paksha === 'shukla' &&
    p.masa.name === 'Chaitra' &&
    !p.masa.isAdhika,
};
```

**MVP festival list** (Phase 1, ~30 entries — pan-India only):

Makara Sankranti, Maha Shivaratri, Holi (Holika Dahan + Dhuleti), Ugadi /
Gudi Padwa, Rama Navami, Hanuman Jayanti, Akshaya Tritiya, Buddha Purnima,
Guru Purnima, Nag Panchami, Raksha Bandhan, Krishna Janmashtami, Ganesh
Chaturthi, Onam (Thiruvonam), Navaratri start, Vijayadashami (Dussehra),
Karva Chauth, Dhanteras, Naraka Chaturdashi, Diwali (Lakshmi Puja), Govardhan
Puja, Bhai Dooj, Tulsi Vivaha, Kartik Purnima, Vaikuntha Ekadashi,
Pongal/Lohri, Vasant Panchami, Mahashivaratri, Hanuman Jayanti.

**Recurring observances** (every month): Ekadashi ×2, Pradosh ×2, Sankashti
Chaturthi, Sankranti, Amavasya, Purnima, Shivaratri.

Note: Janmashtami, Diwali, and a few others have complex tiebreakers (which
day if tithi spans 2 sunrises) and Smarta/Vaishnava splits. Document the
choice in METHODOLOGY.md; implement the most common rule first.

## 8. UI / Routing

Five routes, hash-based (for static hosting compatibility):

| Route | Purpose |
|---|---|
| `/` | Today's panchanga, full detail |
| `/month/:yyyy-mm` | Monthly grid view |
| `/day/:yyyy-mm-dd` | Single day full detail |
| `/festivals/:yyyy` | Year's festival list with countdowns |
| `/settings` | Location, ayanamsa, month system, theme |
| `/about` | Methodology, credits, source link, license |

### Today view layout

- Big tithi name + paksha + masa
- Moon phase SVG with illumination %
- Sunrise / sunset / moonrise / moonset times
- Panchanga table: tithi/nakshatra/yoga/karana with end times
- Today's vara, ritu, ayana, samvat (compact line)
- Muhurta block: rahu-kaal, yamaganda, gulika, abhijit, brahma muhurta
- Festival(s) today (if any)
- Quick links: yesterday / tomorrow

### Month view layout

- 7-column grid (Sun–Sat or Mon–Sun based on preference)
- Each cell shows: Gregorian date (top), tithi name (small), festival dot
- Color/icon for Purnima, Amavasya, Ekadashi
- Click → day detail

### Design tokens (CSS variables)

Pick a palette inspired by traditional Indian almanac printing: warm
off-white background, deep red (#8b1818) for headers, indigo (#1a237e) for
secondary, charcoal text. Avoid orange/saffron — too politically loaded.

Typography: a serif for tithi/nakshatra names (Inter Tight is fine, or
Lora), system font stack for UI chrome. Devanagari/regional script support
via Noto Sans Devanagari / Noto Sans Tamil etc. loaded conditionally.

Dark mode mandatory. Respect `prefers-color-scheme`.

## 9. Persistence (Dexie)

```typescript
// src/lib/storage/db.ts
import Dexie, { Table } from 'dexie';

interface Preferences {
  id: 'singleton';
  location: Location;
  ayanamsa: AyanamsaSystem;
  monthSystem: MonthSystem;
  topocentric: boolean;
  theme: 'auto' | 'light' | 'dark';
  weekStart: 'sunday' | 'monday';
  numerals: 'roman' | 'devanagari';
  language: 'en';                    // for future use
}

interface SavedLocation {
  id?: number;
  name: string;
  latitude: number;
  longitude: number;
  altitude: number;
  timezone: string;
  isDefault: boolean;
}

interface CachedPanchanga {
  cacheKey: string;                  // hash of date+location+options
  data: Panchanga;                   // serialized
  createdAt: Date;
}

export class PanchangaDB extends Dexie {
  preferences!: Table<Preferences, 'singleton'>;
  savedLocations!: Table<SavedLocation, number>;
  cachedPanchangas!: Table<CachedPanchanga, string>;

  constructor() {
    super('panchanga-db');
    this.version(1).stores({
      preferences: 'id',
      savedLocations: '++id, name, isDefault',
      cachedPanchangas: 'cacheKey, createdAt',
    });
  }
}
```

Cache eviction: LRU, max 1000 entries, also auto-evict entries older than 30
days. Cache invalidation: clear all on app version change.

## 10. PWA / Service Worker

`manifest.webmanifest`:

```json
{
  "name": "Panchanga",
  "short_name": "Panchanga",
  "description": "Open Hindu calendar with tithi, nakshatra, festivals",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#fdf6e3",
  "theme_color": "#8b1818",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Service worker (Workbox):

- Precache app shell (HTML, JS, CSS, fonts, manifest)
- Runtime cache for static assets (cache-first, 1-year max age)
- No runtime fetches to compute panchanga (it's all client-side)
- Skip waiting on update, show in-app "new version available" banner

## 11. Build & Deploy

### Vite config essentials

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
      manifest: { /* from manifest.webmanifest */ },
    }),
  ],
  build: {
    target: 'es2020',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          ephemeris: ['astronomy-engine'],
        },
      },
    },
  },
});
```

### Cloudflare Pages

- Repository connected to Pages project
- Build command: `pnpm install && pnpm build`
- Output directory: `dist`
- Node version: pinned via `.nvmrc`
- Custom domain optional
- `_headers` file: long cache for hashed assets, no-cache for `index.html`

### CI

```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
```

Deploy is handled by Cloudflare Pages automatically on main branch push.

## 12. Testing Strategy

### Unit tests
Every function in `lib/panchanga/` and `lib/astro/` has a unit test. Aim for
>90% coverage on these modules. UI code coverage is optional.

### Fixture-based regression
The single most important test suite. Build `tests/fixtures/drik-panchang/`
by:

1. Selecting 5 reference locations: Varanasi, Bengaluru, Mumbai, London,
   New York (covers India + diaspora + tz variety).
2. For each location, capture 1 day per week for a full year (~52 days × 5
   locations = 260 fixtures). Manually transcribe from drikpanchang.com or
   automate carefully with respect for their site.
3. Store each as JSON with all panchanga fields and end-times.
4. Regression test: `computePanchanga()` matches fixture within tolerance.
   - Tithi/nakshatra/yoga/karana end times: ±2 minutes
   - Sunrise/sunset: ±30 seconds
   - Names and indices: exact match
   - Festival dates: exact match

This is the contract. If a refactor breaks any fixture, the refactor is
wrong.

### Manual smoke tests
Each release, manually verify:

- Today view loads correctly in Bengaluru, Delhi, San Francisco
- Month view renders for current month + same month in 2050 + 1950
- Adhik Maas detection: known cases (Jyeshtha 2026, Shravana 2023)
- iOS Safari renders correctly (manifest, fonts, layout)
- Offline mode: airplane mode after first load, navigate through views

## 13. Phases / Roadmap

### Phase 1 — MVP (target: 6 weeks of evening work)
- Tech stack scaffolded, CI green
- `lib/astro` + `lib/panchanga` complete with unit tests
- Today view, Month view, Day view, Settings, About
- Lahiri ayanamsa only
- Amanta + Purnimanta selectable
- English only
- ~30 pan-India festivals
- Offline-first PWA
- Deployed to Cloudflare Pages, public URL
- METHODOLOGY.md published

### Phase 2 — Polish & expand
- Devanagari/Tamil/Telugu/Kannada UI translations
- Additional ayanamsa systems
- Regional festival packs (selectable)
- Festival year view with countdowns
- Saved locations
- Vedic clock display (ghati/pala)
- Better moon phase visualization
- A11y audit pass

### Phase 3 — Distribution & notifications
- Bubblewrap → Google Play Store listing (one-time $25)
- Optional: Web Push for daily panchanga summary at user-chosen time
  (requires a tiny Cloudflare Worker, still free tier)
- Optional: in-app event reminders (local notifications only, no server)
- iOS App Store *not* pursued unless traction warrants $99/year

### Phase 4 — Stretch (only if interest sustains)
- Kundali / birth chart (large scope; consider as separate app)
- Vimshottari dasha
- Muhurta finder for events
- Anniversary tithi lookup ("what tithi was my mom's birthday?")

## 14. Open Decisions

These are deliberately left open for implementation-time discussion:

1. **Which Smarta vs Vaishnava rule** for Janmashtami and Ekadashi? Default
   Smarta unless settings override. C: Smarta
2. **Which set of festival exceptions** to implement for Diwali (when
   Amavasya spans two evenings)? Document choice in METHODOLOGY.md.
3. **Cities database source**: GeoNames (CC-BY) cities500.txt seems best;
   filter to ~10K most populous to keep bundle small. C: cities500.txt
4. **Whether to bundle Noto fonts** (heavy, ~500KB each) or lazy-load by
   selected language. C: lazy-load by language
5. **Whether to include hijri/jewish/etc. dates** in passing on the day
   view — interesting cross-cultural feature, defer to Phase 2. C: No

## 15. Style & Conventions

- TypeScript: strict mode, no `any` except at FFI boundaries with explicit comment
- File naming: kebab-case for files, PascalCase for Svelte components, camelCase for functions
- Each `lib/panchanga/*.ts` exports one main function + types; no default exports
- No console.log in committed code (lint rule)
- All times in storage are UTC `Date` objects; display layer converts to local
- All longitudes in code are degrees, never radians; convert at the astronomy boundary
- Document every magic constant with the source (Surya Siddhanta verse, drik formula, etc.)

## 16. References

- `webresh/drik-panchanga` (Python, AGPL) — algorithmic reference implementation
- `fusionstrings/panchangam` (Rust → WASM, AGPL) — modern production reference
- `ishubhamx/Hindu-Panchangam` (TypeScript, MIT) — direct TS analog, uses astronomy-engine
- Dershowitz & Reingold, *Calendrical Calculations* (4th ed.) — chapter on Hindu calendars
- Karthik Raman, "Drik Panchanga" methodology notes
- Wikipedia: Tithi, Nakshatra, Yoga, Karana, Panchanga, Ayanamsa, Adhik Maas
- Astronomy-Engine documentation: https://github.com/cosinekitty/astronomy

## 17. License

AGPL-3.0. All contributions inherit. `LICENSE` file at repo root.

## 18. Sustainability / Bus Factor Notes

Single maintainer mode is the realistic case. To keep this alive long-term:

- [skip] Pin every dependency version. Use `pnpm` with `--frozen-lockfile` in CI.
- [skip] Vendor `astronomy-engine` source into a `vendor/` folder; don't rely on
  npm being available in 10 years.
- [skip] Capture build artifacts as GitHub Releases for each tagged version, so
  even if the toolchain breaks, users can download a working build.
- Document the local dev setup such that a new contributor can be
  productive in < 30 minutes.
- Avoid trendy tech for trendy tech's sake. Boring stack is the whole point.
- Write good tests. Tests are the spec when the maintainer's memory fades.