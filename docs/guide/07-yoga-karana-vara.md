# Lesson 7 · योग, करण, वार — the rest of the five limbs

*Prerequisites: [Lesson 6](./06-tithi.md) (the elongation and the root-finder).*

The word **पञ्चाङ्ग** (*pañcāṅga*) means "five limbs" (पञ्च *pañca* = five, अङ्ग
*aṅga* = limb). [Lesson 6](./06-tithi.md) built the first and most important —
the **tithi**. This lesson builds the other four. Three of them (yoga, karaṇa,
vāra) are quick variations on machinery you already have; the fourth (vāra) is
the one limb that comes from the *civil day* rather than from λ — and that turns
out to be a feature.

The five, side by side:

| # | Limb | From | Count | Needs ayanāṁśa? |
| --- | --- | --- | --- | --- |
| 1 | **तिथि** tithi | λ☽ − λ☉ | 30 | no (difference) |
| 2 | **वार** vāra | the sunrise day | 7 | no (not a λ) |
| 3 | **नक्षत्र** nakṣatra | λ☽ | 27 | yes |
| 4 | **योग** yoga | λ☽ + λ☉ | 27 | **yes (doubly)** |
| 5 | **करण** karaṇa | λ☽ − λ☉ | 11 (×60/month) | no (difference) |

---

## 1. योग (yoga) — the sum of the two lights

Take the tithi machine and change **one sign**. Instead of the *difference*
λ☽ − λ☉, the **yoga** uses the *sum* λ☽ + λ☉, sliced into 27 parts of 13°20′
(the same arc as a nakṣatra):

```
yoga index =  ⌊ (λ☽ + λ☉)(sidereal) / (13°20′) ⌋ + 1     →  1 … 27
              Viṣkambha(1)  Prīti(2)  …  Vaidhṛti(27)
```

There are 27 named yogas (Viṣkambha, Siddhi, Vyatīpāta, …); some are auspicious,
a few are avoided. The end-time is found with the **same bisection** as the
tithi, just on the sum.

**A subtle point the difference/sum split makes vivid.** The tithi's ayanāṁśa
*cancels* (Lesson 6). The yoga's does the **opposite** — it **doubles**:

```
(λ☽ − a) + (λ☉ − a) = (λ☽ + λ☉) − 2a
```

So the yoga is the limb *most* sensitive to the ayanāṁśa choice (Lesson 4): an
error of `a` moves the yoga boundary by `2a`. It's the clearest reason the
project cares about getting the ayanāṁśa right and validating it.

```ts
// src/lib/panchanga/yoga.ts
export function yogaAtInstant(instant): YogaInfo { /* sum, ÷13°20′, +end-time */ }
```

---

## 2. करण (karaṇa) — half a tithi

A **karaṇa** is literally **half a tithi** — 6° of elongation instead of 12°. So
each lunar month has 60 karaṇas. But there are only **11 names**, because of a
fixed pattern: four *sthira* (fixed) karaṇas occur once each around the new moon,
and seven *cara* (moving) karaṇas repeat eight times through the month.

```
karaṇa boundary every 6° of (λ☽ − λ☉)  →  60 per month, cycling through 11 names
```

Because it's built on the **difference** λ☽ − λ☉, the karaṇa is **ayanāṁśa-free**,
exactly like the tithi. One karaṇa in particular matters operationally:
**Viṣṭi**, better known as **भद्रा** (*bhadrā*) — an inauspicious window that
*blocks* certain festival observances (you'll see it decide Holikā Dahan and
Rakṣā Bandhan in [Lesson 11](./11-festivals.md)).

```ts
// src/lib/panchanga/karana.ts
export function karanaAtInstant(instant): KaranaInfo
export function karanaSequenceForDay(...)   // all karaṇas overlapping a civil day
```

---

## 3. वार (vāra) — the weekday, and why it's different

The **vāra** is the seven-day week — Ravivāra (Sunday, the Sun's day),
Somavāra (Monday, the Moon's), … Śanivāra (Saturday, Saturn's). It is the **only**
limb not computed from λ. It comes from the **civil day**, and crucially the
Hindu day runs **sunrise to sunrise**, not midnight to midnight:

```ts
// src/lib/panchanga/vara.ts
export function varaAtSunrise(...)  // the weekday owning this sunrise-to-sunrise day
```

This is why a festival "on Tuesday" is decided by *which weekday owns the
sunrise*, and why the whole calendar is **sunrise-anchored** — the subject of the
next lesson. The classical ordering of the planetary days (Sun, Moon, Mars,
Mercury, Jupiter, Venus, Saturn) even has an elegant derivation from the 24
**horā** (planetary hours) of the day, but for the calendar you only need: *the
vāra is the weekday of the sunrise.*

---

## 4. The five limbs together = one day's पञ्चाङ्ग

Put them in one row and you have literally what a printed pañcāṅga prints for a
date:

> **तिथि** Śukla Tṛtīyā (ends 09:51) · **वार** Maṅgalavāra · **नक्षत्र** Rohiṇī
> (ends 04:01) · **योग** Saubhāgya (ends 05:51) · **करण** Gara (ends …)

All five are functions of the **two longitudes** (plus the sunrise day for the
vāra). That's the whole pañcāṅga. Everything after this — months, years,
festivals, charts — is *organising* these limbs across time and *selecting* among
them by rule.

---

## Caveats worth knowing

- **End-times use sunrise as the reference point for display, the limb itself is
  global.** As with the tithi, *when* a yoga or karaṇa ends is a universal
  instant; *which day* it's printed under depends on the sunrise day (Lesson 8).
- **Yoga is the ayanāṁśa canary.** If a yoga end-time ever looks off by ~1.5
  minutes against another source, suspect a different ayanāṁśa (the doubling
  above), not an ephemeris bug.

## The code
- `src/lib/panchanga/yoga.ts`, `karana.ts`, `vara.ts`.
- `tests/unit/yoga.test.ts`, `karana.test.ts`, `vara.test.ts`,
  `muhurta-karana.test.ts`.

---
*Next: [Lesson 8 · The day and सूर्योदय](./08-the-day.md) — why everything is
anchored to sunrise, and how we compute sunrise for any latitude.*
</content>
