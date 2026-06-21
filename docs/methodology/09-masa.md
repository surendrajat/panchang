# Lesson 9 · मास — the lunar month (and its leaps and losses)

*Prerequisites: [Lesson 5](./05-nakshatra-and-rashi.md) (rāśi, the Sun's sign),
[Lesson 6](./06-tithi.md) (new moon = tithi boundary).*

We can name a *day* (the five limbs). Now we stack days into **मास** (*māsa*,
lunar months) and lock those months to the Sun's year. This is where the
"luni-solar" promise of the [intro](./README.md) is actually kept — and where the
calendar's two most exotic creatures live: the **leap month** (अधिक मास) and the
**lost month** (क्षय मास).

---

## 1. A lunar month is one lap of the Moon's phases

A लునар month is the **synodic month** — new moon to new moon (≈ 29.53 days), the
elongation of [Lesson 6](./06-tithi.md) going 0° → 360°. The new moon (अमावस्या,
*amāvāsyā*) is just the instant the elongation crosses 0°, so we already know how
to find it precisely. The project locates the bounding new moons of the month
containing any instant:

```ts
// src/lib/panchanga/masa.ts
export function masaContext(jd, ayanamsa): MasaContext {
  startNewMoonJD,  endNewMoonJD,     // the two amāvāsyās bracketing this month
  signAtStart,     signAtEnd,        // the Sun's sidereal rāśi at each (Lesson 5)
}
```

Those two **Sun signs** are the whole secret to naming and to leaps. Hold onto
them.

---

## 2. Naming a month — by the Sun, not the Moon

Here's the elegant bit. A lunar month is named after the **solar sign the Sun is
in during it** — specifically the rāśi the Sun *enters* (the सङ्क्रान्ति,
*saṅkrānti*, [Lesson 10](./10-the-year.md)) inside that month. Sun enters Meṣa
→ the month is **Caitra**; enters Vṛṣabha → **Vaiśākha**; and so on through the
twelve:

```
Caitra · Vaiśākha · Jyeṣṭha · Āṣāḍha · Śrāvaṇa · Bhādrapada
Āśvina · Kārtika · Mārgaśīrṣa · Pauṣa · Māgha · Phālguna
```

This is what *ties the lunar month to the solar year*: the month's very name is a
solar fact. A baby-step of code — `signsCrossed = (signAtEnd − signAtStart + 12)
mod 12` — and the name follows from `signAtStart`.

---

## 3. Two conventions: अमान्त vs पूर्णिमान्त

Where does the month *start*? Two regional answers, both correct:

- **अमान्त** (*amānta*, "ending at the new moon") — month = new moon → new moon.
  South-Indian default.
- **पूर्णिमान्त** (*pūrṇimānta*, "ending at the full moon") — month = full moon →
  full moon. North-Indian default.

They label the **same physical days** differently: a day in the dark fortnight is
"Phālguna Kṛṣṇa" in the North but "Māgha Kṛṣṇa" in the South. This is a frequent
source of confusion (and of *double-counting* bugs), so the engine always keys
festival rules on the **canonical amānta name** (`masa.amantaName`) regardless of
the user's display choice — see the comment atop `festivals/pan-india.ts`. The
month system is a *display* setting; the underlying lunar bracket is the same.

```ts
// src/lib/panchanga/masa.ts
export function computeMasa(ctx, paksha, monthSystem): MasaInfo
```

---

## 4. The 11-day problem, and the अधिक मास that solves it

Twelve lunar months ≈ 12 × 29.53 ≈ **354 days**. The solar year ≈ **365.25
days**. The lunar calendar falls **~11 days behind the Sun every year** — left
alone, festivals would march backwards through the seasons (as they do in a
purely lunar calendar). The Hindu calendar's fix is to insert a **leap month**
every ~2.7 years:

> **An अधिक मास (*adhika māsa*, "extra month") is a lunar month in which the Sun
> enters *no* new sign at all.**

Why no sign? Because the Sun spends ~30.4 days in each sign but a lunar month is
only 29.53 days — so occasionally a whole lunar month fits *between* two
sankrāntis, crossing **zero** sign boundaries. That month "inherits" the name of
the following month and is marked अधिक; the real one is निज (*nija*, "true"). In
the sign-crossing arithmetic this is dead simple:

```
signsCrossed =  (signAtEnd − signAtStart + 12) mod 12
   0  → अधिक (Adhika): Sun changed no sign → LEAP month
   1  → normal month
   2  → क्षय (Kshaya): Sun changed two signs → LOST month  (see §5)
```

```ts
// src/lib/panchanga/masa.ts
const isAdhika = signsCrossed === 0;
const isKshaya = signsCrossed === 2;
```

**Festivals skip the adhika month** — they're observed in the nija month. This is
why the festival engine carries an `!isAdhika` gate, and why one of the trickiest
festival bugs (Lesson 11) was a date leaking into a leap month.

---

## 5. The क्षय मास — when a month vanishes

The mirror image is rarer and stranger. When the Sun moves fast (near perigee,
around January) it can cross **two** sign boundaries inside one short lunar month
— `signsCrossed = 2`. Then **two month-names collapse into one**, and a name is
**lost** from the year: a **क्षय मास** (*kṣaya māsa*, "diminished month"; recall
kṣaya = to shrink, from [Lesson 6](./06-tithi.md)).

This is the **rarest event in the calendar** — it happens once every 19 to 141
years. In our whole 1950–2100 range it occurs **exactly once: 1983**, when Pauṣa
and Māgha merged into a single "Pauṣa-Māgha" month (always flanked by adhika
months that compensate). Because a kṣaya month's festivals (the Māgha ones) have
no clean home, traditions genuinely disagree on where to observe them — so the
project **documents 1983 as a known gap** rather than fabricate a rule. Honesty
over false precision; the same principle as the ayanāṁśa (Lesson 4).

---

## 6. For any place and time

Month naming and the leap/lost logic are functions of **new-moon instants** and
the **Sun's sign** at them — both range-free and (being instants) the same
worldwide. So the month structure is identical for every location; only the
*civil day* a new moon lands on can differ by time zone (Lesson 1). The whole
mechanism works unchanged from 1500 to 2500, leap and lost months included.

---

## Caveats worth knowing

- **1983 (kṣaya māsa)** — the one unsupported configuration in range; its two
  Māgha festivals are absent by design (asserted explicitly in
  `tests/regression/festivals-all-years.test.ts`). Next occurrences: 2124, 2284.
- **Adhika naming variants.** A couple of edge cases (a kṣaya Pratipada falling
  into an adhika month, e.g. Caitra 1964) required care so a festival neither
  duplicates nor lands in the leap month — see Lesson 11 and the `inShukla`
  rule in `festivals/pan-india.ts`.

## The code
- `src/lib/panchanga/masa.ts` — `masaContext`, `computeMasa`, the
  adhika/kṣaya detection.
- `tests/regression/adhika-purnimanta.test.ts`, `tests/unit/masa.test.ts`.

---
*Next: [Lesson 10 · The year](./10-the-year.md) — era counts, seasons, the two
halves of the Sun's path, and the saṅkrānti that named the months above.*
</content>
