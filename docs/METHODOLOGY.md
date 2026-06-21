# Methodology

This document describes how Panchanga computes each value it displays.
It's the user-facing companion to `ARCHITECTURE.md`. If you want to
verify a number against another source (or argue with a result), this
is the page to read.

## Sources

- **Ephemeris**: [astronomy-engine](https://github.com/cosinekitty/astronomy) (MIT).
  Sub-arcminute accuracy for Sun and Moon; the apparent ecliptic-of-date
  longitudes match Swiss Ephemeris to within a few arcseconds across
  1900–2100 (verified independently — `tests/reference/`).
- **Ayanamsa**: Lahiri by default (the convention of the Indian
  Astronomical Ephemeris). The base value at J2000 is **23.85709°** =
  Swiss Ephemeris `SE_SIDM_LAHIRI`, the official IAE value; the annual
  drift is the standard ~50.29″. (drikpanchang.com uses a value ~0.4′
  higher; we match the independent gold standard, not Drik.)
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

Each karana is ~12 hours, so a single panchanga day (24 h from sunrise)
contains **2–3 distinct karanas**. The compute layer returns both the
karana active at sunrise (`panchanga.karana`, kept for compatibility)
and the full per-day sequence (`panchanga.karanas: KaranaInfo[]`) with
end times for each transition. UI surfaces should show all of them.

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
- **Vikrama Samvat** = Gregorian + 56 or + 57, switching at Chaitra
  Shukla Pratipada using the computed lunar month around March/April.
- **Shaka Samvat** = Gregorian − 78 or − 79.
- **Kaliyuga Era** = Gregorian + 3101 or + 3102.

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

We compute ten time-windows. The inauspicious three each occupy 1/8 of
daylight, segment number selected by the weekday-table in `muhurta.ts`:

- **Rahu Kaal** — avoid for new ventures.
- **Yamaganda** — avoid for travel.
- **Gulika Kaal** — generally inauspicious.

The auspicious / observance windows are fixed offsets from sunrise /
solar noon / sunset:

- **Brahma Muhurta** — 48 min ending 48 min before sunrise (96–48 min
  before sunrise). The most auspicious window of the day.
- **Pratah Sandhya** — the 48-min twilight ending at sunrise.
- **Abhijit Muhurta** — the 48 min centred on solar noon (midpoint of
  sunrise and sunset). Skipped on Wednesday per Smarta tradition.
- **Vijaya Muhurta** — the 11th of 15 daylight muhurtas, counted from
  sunrise. Auspicious for victory / fresh starts.
- **Godhuli Muhurta** — "cow-dust hour", 48 min centred on sunset.
  Auspicious for weddings.
- **Sayahna Sandhya** — the 48-min twilight starting at sunset.
- **Nishita Kaal** — the 8th of 15 night-muhurtas (7/15 to 8/15 of
  the night after sunset). Anchor for night-time observances; the
  Smarta Janmashtami rule requires Ashtami to be present anywhere in
  this *interval* (not merely at its centre).

All windows are returned on `panchanga.muhurta`.

## Festivals

Each festival is a predicate over a `Panchanga` value. Simple
festivals are "tithi N of paksha P of masa M, non-Adhika" (e.g., Rama
Navami = Chaitra Shukla 9). The major festivals where Drik's published
date diverges from the naive sunrise-tithi check are routed through
the tiebreaker engine in `src/lib/panchanga/tiebreakers.ts`.

### Provenance — what is sourced vs Drik-aligned

Be honest about which parts rest on a citable source and which are
calibrated to drikpanchang.com:

- **Verifiable.** The astronomy (tithi/nakshatra/yoga from Sun/Moon,
  ayanamsa, sunrise) is pinned to Swiss Ephemeris. The *rule type* for
  each festival (Ganesh = Madhyahna-vyapini, Shivaratri = Nishita-vyapini,
  etc.) is classical (Dharmasindhu / Nirnaya Sindhu). The principle that a
  festival's tithi **occurs every year** and a kshaya (skipped) tithi is
  observed **on the day it occurs** is classical and is a fact, not a
  convention — enforced by `tests/regression/festivals-all-years.test.ts`.
- **Drik-aligned (calibrated, not independently sourced).** The *exact
  numerical* window spans, the Bhadra cutoffs (`prahar4` etc.), and the
  `pick`/tiebreaker choices are tuned so the strict-day output matches
  drikpanchang.com across 2015–2028 (`festivals-multi-year`). They follow
  classical rule *types* but the precise numbers are reverse-engineered to
  Drik, not derived from a single authority. Treat normal-year dates as
  "Smarta, Drik-aligned."

### Cross-checked against the Government of India standard

The **rule framework** matches the official national standard, not just Drik:
- The **Calendar Reform Committee (1955, Meghnad Saha)** adopted **Lahiri
  ayanamsa** — what this engine uses — published by the Government of India
  through the **Rashtriya Panchang** (Positional Astronomy Centre, IMD).
- The Rashtriya Panchang uses the **suryodaya (sunrise) tithi** rule with
  festivals on **tithi + chandra-masa** — our structure.

Major-festival **dates** for 2026 were cross-checked against the Government of
India gazetted/restricted-holiday list and Drik per-city (New Delhi): Makar
Sankranti, Maha Shivaratri, Holi, Buddha Purnima, Raksha Bandhan, Janmashtami,
Ganesh Chaturthi, Vijayadashami, Diwali all match.

This independent cross-check **found one real bug**: Rama Navami used the plain
sunrise rule, but it is **madhyahna-vyapini** (Rama's midday birth) — the Govt
list + Drik give the madhyahna/Smarta date (2026-03-26), and the sunrise output
was landing on the Vaishnava day. Worse, 5 "Drik-verified" fixtures had been
circularly pinned to our *own* sunrise/Vaishnava output (2013/2017/2019/2026/2028),
never independently checked. Both fixed (see `festivals/pan-india.ts`,
`fixtures/festivals-multi-year.ts`). **Lesson: cross-validate against an
independent authority, not our own prior output.** Every remaining festival was
then re-verified against the primary digests — see the next section.

### Authoritative-rule audit (primary dharmashastra, 2026-06)

Every festival was then re-verified against the **primary digests** — Dharmasindhu
(Kashinath Upadhyay), Nirnaya Sindhu (Kamalakara Bhatta), Purushartha Chintamani —
and the Govt **Rashtriya Panchang**, not just drikpanchang. The standard: follow the
*authoritative* rule, and where reputable sources differ, the principled one. **~25
festivals were confirmed SOLID** against a primary citation. Notable outcomes:

- **Janmashtami — validated as authoritative, not just Drik-aligned.** Nirnaya
  Sindhu: *"अत्र निशीथवेध एव ग्राह्यः … तस्यैव मुख्यकालः"* — only the Nishita-vedha is the
  principal time (mukhya-kala). Rohini nakshatra **upgrades the label** to "Jayanti"
  but does **not** move the day. So the app's Ashtami-at-Nishita rule (ignore Rohini,
  later-pick) is the genuine rule; the Vaishnava/ISKCON date can differ by a day.
- Five rules were **wrong or mislabelled and fixed**:

  | Festival | Was | Authoritative rule (now) |
  |---|---|---|
  | Lohri | hard-coded Jan 13 | eve of Makara Sankranti (Sankranti − 1) |
  | Akshaya Tritiya | sunrise | **purvahna-vyapini** — Tritiya pervades the forenoon (Nirnaya Sindhu *"पूर्वाह्णव्यापिनी ग्राह्या"*), forenoon span-overlap with a 6-ghatika later-day tie-break |
  | Onam / Thiruvonam | lunar Bhadrapada | **solar** — Thiruvonam nakshatra at midday in Chingam (Sun in Simha) |
  | Vaikuntha Ekadashi | lunar Margashirsha (= Mokshada) | **solar Dhanurmasa** Shukla Ekadashi (Sun in Dhanu; 0/1/2 per Gregorian year) |
  | Amavasya | one observance | **split**: Pitru-karya (Darsha Shraddha, aparahna) + Deva-karya (auspicious, udaya), both monthly |

- **Pongal — a Vakya/Lahiri time-source split, not a cutoff bug.** The Tamil
  month-start rule is the *same* sunset cutoff we use (the fractional/aparahna cutoff
  is Kerala's, per Sewell & Dikshit 1896). But Tamil Nadu's traditional **Vakya
  (Surya-Siddhanta)** panchangam computes the Makara ingress ~a day later than
  Lahiri/Drik, so the TN-Govt 2026 date is Jan 15 while our Lahiri ingress (the
  national Rashtriya Panchang standard) gives Jan 14. We keep Lahiri and **document**
  the Vakya divergence rather than build a separate Surya-Siddhanta solar model.

The helpers added this round (`purvahnaVyapiniMatches`, `isThiruvonamOnam`,
`sankrantiObservanceMidnight`) live in `tiebreakers.ts`; the solar Dhanurmasa /
Amavasya-split rules are inline in `festivals/pan-india.ts`.

### Known limitations

- **Short-tithi years.** When a tithi pervades no day's named window, the
  festival falls back to the general sunrise rule (above) so it never
  vanishes — but the *day* can differ from Drik's festival-specific
  handling by ±1 (e.g. Ganesh Chaturthi 1975). Presence is guaranteed;
  exactness in these rare years is not.
- **1983 Kshaya Masa.** The Pausha–Magha "lost month" (the only kshaya
  masa in 1950–2100; next 2124) is not specially handled, so its Magha
  festivals are absent. Documented, not silently dropped.

### Tiebreaker engine

The engine has four families. Each rule cites the muhurta window it's
anchored to, and each is unit-tested with explicit per-year assertions.

**1. Window-vyapini predicate.** `vyapiniMatches(p, window, tithiIndex, pick)`.
The festival fires on the day where the target tithi is present at the
named muhurta window (Pradosha, Nishita, Aparahna, Madhyahna,
Chandrodaya). `pick: 'earlier' | 'later'` resolves ties when two
consecutive days qualify.

**2. Bhadra-Kaal exclusion.** The Vishti karana ("Bhadra") blocks
observance of Holika Dahan and Raksha Bandhan. Each festival has its
own cutoff for "how late Bhadra is allowed to extend":

- `'sunset'` — shift if Bhadra extends past sunset.
- `'prahar1'` — shift if Bhadra extends past 1/4 of the night (Raksha
  Bandhan: festival must be tied in daytime; ~2½ h after sunset).
- `'prahar4'` — shift if Bhadra extends past 3/4 of the night (Holika
  Dahan: late-night observance OK if Bhadra ends before the last
  prahar).

A 5-minute guard band absorbs astronomy-engine ↔ Drik ephemeris drift
at the cutoff boundary.

**3. Sunrise fallback.** When neither today nor adjacent days qualify
the window predicate (tithi-kshaya / short-tithi years), fall back to
the day where the tithi is at sunrise. Used by Karva Chauth (when
Chaturthi doesn't span moonrise), Janmashtami, Vijayadashami.

**4. Nakshatra preference.** Vijayadashami picks the day where
**Shravana nakshatra** is at Aparahna when two days both have Dashami
at Aparahna.

### Per-festival wiring

| Festival            | Rule                                                              |
|---                  |---                                                                |
| Holika Dahan        | Pradosha-vyapini Purnima, `later` pick, Bhadra cutoff `prahar4`.  |
| Holi                | The day after Holika Dahan (replays Holika rule on yesterday).    |
| Maha Shivaratri     | Nishita-vyapini Chaturdashi, `earlier` pick.                      |
| Krishna Janmashtami | Ashtami present *anywhere* in the **Nishita Kaal interval** (7/15 to 8/15 of night), `later` pick, sunrise fallback. Smarta default. |
| Ganesh Chaturthi    | Madhyahna-vyapini Chaturthi.                                      |
| Raksha Bandhan      | Aparahna-vyapini Purnima, Bhadra cutoff `prahar1`, sunrise fallback. |
| Vijayadashami       | Aparahna-vyapini Dashami, Shravana-nakshatra preferred, `earlier` pick, sunrise fallback. |
| Karva Chauth        | Chandrodaya-vyapini Chaturthi (moonrise), sunrise fallback.       |
| Dhanteras           | Pradosha-vyapini Trayodashi.                                      |
| Diwali              | Pradosha-vyapini Amavasya, `earlier` pick. Festival fires on a day whose **sunrise tithi may be Krishna 14** (Chaturdashi) — Amavasya doesn't have to be at sunrise; it has to be at Pradosha. Drik's published convention. |
| Makara Sankranti    | Bisection-found exact transit JD; observance is the transit civil day unless transit is after sunset, in which case the next civil day. |

### Monthly observances (the recurring vrats, shown in Day view, excluded from the annual list)

| Observance        | Rule                                                              | Provenance |
|---                |---                                                                |---         |
| Amavasya          | Aparahna-vyapini new-moon (30), `earlier`, sunrise fallback.      | **Sourced.** Shraddha is an aparahna rite (Dharmasindhu, Shraddha prakarana: *"Parvana shraddha has to be of aparahna-prapti"*); Darsha Amavasya is the aparahna-vyapini new moon. |
| Purnima           | Aparahna-vyapini full-moon (15), `earlier`, sunrise fallback.    | **Drik-aligned, not independently sourced.** No single primary-text day rule (textbook vrat = moonrise, snana = sunrise); aparahna is used because it reproduces Drik's "Purnima dates" list, which neither alternative does. |
| Sankashti Chaturthi | Chandrodaya-vyapini Krishna Chaturthi (moonrise), `earlier`.    | Sourced rule type (same as Karva Chauth). |
| Pradosh Vrat      | Pradosha-vyapini Trayodashi (both pakshas), `earlier`.           | Sourced rule type (evening vrat). |
| Masik Shivaratri  | Nishita-vyapini Krishna Chaturdashi (skips Magha = Maha Shivaratri). | Sourced rule type (same as Maha Shivaratri). |
| Ekadashi          | Both-paksha Ekadashi at sunrise, vriddhi-aware (purvaviddha).    | Sourced (Smarta purvaviddha); Smarta/Vaishnava split on doubled Ekadashis is not offered (we follow Smarta). |

Cross-checked date-by-date vs drikpanchang (per-city geoname-id) for **New Delhi
2026 + Kolkata 2025**: amavasya, purnima, sankashti all 12-13/12-13 exact;
pradosh 25/25 Delhi but 23/24 Kolkata (one pradosha-window-offset edge);
ekadashi 23/24 Delhi (Padmini) and ~22/24 Kolkata (Devutthana) — the residual
Ekadashi/pradosh boundary cases are tracked, not hidden, in
`tests/regression/monthly-observances.test.ts`. See `panchang-accuracy-discipline`.

### Why festival date and sunrise tithi can differ

A common reading is "Diwali is the Amavasya day, so sunrise tithi must
be Amavasya". Drik's actual rule is **Amavasya at Pradosha** — and on
roughly 1 year in 3, that day's sunrise tithi is Chaturdashi. Both
Diwali and Naraka Chaturdashi can legitimately share that civil day:
Naraka Chaturdashi anchors to the pre-dawn / sunrise; Diwali anchors
to the Pradosha. The UI exposes both `panchanga.tithi` (at sunrise)
and `panchanga.tithi.endTime` (when it transitions to the next tithi)
so users can see the day's full tithi sequence.

### Accuracy audit

- Main fixture window: 233 festival-date checks across 2015-2028 for
  New Delhi → 233 / 233 pass for the app's current Smarta-default
  convention.
- Multi-city smoke (6 Indian cities × 16 festivals for 2025): 96/96.
- Extended-year regression (2012, 2013, 2030): all non-Holika/Holi
  checks pass; Holika Dahan and Holi remain documented divergences for
  2012 and 2013.
- Daily limb fixture coverage is improved but still not complete: the
  current corpus includes 24 timed fixtures across 15 locations and 6
  civil dates. Moonrise/moonset still need strict Drik reference
  coverage before chandrodaya-sensitive behavior can be called fully
  proven.

## Numerical accuracy

- **Ephemeris**: astronomy-engine's `SunPosition` and `GeoMoon` rotated
  into the ecliptic of date are accurate to ≪ 1 arcsec for Sun and
  ~1 arcmin for Moon — translating to tithi-end-time errors of
  < 5 seconds.
- **Ayanamsa**: tuned Lahiri J2000 anchor plus IAU-2006 precession
  polynomial, checked against Drik computational values in unit tests.
- **Bisection**: stops when `hi − lo < 1e-7` days ≈ 8.6 ms. Effective
  precision is whatever the ephemeris supplies.

The published acceptance criterion from `ARCHITECTURE.md` is ±2 minutes
on tithi/nakshatra/yoga end times. That remains the target. The current
fixture runner supports those assertions, but most committed Drik
fixtures do not yet carry the time fields needed to exercise them.

## Open methodological choices

These are deliberately left as user-changeable settings (or open
issues), not hard-coded:

- Vaishnava/ISKCON convention variants for Janmashtami / Ekadashi.
  Janmashtami split years such as 2016 and 2030 must become explicit
  alternate variants rather than changing the Smarta default.
- Which Onam: the rule fires on Shravana nakshatra in Bhadrapada/
  Shravana, which gives the Malayalam Thiruvonam
- Whether to bundle Hijri/Jewish/etc. dates as cross-references —
  deferred to Phase 2
