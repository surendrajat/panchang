# Lesson 6 · तिथि — the lunar day

*Prerequisites: [Lesson 3](./03-sun-and-moon.md) (computing λ<sub>☉</sub> and λ<sub>☽</sub>).
Curiously, this lesson does **not** need [Lesson 4](./04-precession-and-ayanamsa.md)
— and we'll see exactly why.*

The तिथि (*tithi*) is the single most important quantity in the whole calendar.
It is the "lunar day" — and almost every fast, festival, and ritual is pinned to
one. If you understand the tithi, you understand the engine; everything else in
Part III is a variation on the same trick.

---

## 1. The intuition: the Moon laps the Sun

Watch the Moon over a month. At the new moon (अमावस्या, *amāvāsyā*) the Moon sits
right next to the Sun in the sky — they share the same ecliptic longitude. Night
after night the Moon pulls **ahead** of the Sun (it moves ~13°/day against the
Sun's ~1°/day), growing from crescent to full. At the full moon (पूर्णिमा,
*pūrṇimā*) the Moon is exactly **opposite** the Sun — 180° ahead. Then it keeps
going, shrinking, until it catches up to the Sun again at the next new moon,
having gone a full 360°.

That **angle the Moon leads the Sun by** is the only thing a tithi measures:

```
elongation  =  λ☽ − λ☉      (reduced to the range 0°–360°)
```

This is sometimes called the **synodic angle** or *elongation*. The whole lunar
month is just this angle sweeping from 0° back to 360°.

```
       new moon            full moon            new moon
   λ☽−λ☉ = 0° ───────────► 180° ───────────► 360°/0°
   |◄──── Shukla Paksha ──►|◄──── Krishna Paksha ──►|
        (waxing, bright)         (waning, dark)
```

---

## 2. The definition: chop the angle into 30

A tithi is **one-thirtieth of the lunar month** — i.e. each 12° step of the
elongation is one tithi:

```
tithi index  =  ⌊ elongation / 12° ⌋ + 1        →  a number 1…30
```

- Tithis **1–15** are the **शुक्ल पक्ष** (*śukla pakṣa*, the bright/waxing
  fortnight), taking the elongation 0° → 180°.
- Tithis **16–30** are the **कृष्ण पक्ष** (*kṛṣṇa pakṣa*, the dark/waning
  fortnight), 180° → 360°.

Within each पक्ष (*pakṣa*, "fortnight") the tithi is *also* numbered 1–15, so you
say "Śukla Pañcamī" (5th of the bright half) or "Kṛṣṇa Caturdaśī" (14th of the
dark half). Tithi 15 of the bright half **is** Pūrṇimā; tithi 30 **is** Amāvāsyā.

In code this is the entire definition — three lines:

```ts
// src/lib/panchanga/tithi.ts
export const TITHI_DEGREES = 12;

export function tithiAtJD(jd: number): { index: number; elongation: number } {
  const elongation = sunMoonElongationAtJD(jd);            // λ☽ − λ☉, in [0,360)
  const index = Math.floor(elongation / TITHI_DEGREES) + 1; // 1..30
  return { index, elongation };
}
```

**Worked example.** Suppose at some instant λ<sub>☽</sub> = 145.46° and λ<sub>☉</sub> = 118.40°. Then
elongation = 27.06°. ⌊27.06 / 12⌋ + 1 = 2 + 1 = **3** → Śukla Tṛtīyā, the third
day of the waxing fortnight. We are 27.06 − 24 = 3.06° into a 12° tithi, so the
tithi is `3.06/12 ≈ 26%` elapsed (the `fraction` field in the code).

---

## 3. The subtlety that makes the calendar hard: a tithi is **not** 24 hours

A solar day is 24 hours by construction. A tithi is **not** — and this single
fact is responsible for most of the calendar's machinery.

The elongation grows at the rate **(Moon's speed − Sun's speed)**. But neither
body moves at a constant speed: the Moon's orbit is elliptical, so it races near
perigee and dawdles near apogee. The elongation therefore grows at anywhere from
about **11°/day to 14°/day**. Since a tithi is a fixed **12°**, its real-world
length swings between roughly **20 and 26 hours**.

That has two consequences you must internalise now, because Lessons 9 and 11
spend all their effort on them:

- A tithi **shorter than 24 hours** can begin *and* end between two sunrises —
  so it touches **no** sunrise. This is a **क्षय tithi** (*kṣaya*, literally "to
  shrink, to diminish") — a short tithi that is **lost** from the day-count.
- A tithi **longer than 24 hours** can be running at **two** consecutive
  sunrises. This is a **वृद्धि tithi** (*vṛddhi*, literally "to grow, to
  increase") — a long tithi **repeated** across two days.

The names describe the tithi's *length* (kṣaya = short, vṛddhi = long); the
*effect* on the calendar is that the short one is dropped and the long one is
counted twice.

```
sunrise      sunrise      sunrise      sunrise
   │            │            │            │
   ▼            ▼            ▼            ▼
───┬──[ T5 ]──┬──[ T6 ]──┬──[ T7 ]─────┬───   normal: one tithi per sunrise
   │          │          │             │
───┬──[T5]─[T6 (kshaya)]─[T7]──────────┬───   kshaya: T6 touches no sunrise
   │          │          │             │
───┬─[ T5 ]──┬─[  T6, still T6  ]──────┬───   vriddhi: T6 at two sunrises
```

The "which day does the festival fall on" question in
[Lesson 11](./11-festivals.md) is **entirely** about resolving these two cases,
because — as Lesson 8 explains — the Hindu day is owned by *the tithi running at
its sunrise*.

---

## 4. Computing the *end time* accurately (the real work)

Knowing *which* tithi is running is one line. Knowing **the exact instant it
ends** is what a pañcāṅga is actually for ("Tṛtīyā ends at 09:51, then
Caturthī"). The tithi ends when the elongation next reaches a multiple of 12°:

```
this tithi (index i) ends when    λ☽ − λ☉   first reaches   i × 12°
```

There's no closed-form solution — λ<sub>☽</sub> and λ<sub>☉</sub> are themselves the outputs of
ephemeris series — so we **find the root numerically**. The elongation is
smooth and monotonically increasing over a single tithi, so a bracketed
bisection converges fast and robustly:

```ts
// src/lib/panchanga/tithi.ts
const targetDegrees = index * TITHI_DEGREES;     // the 12° boundary we're heading for
const endTime = bisectAngularCrossing(
  sunMoonElongationAtJD,   // f(jd) = λ☽ − λ☉
  jd,                      // start: now
  elongation,              // f(now)
  targetDegrees,           // solve f(jd) = i·12°
  30 / 24,                 // bracket 30 h ahead (a tithi never lasts longer)
);
```

`bisectAngularCrossing` (in `panchanga/bisect.ts`) repeatedly halves the
30-hour bracket, evaluating the elongation at the midpoint, until it pins the
crossing to sub-second precision. Because the inputs (λ<sub>☽</sub>, λ<sub>☉</sub>) are accurate to a
fraction of an arc-second, the **end time is accurate to a few seconds** — and
we prove it: `tests/regression/panchanga-vs-swisseph.test.ts` checks these end
times against the Swiss Ephemeris and requires agreement within tens of seconds.

> **For any place and time.** Notice the end-time computation takes no latitude,
> longitude, or sunrise. The *instant* a tithi ends is a **global** astronomical
> event — it happens at the same moment everywhere on Earth. (Only its *civil
> clock time*, and which *day* it lands on, depend on your time zone — that's a
> display concern, handled in [Lesson 1](./01-time.md).)

---

## 5. Why this lesson didn't need the ayanāṁśa

A lovely consequence falls out of the definition. The tithi depends on
**λ<sub>☽</sub> − λ<sub>☉</sub>**, a *difference*. The ayanāṁśa (Lesson 4) is a single offset
subtracted from *both* longitudes to go sidereal:

```
(λ☽ − ayanāṁśa) − (λ☉ − ayanāṁśa)  =  λ☽ − λ☉
```

The offset **cancels**. So the tithi is identical whether you work in the
tropical or sidereal zodiac — which is why this lesson could skip Lesson 4
entirely, and why the code comments *"Tithi is invariant under ayanamsa … we use
tropical longitudes directly."* This is not a trick; it's a genuine, and
genuinely useful, property: the tithi is one of the few quantities a pañcāṅga
can get *exactly* right regardless of the (slightly debated) ayanāṁśa value.

The Nakshatra and Yoga of [Lesson 7](./07-yoga-karana-vara.md) are **not** so
lucky — they depend on λ<sub>☽</sub> and λ<sub>☽</sub>+λ<sub>☉</sub> *absolutely*, so they need the sidereal
frame. That contrast is the best possible motivation for Lesson 4.

---

## 6. Where the bigger picture goes from here

You now have the central machine:

```
        ephemeris            definition            root-find
λ☉, λ☽  ─────────►  λ☽ − λ☉  ─────────►  tithi index  ─────────►  end time
(Lesson 3)                   (this lesson)            (this lesson)
```

- Apply the *same* root-finder to **λ<sub>☽</sub>** alone and you get the Nakshatra and its
  end time. To **λ<sub>☽</sub> + λ<sub>☉</sub>**, the Yoga. (Lesson 7.)
- Track the tithi across a **whole month** between two new moons and you can name
  the month and detect leap months. (Lesson 9.)
- Ask "*which* tithi was running at this place's sunrise, and does it qualify a
  festival rule?" and you have a festival engine. (Lessons 8, 11.)

---

## Caveats worth knowing

- **Kṣaya and vṛddhi are real, not bugs.** Roughly a few times a year a tithi is
  skipped or doubled. Any rule that says "the day whose sunrise tithi is N"
  must decide what to do when N touches zero or two sunrises. The project
  resolves this with a documented, classical rule (skipped → the day it falls
  in; doubled → the first day) — see `sunriseTithiObservedForDate` in
  `panchanga/tiebreakers.ts` and the honest discussion in Lesson 11.
- **"Tithi at sunrise" is a convention, the elongation is a fact.** The number
  above is exact. The *day* we attach it to involves sunrise, which involves
  refraction and the horizon (Lesson 8) — small modelling choices live there,
  not here.

## The code
- `src/lib/panchanga/tithi.ts` — `tithiAtJD`, `tithiAtInstant`.
- `src/lib/panchanga/bisect.ts` — `bisectAngularCrossing`, the root-finder.
- `src/lib/astro/ephemeris.ts` — `sunMoonElongationAtJD`, the λ<sub>☽</sub> − λ<sub>☉</sub> source.
- `tests/regression/panchanga-vs-swisseph.test.ts` — end times vs Swiss Ephemeris.

---
*Next: [Lesson 7 · Yoga, Karana, Vara](./07-yoga-karana-vara.md) — the same
machine, pointed at different combinations of λ<sub>☉</sub> and λ<sub>☽</sub>.*
</content>
