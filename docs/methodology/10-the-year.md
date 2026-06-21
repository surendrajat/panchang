# Lesson 10 · The year — संवत्, ऋतु, अयन, सङ्क्रान्ति

*Prerequisites: [Lesson 5](./05-nakshatra-and-rashi.md) (the Sun's rāśi),
[Lesson 9](./09-masa.md) (months, and naming by the Sun).*

The months of Lesson 9 sit inside a **year** with several overlapping flavours:
an era *count* (which year is it?), a *season* (ऋतु), a *half* of the Sun's
journey (अयन), and the moments the Sun *changes sign* (सङ्क्रान्ति) that tie all
the solar quantities together. All four are simple readouts of one thing you can
already compute — **the Sun's sidereal longitude** — plus, for the era count, a
little calendar bookkeeping.

---

## 1. सङ्क्रान्ति — the Sun changes sign (the solar heartbeat)

A **सङ्क्रान्ति** (*saṅkrānti*, "going across") is the instant the Sun crosses
from one rāśi into the next — twelve a year, ~30.4 days apart. It is the solar
calendar's tick, and you've already seen it do real work: it *names the lunar
month* (Lesson 9) and it *defines leap months* (a month with no saṅkrānti).

Finding it precisely is the now-familiar root-find: solve for the JD where the
Sun's sidereal longitude equals a 30° multiple.

```ts
// src/lib/panchanga/tiebreakers.ts
function findSankrantiTransitJD(bracketStartJD, targetDeg, ayanamsa)
// bisection on  (λ☉ − ayanāṁśa)  crossing  targetDeg  → sub-second precision
```

The most celebrated one is **मकर सङ्क्रान्ति** (*Makara Saṅkrānti*) — the Sun
entering Makara (Capricorn), around **14 January**, marked across India (Pongal,
Lohri, Uttarāyaṇa). Notice it lands on roughly the *same Gregorian date every
year* — because it's a **solar** event, unlike the Moon-driven festivals that
swing through a month. (It very slowly drifts later over centuries as the
ayanāṁśa grows — it was ~31 December a thousand years ago.)

> **A nice subtlety the project handles:** when a saṅkrānti happens *after
> sunset*, the festival's "Puṇya Kāla" observance shifts to the next day — so the
> civil date of Makara Saṅkrānti is Jan 14 some years and Jan 15 others. That's a
> sunset rule on top of the transit instant, verified against Drik for 2015–2027
> in `tiebreakers.ts`.

---

## 2. अयन — the two halves of the Sun's path

Split the year where the Sun turns around at the solstices and you get the two
**अयन** (*ayana*, "course/path"):

- **उत्तरायण** (*uttarāyaṇa*) — the Sun's northward half (winter solstice →
  summer solstice), traditionally taken as Sun in **Makara … Mithuna** (signs
  9–11, 0–2). Considered auspicious.
- **दक्षिणायन** (*dakṣiṇāyana*) — the southward half, Sun in **Karka … Dhanu**.

So the ayana is a one-line lookup on the Sun's sign:

```ts
// src/lib/panchanga/ayana.ts
export function ayanaFromSunSiderealSign(sign): 'uttarayana' | 'dakshinayana'
```

(The word *ayana* is the same root as in *ayanāṁśa* — "the portion of the ayana"
— and in *ayana-calana*, precession. The vocabulary rewards a second look.)

---

## 3. ऋतु — the six seasons

India's year has **six** ऋतु (*ṛtu*, seasons), two lunar-ish months each, again
read straight off the Sun's sign:

```
Vasanta (spring) · Grīṣma (summer) · Varṣā (monsoon) ·
Śarad (autumn) · Hemanta (pre-winter) · Śiśira (winter)
```

```ts
// src/lib/panchanga/ritu.ts
export function rituFromSunSiderealSign(sign): Ritu   // 2 signs → 1 ṛtu
```

That a calendar carries *six* seasons, mapped to the monsoon-shaped Indian year
rather than the four of temperate Europe, is a small reminder that this is a
calendar grown from a specific land and sky.

---

## 4. संवत् — *which* year is it?

Finally, the **count**. India has several era systems running in parallel; the
project computes the common ones:

- **विक्रम संवत्** (*Vikrama Saṁvat*) — epoch 57 BCE, so ≈ Gregorian + 57.
  (2024 CE ≈ VS 2081.)
- **शक संवत्** (*Śaka Saṁvat*) — epoch 78 CE, the basis of India's *national*
  calendar; ≈ Gregorian − 78.
- **कलियुग** (*Kali Yuga*) — epoch 3102 BCE.

The bookkeeping wrinkle: the year-count rolls over not on 1 January but at a
**calendrical new year** (e.g. Caitra Śukla Pratipada — *Ugādi/Gudi Padwa*), and
the two saṁvats step at slightly different points, so the offset from the
Gregorian year depends on *where in the lunar year* you are. `computeSamvat`
threads that:

```ts
// src/lib/panchanga/samvat.ts
export function computeSamvat(...)   // Vikrama, Śaka, Kali — accounting for the new-year rollover
```

---

## 5. For any place and time

Every quantity here is a function of **the Sun's sidereal longitude** (plus the
month rollover for the saṁvat). The Sun's longitude is range-free (Lesson 3) and
the ayanāṁśa polynomial is range-free (Lesson 4), so seasons, ayana, saṅkrāntis,
and era-counts all compute uniformly across centuries. They're also essentially
location-independent — only the *civil date* of a saṅkrānti can shift by time
zone, and the sunset rule above by location.

---

## Caveats worth knowing

- **Saṅkrānti civil date vs instant.** The transit is a global instant; its
  *observed date* uses a sunset cut-off (and thus a location). Both are computed;
  don't conflate them.
- **Regional new-year variation.** Different regions start the saṁvat at
  different festivals (Caitra Pratipada, Kārtika, etc.). The project uses the
  mainstream rollover; this is a *convention*, flagged as such.

## The code
- `src/lib/panchanga/samvat.ts`, `ritu.ts`, `ayana.ts`; saṅkrānti in
  `tiebreakers.ts` (`findSankrantiTransitJD`, `sankrantiInto`).
- `tests/unit/samvat.test.ts`, `ayana-ritu.test.ts`.

---
*Next: [Lesson 11 · Festivals](./11-festivals.md) — assembling everything into
the dates on the wall calendar, and an honest map of what's a fact and what's a
convention.*
</content>
