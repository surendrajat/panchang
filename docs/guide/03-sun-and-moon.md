# Lesson 3 · सूर्य and चन्द्र — computing the Sun and Moon

*Prerequisites: [Lesson 1](./01-time.md) (JD), [Lesson 2](./02-the-sky.md)
(ecliptic longitude).*

This is the lesson where we finally get the **two numbers** the entire calendar
is built from: λ☉, the ecliptic longitude of सूर्य (*sūrya*, the Sun), and λ☽,
the longitude of चन्द्र (*candra*, the Moon). Everything in Part III is arithmetic
on these; everything before this lesson was preparation to compute them
*accurately*.

---

## 1. The honest scope: we don't reinvent celestial mechanics

Computing where the Moon is, to arc-second accuracy, is genuinely hard. The
Moon's orbit is tugged by the Sun, by the Earth's equatorial bulge, by the
ellipticity of its own orbit — the classical lunar theory has **hundreds** of
periodic terms. The Sun (really the Earth's orbit) is gentler but still not a
circle.

Reproducing those series by hand would be a career, and getting them slightly
wrong would quietly poison every tithi. So the project delegates this one job to
a dedicated, validated library — **[`astronomy-engine`][ae]** — and spends its
own effort on the *calendar* logic and on *checking* the results. This is the
dṛk-gaṇita (दृक् गणित, observation-based) principle from the
[course intro](./README.md): use the best available physics, then verify it.

```ts
// src/lib/astro/ephemeris.ts — thin wrappers over the engine
sunLongitudeAtJD(jd)        // λ☉  in [0, 360)
moonLongitudeAtJD(jd)       // λ☽
sunMoonElongationAtJD(jd)   // λ☽ − λ☉, normalized — the tithi/yoga/karana input
bodyLongitudeAtJD(body, jd) // any graha, for the kundli (Lesson 12)
```

[ae]: https://github.com/cosinekitty/astronomy

---

## 2. "Apparent geocentric ecliptic-of-date" — decoding the adjective stack

The library can return a position several ways. Hindu astronomy wants one
specific flavour, and the name encodes three deliberate choices. They matter at
the arc-second-to-arc-minute level, so it's worth knowing what each word buys.

**Geocentric** — *seen from the centre of the Earth.* Positions could be given
relative to the Sun (heliocentric) or to you on the surface (topocentric). The
pañcāṅga convention is geocentric: as if you stood at the Earth's centre. (The
surface-vs-centre difference, *parallax*, is negligible for the Sun but reaches
**~1° for the Moon** — see the caveat; the classical convention nonetheless uses
geocentric, and so do we.)

**Apparent** — *where you would actually see it,* not where it geometrically is.
Two corrections turn geometric into apparent:
- **Light-time / aberration** — light from the Sun took ~8 minutes to arrive, so
  we see it where it *was*; the Sun's apparent position lags its true one by
  ~20″.
- **Nutation** — the Earth's axis nods slightly (a short-period wobble on top of
  precession), shifting the apparent frame by up to ~17″.

**Ecliptic of date** — expressed on the ecliptic/equinox **as it is at that
instant** (Lesson 2), not on a frozen reference. This is the frame the ayanāṁśa
(Lesson 4) is defined against, so positions and ayanāṁśa stay consistent.

How the wrapper assembles this is readable:

```ts
// src/lib/astro/ephemeris.ts (sketch of bodyLongitudeAtJD)
const time   = jdToAstroTime(jd);
const vec    = GeoVector(body, time, /* aberration */ true); // apparent, geocentric, in J2000 equ.
const rotate = Rotation_EQJ_ECT(time);                       // J2000 equ. → ecliptic OF DATE
const ecl    = RotateVector(rotate, vec);
return SphereFromVector(ecl).lon;                            // the longitude λ
```

So: ask for the apparent geocentric vector, **rotate** it from the engine's
J2000 equatorial frame onto the ecliptic of date, read off the longitude. That
λ is what `sunLongitudeAtJD` and `moonLongitudeAtJD` return.

---

## 3. The two motions, in numbers (so the rest of the course makes sense)

A feel for the speeds explains everything downstream:

| Body | Speed along the ecliptic | One full lap |
| --- | --- | --- |
| ☉ Sun | ~0.99°/day | ~365.25 days (the year) |
| ☽ Moon | ~13.18°/day | ~27.3 days (sidereal month) |

Two immediate payoffs:

- **The Moon gains on the Sun at ~12.2°/day on average.** A tithi is 12° of that
  gain ([Lesson 6](./06-tithi.md)), so a tithi averages ~23.6 h (= the 29.53-day
  synodic month ÷ 30) — and because both speeds *vary* (elliptical orbits), an
  individual tithi ranges from about 20 to 26 h. That variability is the
  kṣaya/vṛddhi story.
- **The Moon crosses one nakṣatra (13°20′) in about a day** — which is exactly
  why the 27 nakṣatras exist: they're "where the Moon sleeps each night"
  ([Lesson 5](./05-nakshatra-and-rashi.md)).

---

## 4. How accurate, and how we know

For the Sun and Moon, `astronomy-engine` is good to well under an arc-second over
our whole range. But the project does not take that on faith — it pins the
output to an **independent** authority, the **Swiss Ephemeris** (the engine
professional astrology software uses), via a committed Python reference script:

- `tests/regression/kundli-vs-swisseph.test.ts` checks all nine grahas across
  1925–2040 and requires agreement within **0.5′** (planets) — the residual is
  just two different theories rounding differently, not error in our pipeline.
- `tests/reference/gen_swisseph.py` regenerates those reference numbers, so any
  reader can reproduce them.

The point of Lessons 1–2 was to make this number *meaningful for any instant*;
the point of this lesson is that the number is also *correct*, and provably so.

---

## 5. For any place and time

λ☉ and λ☽ are **geocentric** — they depend only on the *instant*, not on the
observer. So a single JD gives the same λ for Delhi, Tokyo, or a ship at sea. The
observer's location re-enters the story only later and only twice: sunrise needs
latitude/longitude ([Lesson 8](./08-the-day.md)), and the ascendant needs local
sidereal time ([Lesson 12](./12-jyotish.md)). Everything in between — tithi,
nakṣatra, yoga, the month, most festival timing — is **location-independent
physics**, which is why a phone with no network can compute it anywhere.

---

## Caveats worth knowing

- **Geocentric, by convention.** The Moon's *topocentric* longitude (from the
  Earth's surface) can differ from geocentric by up to ~1° because of parallax.
  The classical pañcāṅga is computed geocentrically, and so is this project; a
  "topocentric" toggle exists in the data model but defaults off, matching the
  mainstream convention. Worth knowing if you ever compare against a source that
  chose differently.
- **Moshier vs full theory.** For *verification* we pin against Swiss
  Ephemeris's Moshier model (no data files, fully reproducible). The tiny
  theory-to-theory differences (≤ 0.5′) are documented, not swept away.

## The code
- `src/lib/astro/ephemeris.ts` — `sunLongitudeAtJD`, `moonLongitudeAtJD`,
  `sunMoonElongationAtJD`, `bodyLongitudeAtJD`, `gastHoursAtJD`.
- `tests/regression/kundli-vs-swisseph.test.ts`, `tests/reference/gen_swisseph.py`.

---
*Next: [Lesson 4 · Precession and the ayanāṁśa](./04-precession-and-ayanamsa.md)
— the tropical longitude we just computed vs the sidereal one Hindu astronomy
wants, and the most quietly debated number in the whole field.*
</content>
