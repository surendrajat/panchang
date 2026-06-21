# Jyotish (Kundli) — Reference

The terse formula + provenance + accuracy reference for the kundli (birth
chart), Vimshottari dasha, and Ashtakoota matching engines. For a **teaching**
walk-through (intuition, derivations, what every number means), read
[`guide/12-jyotish.md`](./guide/12-jyotish.md) and the earlier guide lessons it
builds on (especially [04 — precession + ayanamsa](./guide/04-precession-and-ayanamsa.md)
and [05 — nakshatra + rashi](./guide/05-nakshatra-and-rashi.md)).

All code lives under `src/lib/jyotish/`, on the shared `src/lib/astro/` backend.
Every function is pure: birth instant + place in, plain numbers out — no
network, no server.

## 1. Pipeline

```
date + time + place
      │  civil → UTC instant → Julian Day
      ▼
astronomy-engine  ─►  geocentric, true-of-date ecliptic positions (tropical)
      │  − ayanamsa (Lahiri)
      ▼
sidereal longitudes  ──►  rashi · nakshatra + pada · retrograde   [grahas.ts]
      │
      ├──►  lagna (ascendant) from sidereal time + latitude       [lagna.ts]
      │      └──►  whole-sign houses (bhava)                       [chart.ts]
      ├──►  Vimshottari dasha (Moon nakshatra)                     [dasha.ts]
      └──►  Ashtakoota guna milan (two charts)                     [matching.ts]
```

Everything downstream of the sidereal longitudes is exact arithmetic; the only
astronomy is steps 2–3.

## 2. Time → instant → JD

`birthInstant(date, time, timezone)` resolves a civil date+time in an IANA zone
to UTC (the same DST-safe converter as the panchanga uses,
`julian.ts:civilTimeInZone`), then `dateToJulian()` to Julian Day. Note that
**~4 minutes of birth time ≈ 1° of ascendant**, so birth-time uncertainty
dominates every other error in a chart.

## 3. Grahas — `grahas.ts`

### 3.1 Ephemeris

[`astronomy-engine`](https://github.com/cosinekitty/astronomy), validated against
NASA/JPL to sub-arcsecond. For each body we take the **apparent geocentric**
position (light-time + aberration corrected), rotated EQJ→ECT into the **true
ecliptic of date** — the same frame the panchanga uses. The nine grahas: Surya,
Chandra, Mangala, Budha, Guru, Shukra, Shani, and the lunar nodes Rahu / Ketu.

### 3.2 Rahu / Ketu — mean node

```
Ω = 125.0445479 − 1934.1362891·T + 0.0020754·T² + T³/467441 − T⁴/60616000   (deg)
    T = Julian centuries since J2000
```

Rahu = Ω, Ketu = Ω + 180°, both always retrograde by convention. Matches Swiss
Ephemeris mean node to < 0.01′. (True-node toggle is a planned option; the true
node oscillates ±~1.5° around the mean.)

### 3.3 Ayanamsa

`sidereal = tropical − ayanamsa(JD)`. We use **Lahiri (Chitrapaksha)** — the
ayanamsa adopted by the Government of India's 1956 Calendar Reform Committee. In
`astro/ayanamsa.ts`: IAU-2006 precession polynomial anchored to **23.85709° at
J2000** = Swiss Ephemeris's `SE_SIDM_LAHIRI`.

> "Lahiri" has several realisations within ~0.6′. We anchor to the Swiss
> Ephemeris value (the Indian Astronomical Ephemeris standard since 1985) — the
> same number astro.com, Jagannatha Hora and ProKerala compute. **drikpanchang.com
> sits ~0.40′ higher** (23.8635°); we don't follow it. That 0.40′ ≈ 45 s on a
> nakshatra end-time, ≈ 1.6 s of birth time. See guide ch. 4 for the full
> story; verified directly via `pyswisseph` in `tests/reference/`.

### 3.4 Chart facts from longitude

- **Rashi** (0–11): `floor(λ / 30)` — 30° per sign, Mesha (Aries) = 0.
- **Nakshatra** (1–27): `floor(λ / (360/27)) + 1` — 13°20′ each.
- **Pada** (1–4): each nakshatra split into four 3°20′ quarters.
- **Retrograde** (vakri): sign of `dλ/dt` by finite difference. Sun and Moon
  never retrograde; the mean nodes always do.

## 4. Lagna — `lagna.ts`

The degree of the ecliptic rising on the eastern horizon — the one quantity
that needs latitude + longitude, not just the date.

```
RAMC = GAST·15 + longitudeEast                     (deg)
ε    = obliquity of the ecliptic
λ_asc(tropical) = atan2( cos RAMC, −(sin RAMC·cos ε + tan φ·sin ε) )
λ_asc(sidereal) = λ_asc(tropical) − ayanamsa
```

`GAST` from `astronomy-engine`; the `atan2` form picks the **rising** (eastern)
intersection. `LST = GST + longitude` is the standard formula used by the
Government of India ephemeris, Swiss Ephemeris (`swe_houses`), astro.com,
Jagannatha Hora, ProKerala, and `astronomy-engine`'s horizon transform.
drikpanchang.com is the lone outlier (it scales longitude by the sidereal/solar
ratio — the old LMT-table method — shifting its lagna by a longitude-proportional
term ≤ ~13′); we deliberately do not replicate that.

**Houses (bhava)** — whole-sign, the dominant North-Indian convention: house 1 =
lagna sign, house 2 = next sign, …, so `house(graha) = ((grahaRashi −
lagnaRashi + 12) mod 12) + 1`. (Bhava-chalit/Sripati and equal-house are
possible future toggles.) When the birth time is unknown, lagna + houses are
omitted but the graha rashis and Moon-based dasha remain valid.

## 5. Vimshottari Dasha — `dasha.ts`

A 120-year cycle of nine planetary periods (*mahadashas*), keyed entirely to the
**Moon's nakshatra at birth** — pure arithmetic once the Moon's sidereal
longitude is known.

```
Ketu 7 · Venus 20 · Sun 6 · Moon 10 · Mars 7 · Rahu 18 · Jupiter 16 · Saturn 19 · Mercury 17
                                                                         (sums to 120)
```

The lord of the birth nakshatra runs at birth (nakshatra *n* → lord
`order[(n−1) mod 9]`; Ashwini → Ketu, Bharani → Venus, …). The first period's
remaining balance is set by the Moon's progress through its nakshatra: fraction
*f* through → `f × lordYears` has already elapsed, so the period is back-dated
by that. Antardashas subdivide each mahadasha in the same order, each spanning
`mahaYears × subYears / 120`. ("Year" = 365.25 days for display.)

## 6. Ashtakoota Guna Milan — `matching.ts`

Marriage compatibility scored out of **36** across eight kootas. Every koota is
a lookup/arithmetic function of the two partners' Moon nakshatra + Moon rashi —
no new astronomy. Tables sourced verbatim from [Saravali](https://saravali.github.io),
pinned to hand-computed values in `tests/unit/matching.test.ts`.

| # | Koota | Max | Keys on |
|---|-------|-----|---------|
| 1 | Varna | 1 | Moon-sign → varna; groom ≥ bride |
| 2 | Vashya | 2 | Moon-sign → vashya group; 5×5 matrix |
| 3 | Tara/Dina | 3 | nakshatra count both ways / 9; remainders 3/5/7 → 0 |
| 4 | Yoni | 4 | nakshatra → 1 of 14 animals; 14×14 matrix (4 = same … 0 = enemy) |
| 5 | Graha Maitri | 5 | Parashara naisargika friendship of the two Moon-sign lords |
| 6 | Gana | 6 | nakshatra → Deva/Manushya/Rakshasa; asymmetric 3×3 |
| 7 | Bhakoot | 7 | rashi relationship; 2/12, 5/9, 6/8 → 0 (dosha) |
| 8 | Nadi | 8 | nakshatra → Aadi/Madhya/Antya; same nadi → 0 (dosha) |

Notes: Varna/Vashya/Tara/Gana are **role-dependent** (groom/bride orientation
matters). Two identical charts score **28/36** (same nakshatra → Nadi dosha —
the canonical textbook result). Traditional dosha-cancellation exceptions are
not yet applied — that part is labelled "preview."

## 7. Conventions

| Choice | Used | Possible future toggles |
|--------|------|-------------------------|
| Ayanamsa | Lahiri (Chitrapaksha) | KP, Raman, Yukteshwar, True Chitra |
| Lunar node | Mean | True |
| Houses | Whole-sign (bhava = rashi) | Bhava-chalit/Sripati, equal |
| Ascendant LST | `GST + longitude` (standard) | — *(we don't replicate Drik's variant)* |
| Chart style | North-Indian (diamond) | South-Indian (square) |
| Dasha | Vimshottari | other dashas |

## 8. Accuracy & verification

Independent fixture coverage, locked in the regression suite (`pnpm test`):

- **Grahas vs Swiss Ephemeris** (`tests/regression/kundli-vs-swisseph.test.ts`,
  1925–2040): on `SE_SIDM_LAHIRI`, all nine grahas ≤ **0.4′** — pure
  astronomy-engine-vs-Moshier theory difference, no ayanamsa offset. Mean nodes
  ≤ 0.05′, true node ≤ 0.8′. Reference values generated by
  `tests/reference/gen_swisseph.py`.
- **vs Drik** (`tests/regression/kundli-vs-drik.test.ts`): pins the two
  *deliberate* differences — grahas +0.38′ (the ayanamsa variant) and the lagna
  longitude term — so any *other* drift trips the test.
- **Lagna vs Swiss Ephemeris**: true obliquity → ≤ **0.3′** (uniform ~0.24′ —
  the sidereal-time floor), both hemispheres, all day. Cross-checked live
  against ProKerala (Leo 5°59′ = our value; Drik's Leo 6°10′ is the documented
  outlier).
- **Core panchanga vs Swiss Ephemeris**
  (`tests/regression/panchanga-vs-swisseph.test.ts`): tithi/nakshatra/yoga at
  sunrise match by **index exactly**, end times within seconds (≤ 41 s) — far
  tighter than the ±2 min Drik fixtures.
- **Vimshottari**: verified from first principles — running lord = Moon's
  nakshatra lord, period back-dated by exactly `fraction × lordYears`.
- **Ashtakoota**: 15 hand-computed assertions pin every koota to the Saravali
  tables, including the asymmetries and identical = 28/36.

For perspective: **0.4′ ≈ 2 seconds of birth time.** No one knows their birth
time that precisely, so the engine's error is negligible next to the input.

## What this is, and isn't

The **astronomy** here is real, validated celestial mechanics. The
**interpretation** — that a sidereal longitude predicts temperament or marital
harmony — is a centuries-old symbolic system, not science. Controlled studies
have not found that astrological placements predict outcomes beyond chance, and
there is no known physical mechanism for them to. This app **computes the system
faithfully and accurately**; it does not assert the predictions are true. The
longer version of this argument, with examples, lives in
[`guide/12-jyotish.md` §6](./guide/12-jyotish.md).

## References

- Indian Astronomical Ephemeris / Rashtriya Panchang — Positional Astronomy
  Centre, Kolkata (Govt. of India). Report of the Calendar Reform Committee
  (1955).
- J. Meeus, *Astronomical Algorithms* (mean node, sidereal time, obliquity).
- Swiss Ephemeris (`swe_houses`, `SE_SIDM_LAHIRI`) — Astrodienst; verification
  via `pyswisseph`.
- [`astronomy-engine`](https://github.com/cosinekitty/astronomy) — sub-arcsecond
  ephemeris (our backend).
- [Saravali](https://saravali.github.io) — classical source for the Ashtakoota
  koota tables.
- See also [`METHODOLOGY.md`](./METHODOLOGY.md) (panchanga) and the
  [from-scratch guide](./guide/) for the teaching layer.
