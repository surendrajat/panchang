# Lesson 11 · Festivals — from a tithi to a date on the wall

*Prerequisites: [Lesson 6](./06-tithi.md) (tithi, kṣaya/vṛddhi),
[Lesson 8](./08-the-day.md) (the sunrise rule), [Lesson 9](./09-masa.md) (months).*

This is where everything converges. A festival is an *instruction* in the
language of the previous ten lessons — "Caitra Śukla Navamī" — and our job is to
turn it into **one square on a wall calendar**. For most festivals that's
delightfully easy. For a handful it's genuinely hard, and this is the lesson
where the course is most careful to separate **fact** from **convention** — because
that line is exactly where a calendar can mislead you.

---

## 1. The easy case: a tithi, a pakṣa, a month

The simplest festivals are a direct address into the calendar:

> **Rāma Navamī** = Caitra · Śukla · Navamī (the 9th of the bright fortnight of
> Caitra).

Combine the masa (Lesson 9), the pakṣa + tithi (Lesson 6), and the sunrise rule
(Lesson 8 — "the tithi at sunrise owns the day") and you have the date. In code
it's a predicate over a day's pañcāṅga:

```ts
// src/lib/panchanga/festivals/pan-india.ts
inShukla(9, 'Chaitra')   // fires on the day whose sunrise tithi is Caitra Śukla 9
```

The vast majority of the year's festivals are this. The catch is the small word
"the tithi at sunrise" — which assumes a tithi *touches* exactly one sunrise. As
[Lesson 6](./06-tithi.md) warned, sometimes it touches **none** (kṣaya) or **two**
(vṛddhi). Resolving that is most of the real work.

---

## 2. The fact part: a festival's tithi happens every year, exactly once

Here is something we can assert with no appeal to anyone's tradition, because
it's astronomy: **the tithi for a festival occurs every year, and on exactly one
"sunrise day."** So the project enforces it as an invariant — every annual
festival must resolve to *exactly one* date, every year from 1950 to 2100
(`festivals-all-years.test.ts`). Getting there required fixing two real bugs that
the naïve sunrise rule hides:

- **Kṣaya (skipped tithi).** If Navamī begins after sunrise and ends before the
  next, *no* day has "Navamī at sunrise." The classical rule: the skipped tithi
  is observed on the day it **falls within**. (Verified: Rāma Navamī 2000 → April
  12, matching the published date.)
- **Vṛddhi (doubled tithi).** If a tithi spans two sunrises, the naïve rule fires
  the festival on **both** days. The rule: observe the **first** (पूर्वविद्धा,
  *pūrva-viddhā*).

Both live in one small, documented helper, `sunriseTithiObservedForDate`
(`tiebreakers.ts`), with modular handling at the month boundary (a skipped
Pratipada belongs to the *next* month, etc. — a subtlety that caused, and now
prevents, duplicate firings).

This part is *principled*: "occurs once" is a fact, and "skipped → its day,
doubled → first day" is the general Smārta rule, applied uniformly, citable to
the dharmaśāstra digests (Dharmasindhu, Nirṇaya Sindhu).

---

## 3. The convention part: व्यापिनी windows and tie-breakers

Now the honesty. Many festivals are **not** decided at sunrise but at some other
moment of the day — the rule is that the tithi must be **व्यापिनी** (*vyāpinī*,
"pervading") a particular window:

| Festival | Decided when the tithi pervades… | Window |
| --- | --- | --- |
| Gaṇeśa Caturthī | **midday** | madhyāhna |
| Mahā Śivarātri | **midnight** | niśīta |
| Holikā Dahan | **after sunset** | pradoṣa |
| Karva Chauth | **moonrise** | candrodaya |
| Vijayadaśamī | **afternoon** | aparāhna |

On top of that sit **tie-breakers** (when two days both qualify, pick earlier or
later) and **भद्रा** (*bhadrā*/Viṣṭi, Lesson 7) **exclusions** — Holikā Dahan and
Rakṣā Bandhan are *blocked* while bhadrā is active and shift accordingly.

Here is the line the course insists on drawing:

> The **rule types** — "Gaṇeśa is a midday festival," "Śivarātri is a midnight
> festival" — are **classical and citable**. But the **exact numbers** that
> implement them — *how wide* is "midday," the precise bhadrā cut-off, which way
> a tie breaks — are **calibrated to match drikpanchang.com**, the popular
> reference, across 2015–2028. They follow the classical rule *types*, but the
> precise constants are **reverse-engineered to Drik, not derived from a single
> authority.** Treat normal-year festival dates as *"Smārta, Drik-aligned,"* not
> as independently proven.

We say this plainly in code (`METHODOLOGY` and the comments in `pan-india.ts`)
because pretending a tuned constant is a derived truth is exactly the kind of
false confidence this project refuses.

---

## 4. The caveats that follow honestly from §3

Because the window constants are tuned to normal years, the edges are where we
must be upfront:

- **Rare short-tithi years can be ±1 day.** When a tithi pervades *no* day's
  window, the engine falls back to the general sunrise rule so the festival never
  vanishes — but the *day* it picks can differ from Drik's festival-specific
  handling by one. Presence is guaranteed; exact-day in those rare years is not.
  We chose **not** to keep tuning window widths to erase these, because that's
  curve-fitting without a source.
- **1983, the kṣaya māsa** ([Lesson 9](./09-masa.md)) — its Māgha festivals
  (Mahā Śivarātri, Vasanta Pañcamī) are absent; the kṣaya-month observance is
  itself disputed, so we document the gap.
- **Region and sampradāya.** Where Smārta and Vaiṣṇava traditions disagree
  (e.g. Janmāṣṭamī, Ekādaśī), the project defaults to **Smārta** and says so. A
  festival is, in the end, a *human* observance; there isn't always one right
  answer to discover.

---

## 5. What we *can* stand behind

To be fair to the engine, the strong claims are strong:

- **No festival vanishes and none duplicates**, 1950–2100, except the documented
  1983 (`festivals-all-years.test.ts`) — a *fact*-level guarantee.
- **Normal-year dates match Drik Panchang** across 2015–2028 for the full festival
  set (`festivals-multi-year.test.ts`).
- **The astronomy underneath is independently verified** (Lessons 3, 4, 8 — vs
  Swiss Ephemeris). When a festival date is "wrong," it's a *convention* call,
  never an arithmetic error.

That is the honest shape of a festival engine: a rigorous astronomical core, a
classically-correct skeleton of rules, a layer of tuned constants that match the
popular reference for ordinary years, and a clearly-flagged margin of convention
at the rare edges.

---

## The code
- `src/lib/panchanga/festivals/pan-india.ts` — the festival predicates.
- `src/lib/panchanga/tiebreakers.ts` — `sunriseTithiObservedForDate` (kṣaya/
  vṛddhi), the vyāpinī window rules, bhadrā logic, saṅkrānti cut-offs.
- `tests/regression/festivals-all-years.test.ts` (exactly-once invariant),
  `festivals-multi-year.test.ts` (vs Drik).

---
*Next: [Lesson 12 · कुण्डली](./12-jyotish.md) — the same Sun/Moon/planet
machinery, turned on a single moment of birth.*
</content>
