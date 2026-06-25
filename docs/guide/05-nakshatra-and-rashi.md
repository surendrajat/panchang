# Lesson 5 · नक्षत्र and राशि — slicing the sidereal circle

*Prerequisites: [Lesson 3](./03-sun-and-moon.md) (λ), [Lesson 4](./04-precession-and-ayanamsa.md)
(make it sidereal first).*

We can now place the Sun and Moon on the **sidereal** circle. This lesson cuts
that circle into the two division schemes the calendar uses everywhere: the
Moon's **27 नक्षत्र** (*nakṣatra*) and the zodiac's **12 राशि** (*rāśi*). Both are
pure floor-divisions — the interesting part is *why two schemes*, and what each
is for.

---

## 1. नक्षत्र — the 27 places the Moon sleeps

The Moon travels ~13.18° a day (Lesson 3). Ancient observers asked the obvious
question: *which group of stars is the Moon near tonight?* Dividing the circle so
that the Moon crosses **one division per day** gives 360° / 27 ≈ **13°20′** each.
These are the **nakṣatras** — "lunar mansions," the Moon's nightly lodgings, each
a real star-asterism with a name, a presiding deity, and a ruling planet.

```
nakṣatra index =  ⌊ λ☽(sidereal) / (13°20′) ⌋ + 1      →  1 … 27
                       Aśvinī(1)  Bharaṇī(2)  …  Revatī(27)
```

Each nakṣatra is further quartered into four **पाद** (*pāda*, "foot/quarter") of
3°20′:

```
pāda =  ⌊ (λ☽ mod 13°20′) / 3°20′ ⌋ + 1                 →  1 … 4   (27 × 4 = 108)
```

108 — a number you've seen on a mālā. That's not a coincidence; the 108 pādas are
why the bead count is 108.

```ts
// src/lib/panchanga/nakshatra.ts
export function nakshatraAtInstant(instant): NakshatraInfo {
  // sidereal λ☽ → index (1..27), pada (1..4), name, and an end-time
  // found by the SAME root-finder as the tithi (Lesson 6).
}
```

Note the end-time again: just like a tithi, "the Moon is in Rohiṇī" has an exact
**instant it ends**, found by solving λ<sub>☽</sub>(sidereal) = (index)·13°20′ with the
bracketed bisection from Lesson 6.

**Why nakṣatra is everywhere.** It's the *fine* ruler of the sky (13°20′ vs a
sign's 30°), so it carries the day-to-day texture of the calendar: the auspicious
nakṣatra for a journey, the Moon's birth-star (जन्म नक्षत्र, *janma nakṣatra*),
and — charmingly — the **first syllable of a baby's name**, fixed by the
nakṣatra + pāda at birth (the नामाक्षर, *nāmākṣara*; 108 pādas → 108 syllables).
That table lives in `jyotish/names.ts` and is used in the kundli (Lesson 12).

---

## 2. राशि — the 12 signs (the same twelve, but sidereal)

Cut the same circle into **12** instead of 27 and you get 30° **rāśis** — the
zodiac signs. They are the *same twelve* as the Western zodiac (Meṣa = Aries,
Vṛṣabha = Taurus, …) **but measured siderally**, so they currently sit ~24° (≈
0.8 of a sign) off the Western tropical signs — that whole offset is the ayanāṁśa
of Lesson 4.

```
rāśi index =  ⌊ λ(sidereal) / 30° ⌋                     →  0 … 11
                  Meṣa(0)  Vṛṣabha(1)  …  Mīna(11)
```

Applied to **λ<sub>☽</sub>** it gives the Moon-sign (राशि as people usually mean it, the
"moon sign"). Applied to **λ<sub>☉</sub>** it gives the solar month and drives sankrānti and
ऋतु ([Lesson 10](./10-the-year.md)). Applied to each planet's λ it builds the
**kundli** ([Lesson 12](./12-jyotish.md)).

---

## 3. Two rulers, two jobs

| | नक्षत्र | राशि |
| --- | --- | --- |
| Count | 27 (× 4 pādas = 108) | 12 |
| Arc | 13°20′ | 30° |
| Driven by | the **Moon** (one/day) | longitude of **any** body |
| Used for | naming, muhūrta, matching, daily texture | the year, the chart, the month |

They are not rivals; they're a coarse ruler and a fine ruler laid over the same
circle. A position is fully described by *both* (Moon in Rohiṇī **and** in
Vṛṣabha), and different parts of the calendar reach for whichever resolution they
need.

---

## 4. For any place and time

Both schemes are pure functions of a **sidereal longitude**, so:

- they need [Lesson 4](./04-precession-and-ayanamsa.md) first (subtract the
  ayanāṁśa) — unlike the tithi, a nakṣatra *shifts* if you change the ayanāṁśa;
- they are otherwise location-independent (the Moon's nakṣatra is the same
  worldwide at a given instant);
- they work across the whole date range because they inherit λ from the
  ephemeris and the ayanāṁśa polynomial, both range-free.

---

## Caveats worth knowing

- **Equal vs unequal nakṣatras.** This project uses the standard **equal**
  13°20′ division. A minority tradition (and the star Abhijit as a 28th) uses
  unequal spans; we don't, matching mainstream pañcāṅgas.
- **Boundary sensitivity.** Because a rāśi/nakṣatra is a hard floor-division, a
  body within ~0.4′ of a cusp could be labelled either side depending on the
  ayanāṁśa choice (Lesson 4). Rare, but it's the one place the ayanāṁśa debate
  can flip a *displayed* value rather than just a time.

## The code
- `src/lib/panchanga/nakshatra.ts` — `nakshatraAtInstant` (index, pāda, name,
  end-time).
- `src/lib/jyotish/grahas.ts` — `nakshatraOf`; rāśi is `⌊λ/30⌋` throughout the
  kundli engine.
- `src/lib/jyotish/names.ts` — the nāmākṣara (naming-syllable) table.

---
*Next: [Lesson 6 · तिथि](./06-tithi.md) — the lunar day, and the worked example
of the root-finder that also powers nakṣatra and yoga end-times.*
</content>
