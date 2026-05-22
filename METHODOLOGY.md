# Methodology

This document describes how Panchanga computes each value it displays.
It's the user-facing companion to `ARCHITECTURE.md`. If you want to
verify a number against another source (or argue with a result), this
is the page to read.

## Sources

- **Ephemeris**: [astronomy-engine](https://github.com/cosinekitty/astronomy) (MIT).
  Sub-arcminute accuracy for Sun and Moon; the apparent ecliptic-of-date
  longitudes match Drik Panchang's Swiss-Ephemeris-derived values to
  within a few arcseconds across 1900–2100.
- **Ayanamsa**: Lahiri by default (the convention of the Indian
  Astronomical Ephemeris). The base value at J2000 is tuned (23.8267°)
  to match Drik Panchang's published modern values within ~1′; the
  annual drift is the standard 50.2879″.
- **Festivals**: rule-based, with conventions documented in this file.
  Smarta defaults where Smarta/Vaishnava disagree.

## The five limbs

Given a civil date and a location (lat, lon, IANA tz), the panchanga is
anchored to **sunrise at that location on that civil date**. All five
limbs are reported as they are at that sunrise; their end times are
computed by bisection from that sunrise forward.

### Tithi (lunar day)

```
elongation = (moonLong − sunLong + 360) mod 360
tithiIndex = floor(elongation / 12) + 1     (1..30)
paksha     = tithiIndex <= 15 ? shukla : krishna
```

Tithi is invariant under ayanamsa — the offset cancels in the
subtraction — so we use tropical longitudes directly. Tithi end time is
found by bisecting on `elongation` crossing the next multiple of 12°
within a 30-hour window. Precision: sub-second; tolerance vs. Drik: ±2
minutes.

### Nakshatra (lunar mansion)

```
moonSidereal = (moonLong − ayanamsa + 360) mod 360
nakshatraIndex = floor(moonSidereal / 13°20′) + 1   (1..27)
pada           = floor((moonSidereal mod 13°20′) / 3°20′) + 1
```

### Yoga

```
sumSidereal = (sunLong + moonLong − 2 × ayanamsa) mod 360
yogaIndex   = floor(sumSidereal / 13°20′) + 1
```

### Karana

Half a tithi: 60 karanas per synodic month. The 7 "movable" karanas
(Bava, Balava, Kaulava, Taitila, Garaja, Vanija, Vishti) repeat 8 times
through positions 1..56. The 4 "fixed" karanas (Shakuni, Chatushpada,
Naga, Kimstughna) occupy positions 57..60 — the half-tithis before the
next Shukla Pratipada.

### Vara (weekday)

Anchored to sunrise. The Hindu day runs sunrise-to-sunrise. If you ask
"what is the vara at 2 AM?", the answer is yesterday's vara because
today's sunrise hasn't happened yet. The API accepts a civil date (not
an instant) to keep the anchor unambiguous: sunrise of that civil date.

## Sunrise / sunset / moonrise / moonset

Provided by astronomy-engine's `SearchRiseSet`, which models atmospheric
refraction (~34′) and solar/lunar semi-diameter (~16′) for an apparent
horizon of 0°50′ below true horizon — matching the Drik Panchang
convention. At polar latitudes (|lat| > ~66.5°) the sun may not rise on
a given day; we return `null` and fall back to local noon for the
panchanga anchor.

## Masa (lunar month) and Adhik Maas

A lunar month runs new-moon-to-new-moon (Amanta) or full-moon-to-full-
moon (Purnimanta). The astronomy is identical; only the display label
shifts.

**Naming rule**: the lunar month *starting* at new moon N is named after
the sidereal sign Sun is in at the instant of N (Drik Panchang
convention).

```
| Sun sidereal sign at new moon | Month |
| ----------------------------- | ----- |
| Mesha (0)                     | Vaishakha   |
| Vrishabha (1)                 | Jyeshtha    |
| Mithuna (2)                   | Ashadha     |
| Karka (3)                     | Shravana    |
| Simha (4)                     | Bhadrapada  |
| Kanya (5)                     | Ashvina     |
| Tula (6)                      | Kartika     |
| Vrishchika (7)                | Margashirsha|
| Dhanu (8)                     | Pausha      |
| Makara (9)                    | Magha       |
| Kumbha (10)                   | Phalguna    |
| Meena (11)                    | Chaitra     |
```

**Adhik Maas detection**: for the lunar month spanning new moons N₁ and
N₂, compare the Sun's sidereal sign at each:

- If `signAtN₁ == signAtN₂` (Sun did not enter a new sign during the
  month): this month is **Adhika**.
- If `(signAtN₂ - signAtN₁) mod 12 == 2` (Sun entered two signs): this
  month is **Kshaya** — extremely rare.
- Otherwise: a normal month.

**Purnimanta shift**: in the Purnimanta system, the month boundary is
the full moon mid-cycle, so the Krishna paksha is labelled with the
*next* month name compared to Amanta. The code applies the shift only
to the display label.

## Samvat (year systems)

We display three:
- **Vikrama Samvat** = Gregorian + 56 or + 57 (boundary at Chaitra
  Shukla 1, approximated as April 1)
- **Shaka Samvat** = Gregorian − 78 or − 79
- **Kaliyuga Era** = Gregorian + 3101 or + 3102

The 60-year Jovian cycle name (Samvatsara) is keyed off the Vikrama
year using the standard anchor: Vikrama 1984 = Prabhava (index 0).

## Ritu and Ayana

- **Ritu**: 6 seasons, 2 sidereal solar months each. Vasanta (Mesha–
  Vrishabha), Grishma (Mithuna–Karka), Varsha (Simha–Kanya), Sharad
  (Tula–Vrishchika), Hemanta (Dhanu–Makara), Shishira (Kumbha–Meena).
- **Ayana**: Uttarayana begins when Sun enters sidereal Makara (Makara
  Sankranti, ~Jan 14). Sun crosses signs 9, 10, 11, 0, 1, 2 during
  Uttarayana and 3..8 during Dakshinayana.

## Muhurta

- **Rahu-Kaal / Yamaganda / Gulika**: each one of 8 equal daylight
  segments (sunrise → sunset / 8), with the segment number determined
  by the weekday per the standard table. See `muhurta.ts` for the
  lookup.
- **Abhijit**: 48 minutes centred on local noon (midpoint of sunrise
  and sunset). Does not occur on Wednesdays per Smarta tradition.
- **Brahma Muhurta**: the 48 minutes starting 96 minutes before
  sunrise.

## Festivals

Each Phase 1 festival is expressed as a predicate over a `Panchanga`
value (e.g., "Shukla Navami of Chaitra, non-Adhika"). The rule fires on
the civil day when the panchanga at sunrise matches.

### Tie-breakers

A few festivals require special handling when the relevant tithi spans
two sunrises. Phase 1 defaults follow **Smarta** convention. Plans for
Vaishnava and other regional variants live in Phase 2.

| Festival     | Tie-breaker (Phase 1 default)                                        |
|---           |---                                                                   |
| Janmashtami  | Day where Krishna Ashtami is present at sunrise (Smarta).            |
| Ekadashi     | Day where Ekadashi is present at sunrise (Smarta).                   |
| Diwali       | Day where Krishna Amavasya is present during pradosha (evening twilight). The current rule simplifies to "Krishna Amavasya at sunrise"; the spanning-two-evenings case will be refined in Phase 2. |
| Mahashivaratri | Day where Krishna Chaturdashi of Magha is present at sunrise.      |

### Solar sankrantis

Makara Sankranti (and the regional Pongal / Lohri tied to it) is
currently flagged by Gregorian date (Jan 14 in the location's tz). A
future revision will compute the actual sankranti instant from the
Sun's sidereal-sign transit.

## Numerical accuracy

- **Ephemeris**: astronomy-engine's `SunPosition` and `GeoMoon` rotated
  into the ecliptic of date are accurate to ≪ 1 arcsec for Sun and
  ~1 arcmin for Moon — translating to tithi-end-time errors of
  < 5 seconds.
- **Ayanamsa**: linear-in-time approximation, ±1 arcmin vs. Drik
  Panchang's polynomial across 1900–2100. Net contribution to
  nakshatra-end-time error: ≲ 4 minutes worst case.
- **Bisection**: stops when `hi − lo < 1e-7` days ≈ 8.6 ms. Effective
  precision is whatever the ephemeris supplies.

The published acceptance criterion from `ARCHITECTURE.md` is ±2 minutes
on tithi/nakshatra/yoga end times. The regression test suite enforces
exact-match on names and indices and ±2-minute tolerance on times for
every committed fixture.

## Open methodological choices

These are deliberately left as user-changeable settings (or open
issues), not hard-coded:

- Smarta vs. Vaishnava convention for Janmashtami / Ekadashi
- Diwali tie-breaker when Amavasya spans two evenings (current code
  uses sunrise-tithi; pradosha-tithi is the more authoritative rule)
- Which Onam: the rule fires on Shravana nakshatra in Bhadrapada/
  Shravana, which gives the Malayalam Thiruvonam
- Whether to bundle Hijri/Jewish/etc. dates as cross-references —
  deferred to Phase 2
