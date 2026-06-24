# Lesson 4 · Precession and the अयनांश

*Prerequisites: [Lesson 2](./02-the-sky.md) (the two origins for longitude),
[Lesson 3](./03-sun-and-moon.md) (we have tropical λ).*

In Lesson 3 we computed λ☉ and λ☽ as **tropical** (सायन, *sāyana*) longitudes —
measured from the vernal equinox. Hindu astronomy measures from the **fixed
stars** instead — **निरयन** (*nirayana*, "sidereal"). This lesson explains why
the two disagree, by how much, and the single correction that converts between
them: the **अयनांश** (*ayanāṁśa*). It also tells the field's most quietly
contentious story honestly, because this project made a deliberate choice there.

---

## 1. The slipping zero: precession (अयन-चलन)

The vernal equinox — our tropical zero — is **not** a fixed point among the
stars. The Earth's axis sweeps a slow cone (like a wobbling top), one circuit
every **~25,800 years**. As the axis turns, the equator turns with it, and the
equinox (where ecliptic meets equator) slides **backwards** along the ecliptic
at about **50.3 arc-seconds per year** ≈ 1° every 72 years. This is **precession**
(अयन-चलन, *ayana-calana*, "the shifting of the solstice").

```
         the stars (fixed)        ★ Citrā/Spica ★
   ──────────────────────────────────────────────────► λ
        ▲                          ▲
   sidereal 0°               tropical 0° (the equinox)
   (fixed in stars)           ← slides this way ~50.3″/yr
                              └──── ayanāṁśa ────┘  (the gap, ~24° today)
```

- **Tropical** longitude is tied to the **seasons** (the equinox *is* the start
  of spring). Great for agriculture; bad for "which star is the Moon near,"
  because the zero keeps moving.
- **Sidereal** longitude is tied to the **stars**. The nakṣatras and rāśis are
  star patterns, so Hindu astronomy fixes the zodiac to them.

Around **300 CE** the two zeros coincided (24° ÷ 50.3″/yr ≈ 1,700 years ago) —
which is why the Western tropical sign "Aries" and the constellation Aries once
matched. Since then the equinox has crept ~24° away, and that 24°-and-growing gap
is the ayanāṁśa.

---

## 2. The ayanāṁśa: one number, one subtraction

The ayanāṁśa is the angular gap between the tropical and sidereal zeros at a
given time. Convert by subtracting it:

```
λ_sidereal  =  λ_tropical  −  ayanāṁśa(time)
```

Because the gap grows with precession, the ayanāṁśa is a function of time — a
constant *base* at J2000 plus the precession accumulated since:

```ts
// src/lib/astro/ayanamsa.ts
export function ayanamsa(jd, system = 'lahiri'): number {
  const T = (jd - JD_J2000) / 36525;                 // Julian centuries since J2000
  const arcsec = 5028.796195 * T + 1.1054348 * T*T;  // IAU-2006 precession in longitude
  return baseDegreesAtJ2000 + arcsec / 3600;         // base + accumulated drift
}
```

The linear term (5028.8″/century ≈ 50.3″/yr) is the precession rate; the tiny
quadratic is the IAU-2006 refinement (~1″ at ±100 yr — a free accuracy win across
long-range queries). `siderealFromTropical` wraps the subtraction with a
0–360° normalisation.

**Worked number.** At 2025-01-01, T ≈ 0.25, so arcsec ≈ 1257 ≈ 0.349°, giving
ayanāṁśa ≈ 23.857 + 0.349 ≈ **24.206°**. A planet at tropical 24.206° sits at
sidereal 0° — the very start of Meṣa (Aries).

---

## 3. Which "Lahiri"? — the honest story

The default ayanāṁśa is **Lahiri** (also *Citrā-pakṣa*), the standard adopted by
India's 1956 Calendar Reform Committee and used by the Indian Astronomical
Ephemeris. You'd think a "standard" pins one number. It doesn't — and this is the
kind of thing the course promised to be straight about.

"Lahiri" has **several numerical realisations within ~0.6′** of each other,
depending on the exact precession model and epoch a given implementation uses.
Three you'll meet:

| Source | Lahiri realisation |
| --- | --- |
| Swiss Ephemeris `SE_SIDM_LAHIRI` (the official IAE realisation) | **23.857° at J2000** — what we use |
| drikpanchang.com (computational) | runs **≈ +0.40′ higher** than ours (≈ 24.213° in 2025) |
| some "true Citrā" tables | ~23.853° at J2000 |

This project anchors to **23.85709° = Swiss Ephemeris's value** — the one
astro.com, Jagannatha Hora, and ProKerala compute, verified directly with
`pyswisseph`. We deliberately **do not** match drikpanchang.com here, even though
it's the most popular site, because that 0.40′ is a measurable bias away from the
independent standard. It's the same accuracy-first choice the project makes for
the ascendant ([Lesson 12](./12-jyotish.md)).

**How much does the 0.40′ actually matter?** Almost nothing: it shifts every
sidereal position by 0.40′, which moves a nakṣatra or yoga *end-time* by ~45
seconds and changes a *displayed* nakṣatra/sign only in the rare case a body sits
within 0.40′ of a boundary. But "almost nothing" is not "nothing," so we pick the
defensible value and document the gap rather than fudge it. (The full reasoning,
including two earlier *wrong* values that must never be restored, is in the long
comment atop `astro/ayanamsa.ts`.)

**Raman** (B.V. Raman school, ~1.4° behind Lahiri) is offered as the one
alternative — a different `base` in the same formula, and the only one that
meaningfully changes a chart. We *used* to offer **KP** (Lahiri − 6′),
**Yukteshwar** and **True Citrā** too, but dropped them: KP and True-Citrā
(Lahiri − 1′) are visually identical to Lahiri, Yukteshwar is a twin of Raman,
and KP's real machinery (its sub-lord system) isn't implemented here anyway. So
the menu is just the two that actually produce different charts.

---

## 4. When you need this, and when you blessedly don't

The ayanāṁśa is needed by everything defined on an *absolute* sidereal position:

- **Nakṣatra** (from λ☽) and **Yoga** (from λ☉ + λ☽) — Lessons 5, 7.
- **Rāśi**, the month's name, sankrānti, and the entire **kundli** — Lessons 5,
  9, 10, 12.

But it is **not** needed for anything defined on a *difference* of longitudes,
because the offset cancels: (λ☽ − a) − (λ☉ − a) = λ☽ − λ☉. So **tithi and
karaṇa are ayanāṁśa-free** ([Lesson 6](./06-tithi.md) proves it). This split —
who needs the ayanāṁśa and who doesn't — is one of the most clarifying facts in
the whole calendar, and it falls straight out of "is this a position or a
difference?"

---

## Caveats worth knowing

- **The ayanāṁśa is a model, not a measurement.** Different traditions genuinely
  disagree at the arc-minute level; there is no single "true" value, only
  well-defined conventions. We expose the choice and default to the most widely
  validated one.
- **Sub-arc-minute precision here is below practical significance** for a
  calendar — but it is *not* below the precision people compare at, so we still
  get it as right and as transparent as we can.

## The code
- `src/lib/astro/ayanamsa.ts` — `ayanamsa`, `siderealFromTropical`, the
  per-system coefficient table, and the long provenance comment.
- `tests/unit/ayanamsa.test.ts` — golden values vs Swiss Ephemeris, 1900–2100.

---
*Next: [Lesson 5 · नक्षत्र and राशि](./05-nakshatra-and-rashi.md) — now that we
can place a body on the *sidereal* circle, we slice that circle into the Moon's
27 mansions and the zodiac's 12 signs.*
</content>
