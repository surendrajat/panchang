# Jyotish (Kundli) Methodology — how the engine works, from scratch

This document explains exactly how the kundli (birth chart), Vimshottari dasha,
and Ashtakoota matching are computed in this app — the astronomy, the math, the
conventions, the references, and the measured accuracy. It is written so you can
follow the whole thing from first principles. The last section,
[**§9 What this is, and isn't**](#9-what-this-is-and-isnt), is a deliberately
honest, non-mystical account of what these numbers actually represent.

All code is under `src/lib/jyotish/`, built on the shared `src/lib/astro/` layer.
Everything is a pure function: a birth instant + place in, plain numbers out. No
network, no server — it runs in your browser.

---

## 1. The pipeline

```
date + time + place
      │  (civil → UTC instant → Julian Day)
      ▼
astronomy-engine  ──►  geocentric positions of Sun, Moon, planets (tropical, of-date)
      │  − ayanamsa (Lahiri)
      ▼
sidereal longitudes  ──►  rashi (sign), nakshatra + pada, retrograde     [grahas.ts]
      │
      ├──►  ascendant (lagna) from sidereal time + latitude               [lagna.ts]
      │         └──►  whole-sign houses (bhava)                            [chart.ts]
      │
      ├──►  Vimshottari dasha  (from the Moon's nakshatra)                 [dasha.ts]
      │
      └──►  Ashtakoota guna milan  (two charts' Moon nakshatra + rashi)    [matching.ts]
```

Everything downstream of the sidereal longitudes is exact arithmetic. The only
"astronomy" is steps 2–3.

---

## 2. Time → instant → Julian Day

A birth is given as a civil date + clock time in a place. We turn it into one
unambiguous instant in UTC, then into a **Julian Day (JD)** — the continuous day
count astronomers use.

- `birthInstant(date, time, timezone)` builds the UTC instant using the place's
  IANA time zone (so DST and odd offsets are handled correctly), via the same
  fix-point converter the panchanga uses (`julian.ts:civilTimeInZone`).
- `dateToJulian(date)` converts to JD (UT), the input to all ephemeris math.

A reminder that matters later: **4 minutes of birth time ≈ 1° of ascendant**, so
birth-time uncertainty dominates every other error in a chart.

---

## 3. Planetary positions (the grahas) — `grahas.ts`

### 3.1 The ephemeris

We use [`astronomy-engine`](https://github.com/cosinekitty/astronomy), which is
validated against NASA/JPL to sub-arcsecond accuracy. For each body we take its
**apparent geocentric** position (corrected for light-time and aberration) and
rotate it into the **true ecliptic of date** (the EQJ→ECT rotation), so the Sun,
Moon, and every planet share one reference frame — exactly how the panchanga
already computes the Moon for tithi/nakshatra. This yields a *tropical* ecliptic
longitude.

The nine grahas: **Surya** (Sun), **Chandra** (Moon), **Mangala** (Mars),
**Budha** (Mercury), **Guru** (Jupiter), **Shukra** (Venus), **Shani** (Saturn),
and the two lunar nodes **Rahu** and **Ketu**.

### 3.2 Rahu / Ketu — the lunar nodes

Rahu and Ketu are not bodies; they are the two points where the Moon's orbit
crosses the ecliptic. We use the **mean node** (Meeus, *Astronomical Algorithms*,
47.7):

```
Ω = 125.0445479 − 1934.1362891·T + 0.0020754·T² + T³/467441 − T⁴/60616000   (degrees, T = Julian centuries since J2000)
```

Rahu = Ω, Ketu = Ω + 180°. The nodes are always retrograde by convention. (Drik
defaults to the *true* node, which oscillates ±~1.5° around the mean; a True-node
toggle is a planned option. Our mean node matches Swiss Ephemeris's mean node to
< 0.01′ — see §8.)

### 3.3 Sidereal longitude (the ayanamsa)

Hindu astronomy uses the **sidereal** zodiac (fixed against the stars), not the
tropical one (fixed against the equinox). The two drift apart by precession; the
offset between them is the **ayanamsa**:

```
sidereal longitude = tropical longitude − ayanamsa(JD)
```

We use **Lahiri (Chitrapaksha)** — the ayanamsa adopted by the Government of
India's 1956 Calendar Reform Committee and used in the Rashtriya Panchang. Our
implementation (`astro/ayanamsa.ts`) uses the IAU-2006 precession polynomial,
anchored to **23.85709° at J2000** = Swiss Ephemeris's `SE_SIDM_LAHIRI`.

> **A precision footnote that matters for rigor.** "Lahiri" has several
> numerical realizations within ~0.6′. We anchor to Swiss Ephemeris's
> `SE_SIDM_LAHIRI` (documented as the official Indian Astronomical Ephemeris
> value, in use since 1985) — the same value astro.com, Jagannatha Hora and
> ProKerala compute, and the same accuracy-first choice we make for the lagna.
> Notably **drikpanchang.com sits ~0.40′ higher** (23.8635° at J2000); we do
> *not* follow it. That 0.40′ ≈ 45 s on a nakshatra/yoga end time and ≈ 1.6 s of
> birth time — below any practical threshold, but real, so we match the
> independent gold standard rather than any single panchang site. Verified
> directly with `pyswisseph` (see `tests/reference/`).

### 3.4 From longitude to chart facts

Given a sidereal longitude `λ`:

- **Rashi** (sign 0–11): `floor(λ / 30)`. 30° each, Mesha (Aries) = 0.
- **Nakshatra** (1–27): `floor(λ / 13.333…) + 1`. Each lunar mansion is 360/27 =
  13°20′. **Pada** (quarter, 1–4): each nakshatra splits into four 3°20′ padas.
- **Retrograde** (vakri): sign of `dλ/dt` by a small finite difference. The Sun
  and Moon never retrograde; the mean nodes always do.

---

## 4. The ascendant (lagna) — `lagna.ts`

The **lagna** is the degree of the ecliptic rising on the eastern horizon at the
birth instant and place — the one quantity that needs the observer's latitude and
longitude, not just the date.

```
RAMC = local sidereal time (deg) = GAST·15 + longitudeEast        // right ascension of the meridian
ε    = obliquity of the ecliptic
λ_asc(tropical) = atan2( cos RAMC, −(sin RAMC·cos ε + tan φ·sin ε) )
λ_asc(sidereal) = λ_asc(tropical) − ayanamsa
```

`GAST` (Greenwich apparent sidereal time) comes from `astronomy-engine`; the
`atan2` form already selects the *rising* (eastern) intersection, not the setting
one.

**Why longitude is added directly.** `LST = GST + longitude` is the standard,
geometrically rigorous formula — the actual rising point. It is what the
**Government of India** standard (Indian Astronomical Ephemeris:
`LST = GMST + longitude/15`), **Swiss Ephemeris** (`swe_houses`), **astro.com**,
**Jagannatha Hora**, **ProKerala**, and `astronomy-engine`'s validated horizon
transform all use. `drikpanchang.com` is the lone outlier — it scales the
longitude by the sidereal/solar ratio (the old "Local Mean Time" table method),
which shifts its lagna by a longitude-proportional term (≤~13′, sign-flipping
across hemispheres). **We deliberately do not replicate that**; we match the
standard. (Drik's grahas differ from ours only by the ~0.38′ ayanamsa variant —
see §3.3 — nothing else.)

### Houses (bhava)

We use **whole-sign houses**, the dominant North-Indian convention: the 1st house
is the entire lagna sign, the 2nd house the next sign, and so on. So the house of
a graha is `((grahaRashi − lagnaRashi + 12) mod 12) + 1`. (Bhava-chalit / Sripati
and equal-house systems are possible future options.)

When the birth time is unknown, the lagna and houses are omitted — but the graha
**rashis** and the Moon-based **dasha** remain valid, so a time-unknown chart is
still meaningful.

---

## 5. Vimshottari Dasha — `dasha.ts`

Vimshottari is the dominant timing system: a 120-year cycle of nine planetary
periods (*mahadashas*), keyed entirely to the **Moon's nakshatra at birth**. Pure
arithmetic — the only astronomical input is the Moon's sidereal longitude.

The nine lords, in order, with their year-spans (summing to 120):

```
Ketu 7 · Venus 20 · Sun 6 · Moon 10 · Mars 7 · Rahu 18 · Jupiter 16 · Saturn 19 · Mercury 17
```

- The **lord of the birth nakshatra** runs at birth: nakshatra *n* → lord
  `order[(n−1) mod 9]` (Ashwini → Ketu, Bharani → Venus, …).
- The **balance** of that first period is set by how far the Moon has travelled
  through its nakshatra: if it is a fraction *f* of the way through, then *f* of
  that lord's period has already elapsed at birth. So the period is back-dated by
  `f × lordYears`, and everything after follows in fixed order.
- **Antardashas** (sub-periods) subdivide each mahadasha in the same order, each
  spanning `mahaYears × subYears / 120`.

(A Vimshottari "year" is taken as 365.25 days for display.)

---

## 6. Ashtakoota Guna Milan (matching) — `matching.ts`

Marriage compatibility scored out of **36 points** across **eight kootas**. Every
koota is a lookup/arithmetic function of the two partners' **Moon nakshatra** and
**Moon rashi** — no new astronomy. Tables are sourced verbatim from **Saravali**
(saravali.github.io), an authoritative classical reference, and the implementation
is pinned to hand-computed values in `tests/unit/matching.test.ts`.

| # | Koota | Max | What it keys on |
|---|-------|-----|------------------|
| 1 | Varna | 1 | Moon-sign → varna (Brahmin/Kshatriya/Vaishya/Shudra); groom ≥ bride |
| 2 | Vashya | 2 | Moon-sign → vashya group; 5×5 compatibility matrix |
| 3 | Tara/Dina | 3 | nakshatra count both ways /9; remainders 3,5,7 score 0 |
| 4 | Yoni | 4 | nakshatra → 1 of 14 animals; 14×14 matrix (4 = same … 0 = sworn enemy) |
| 5 | Graha Maitri | 5 | friendship of the two Moon-sign lords (Parashara naisargika) |
| 6 | Gana | 6 | nakshatra → Deva/Manushya/Rakshasa; asymmetric 3×3 table |
| 7 | Bhakoot | 7 | rashi relationship; 2/12, 5/9, 6/8 → 0 (dosha) |
| 8 | Nadi | 8 | nakshatra → Aadi/Madhya/Antya; same nadi → 0 (dosha) |

Notes worth knowing: **Varna, Vashya, Tara, and Gana are role-dependent** (the
groom/bride orientation matters — the tables are asymmetric). Two identical charts
score **28/36, not 36**, because the same nakshatra means the same nadi → Nadi
dosha (0/8); this is the canonical textbook result. **Dosha-cancellation rules**
(traditional exceptions to Nadi/Bhakoot dosha) are not yet applied — this is the
one part still labelled "preview."

---

## 7. Conventions in one place

| Choice | We use | Alternatives (possible future toggles) |
|--------|--------|----------------------------------------|
| Ayanamsa | Lahiri (Chitrapaksha) | KP, Raman, Yukteshwar, True Chitra |
| Lunar node | Mean | True |
| Houses | Whole-sign (bhava = rashi) | Bhava-chalit / Sripati, equal |
| Ascendant LST | `GST + longitude` (standard / Govt of India) | — (we do **not** offer Drik's variant) |
| Chart style | North-Indian (diamond) | South-Indian (square) |
| Dasha | Vimshottari | other dashas |

---

## 8. Accuracy & verification

Everything is checked against independent, authoritative references and locked in
the regression suite (run with `pnpm test`):

- **Grahas vs Swiss Ephemeris**, 1925–2040 (`tests/regression/kundli-vs-swisseph.test.ts`):
  on the same `SE_SIDM_LAHIRI` ayanamsa, all nine grahas match to **≤ 0.4′** —
  pure astronomy-engine-vs-Moshier theory difference, no ayanamsa offset. Mean
  nodes ≤ 0.05′, true node ≤ 0.8′. Reference values regenerated by
  `tests/reference/gen_swisseph.py`.
- **Relationship to Drik Panchang** (`tests/regression/kundli-vs-drik.test.ts`):
  pins the two *deliberate* differences exactly — grahas are +0.38′ (the ayanamsa
  variant, §3.3) and the lagna differs by the longitude term — so any *other*
  drift trips the test.
- **Lagna vs Swiss Ephemeris**: with the true obliquity it matches to **≤ 0.3′**
  (a uniform ~0.24′ — the sidereal-time floor) across both hemispheres and the
  full day; cross-checked **live against ProKerala** (Leo 5°59′ = our value;
  Drik's Leo 6°10′ is the documented outlier).
- **Core panchanga vs Swiss Ephemeris** (`tests/regression/panchanga-vs-swisseph.test.ts`):
  the tithi/nakshatra/yoga current at sunrise match by **index exactly**, with end
  times within **seconds** (≤ 41 s) — an independent check, far tighter than the
  ±2 min Drik fixtures.
- **Vimshottari dasha** is verified from first principles: the running lord is the
  Moon's nakshatra lord, and the period is back-dated by exactly `fraction ×
  lordYears`.
- **Ashtakoota**: 15 hand-computed assertions pin every koota to the Saravali
  tables, including the asymmetries and the canonical identical = 28/36.

For perspective: **0.4′ of arc ≈ 2 seconds of birth time.** No one knows their
birth time that precisely, so the engine's error is astronomically negligible
next to the input uncertainty.

---

## 9. What this is, and isn't

It's worth being precise and honest, because the question deserves it.

**The astronomy is real science.** Predicting where the Sun, Moon, and planets are
against the stars — to better than an arcminute, for any date across millennia — is
genuine, hard, validated celestial mechanics. The classical Indian astronomers who
built this (Aryabhata, Varahamihira, Bhaskara, and the lineage behind the
Surya-Siddhanta) were doing first-rate quantitative science: they measured the
length of the year and the precession of the equinoxes, predicted eclipses, and
encoded it all in calculable rules. That precision is not superstition; it is the
substrate this app reproduces, and it is why the numbers are exact.

**The interpretation is a different kind of thing.** The step from "the Moon is at
48.93° sidereal" to "this predicts temperament, health, or marital harmony" is not
established by the astronomy. It is a **symbolic system** — a centuries-old mapping
of sky-state onto human meaning. Controlled scientific studies have **not** found
that astrological placements predict personality or life outcomes beyond chance,
and there is **no known physical mechanism** by which a planet's sidereal longitude
would causally shape a marriage. So: the calculation is science; the **claim that
the result forecasts your life is not** — it is belief and tradition. This app
computes the system faithfully and accurately; it does not assert the predictions
are true.

**So what does guna milan actually represent, stripped of significance?** Several
real things, none of which require the predictions to be valid:

1. **A monument to pre-modern astronomy.** The whole edifice sits on a remarkably
   accurate sky-model. Reproducing it is reproducing that achievement.
2. **A deterministic function of two birth moments → a number.** Given two
   instants and places, it returns a repeatable score. That determinism is what
   makes it *feel* objective — and is exactly why it works as a social tool.
3. **A social technology for a hard decision.** In the context it evolved for
   (arranged marriage between families), an external, neutral-seeming, shared
   procedure does real work: it gives a face-saving way to say no, a structured
   conversation, and a checklist that — by coincidence or design — names genuine
   relationship dimensions (temperament/Gana, health-and-progeny/Nadi,
   values/Varna, mutual liking/Vashya, friendship/Graha-Maitri). The *assignment*
   of nakshatra to "temperament" is arbitrary; the *idea* of checking temperament
   compatibility is not.
4. **A cultural and symbolic language** people use to think about character and
   fate — closer to a shared mythology or a personality framework than to physics.

Your instinct — that logical, rigorous ancestors wouldn't build something this
precise for nothing — is right about the *engineering*. The precision lived in the
**calendar and the ephemeris**: knowing when to plant, when the eclipse comes, when
the festival falls. The astrological layer is a meaning-making system built on top
of that real science. Both can be appreciated for what they are: one as a triumph
of measurement, the other as a sophisticated piece of human culture. This app
treats the first as fact and the second as faithfully-computed tradition — and
keeps the line between them clear.

---

## References

- Indian Astronomical Ephemeris / Rashtriya Panchang — Positional Astronomy Centre,
  Kolkata (Govt. of India). Report of the Calendar Reform Committee (1955).
- J. Meeus, *Astronomical Algorithms* (mean node, sidereal time, obliquity).
- Swiss Ephemeris (`swe_houses`, `SE_SIDM_LAHIRI`) — Astrodienst; verification here
  used `pyswisseph`.
- `astronomy-engine` — sub-arcsecond ephemeris (our backend).
- Saravali (saravali.github.io) — classical source for the Ashtakoota koota tables.
- See also `METHODOLOGY.md` (panchanga) and `KUNDLI_PLAN.md` (design + roadmap).
