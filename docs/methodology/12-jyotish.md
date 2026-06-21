# Lesson 12 · कुण्डली — the birth chart

*Prerequisites: Lessons [3](./03-sun-and-moon.md) (planet longitudes),
[4](./04-precession-and-ayanamsa.md) (sidereal), [5](./05-nakshatra-and-rashi.md)
(rāśi, nakṣatra), [2](./02-the-sky.md) (sidereal time, the horizon).*

A **कुण्डली** (*kuṇḍalī*, birth chart) is not a new subject — it is the entire
course **frozen at one instant**: the moment and place of a birth. Everything you
need you already have. This lesson assembles the pieces and is, as ever, honest
about where a number is geometry and where it's tradition. (The standalone
reference, with all the validation numbers, is
[docs/METHODOLOGY_JYOTISH.md](../METHODOLOGY_JYOTISH.md); this is the *teaching*
version.)

---

## 1. ग्रह — the nine "planets," as sidereal longitudes

The chart's bodies are the **नवग्रह** (*navagraha*, nine grahas): Sūrya, Candra,
Maṅgala (Mars), Budha (Mercury), Guru (Jupiter), Śukra (Venus), Śani (Saturn),
and the two **lunar nodes** Rāhu and Ketu. Seven are just `bodyLongitudeAtJD`
(Lesson 3) made sidereal (Lesson 4):

```ts
// src/lib/jyotish/grahas.ts
grahaSiderealLongitude(key, jd, 'lahiri', nodeType)   // tropical λ − ayanāṁśa
```

**Rāhu and Ketu** aren't bodies — they're the two points where the Moon's orbit
crosses the ecliptic (always 180° apart). The project offers both the **mean**
node (a smooth average) and the **true** (osculating) node, the latter computed
from the Moon's instantaneous orbital state vector and verified against Swiss
Ephemeris's `SE_TRUE_NODE` to under an arc-minute. Each graha's rāśi and nakṣatra
then come straight from Lesson 5.

---

## 2. लग्न — the ascendant (where location and time fuse)

The **लग्न** (*lagna*, ascendant) is the rāśi **rising on the eastern horizon** at
the birth instant and place. It is the one chart quantity that needs *both* the
moment (via sidereal time, Lesson 2) and the latitude — the fusion the whole
course has been building toward:

```
RAMC  = local sidereal time as an angle           (Lesson 2)
λ_asc = atan2( cos RAMC ,  −(sin RAMC · cos ε + tan φ · sin ε) )   then − ayanāṁśa
        where ε = obliquity of the ecliptic, φ = latitude
```

```ts
// src/lib/jyotish/lagna.ts
export function computeLagna(instant, location, 'lahiri'): Lagna
```

**The honesty flag (important).** Calculators *agree* on the grahas but *disagree*
on the lagna, because some use the geometric rising point and some apply a
"local mean time" longitude scaling. This project computes the **geometrically
correct** rising point — which is the Government-of-India / Indian Astronomical
Ephemeris standard, and what Swiss Ephemeris (`swe_houses`), astro.com, Jagannatha
Hora, and ProKerala all produce. **drikpanchang.com is the outlier here** (its
lagna differs by up to ~13′, sign-flipping across hemispheres). So for the
ascendant we deliberately **do not** match Drik — we match the independent
standard, proven against `pyswisseph` and live ProKerala, and pinned in
`tests/regression/kundli-vs-drik.test.ts`. (We also use the *true* obliquity ε,
including nutation, which lands us within ~0.24′ of Swiss Ephemeris everywhere.)

---

## 3. भाव — the twelve houses

The **भाव** (*bhāva*, houses) are twelve life-domains laid over the chart. The
project uses **whole-sign** houses (the oldest, simplest scheme): the lagna's rāśi
*is* the 1st house, the next sign the 2nd, and so on. So a graha's house is just
arithmetic on rāśi numbers:

```
house =  ((graha.rāśi − lagna.rāśi + 12) mod 12) + 1
```

No extra astronomy — houses are bookkeeping on the rāśis of §1–2.

---

## 4. दशा — the Vimśottarī timeline

**Vimśottarī Daśā** is a 120-year cycle that assigns each period of life to a
ruling graha — and it springs entirely from **the Moon's nakṣatra at birth**
(Lesson 5). The nakṣatra's lord starts the sequence; its nine lords (Ketu 7,
Śukra 20, Sūrya 6, … Budha 17 years) sum to 120. How far the Moon is *through* its
nakṣatra sets how much of the first period is already spent.

```ts
// src/lib/jyotish/dasha.ts
vimshottariMahadashas(birthInstant, moonSiderealLongitude)   // the dated periods
```

This is the clearest illustration of the chart's nature: a *timeline* unrolled
from one number — the Moon's position — that we have known how to compute since
Lesson 3.

---

## 5. नवांश and मिलन — divisions and matching

- **नवांश** (*navāṁśa*, the D9 chart) subdivides each rāśi into nine, mapping the
  108 parts cyclically back onto the signs — the floor-division of
  [Lesson 5](./05-nakshatra-and-rashi.md) at finer grain (`navamsaSign`).
- **मिलन** (*milan*, compatibility) — *Aṣṭakūṭa Guṇa Milan* scores two charts out
  of 36 across eight kūṭas (Varṇa, Vaśya, … Nāḍī), all driven by the two Moons'
  nakṣatras and rāśis. The tables are transcribed verbatim from the classical
  *Sāravalī* (`jyotish/matching.ts`); the project implements the *arithmetic*
  faithfully and stays out of interpretation.

---

## 6. For any place and time — and what it *is*

A kuṇḍalī is, mechanically, **a timestamp of the sky**: the configuration of Sun,
Moon, and planets over a specific point on Earth at a specific instant. Every
number in it is a fact computable from Lessons 1–5 — accurate for any birth from
1500 to 2500, anywhere on the globe, offline. What those facts *mean* is outside
the scope of code, and the project keeps that boundary clean: it computes the
astronomy rigorously (and validates it against Swiss Ephemeris), reproduces the
classical rule-tables exactly, and makes no claim beyond them.

---

## Caveats worth knowing

- **The lagna is the contested value** — we match the independent standard, not
  the most popular website; this is the opposite trade-off from the *festival*
  ayanāṁśa (Lesson 4, 11), and both are deliberate and documented.
- **Mean vs true node, ayanāṁśa choice** — exposed as options; defaults match the
  validated mainstream, differences are sub-arc-minute.
- **Interpretation is not modelled** — daśā predictions, yoga readings, and the
  *meaning* of a guṇa score are human traditions; the engine gives you the
  correct inputs and stops there.

## The code
- `src/lib/jyotish/` — `grahas.ts`, `lagna.ts`, `dasha.ts`, `chart.ts`,
  `divisional.ts`, `matching.ts`, `names.ts`.
- `tests/regression/kundli-vs-swisseph.test.ts`, `kundli-vs-drik.test.ts`;
  `tests/reference/gen_swisseph.py`.

---
*That's the course. Back to the [README](./README.md) for the map, or the
[glossary](./glossary.md) for any term. You now have the whole chain — from a
Julian Day to a birth chart — and the code that does each step.*
</content>
