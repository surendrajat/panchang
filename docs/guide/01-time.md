# Lesson 1 · Keeping time — the Julian Day

*Prerequisites: none. This is the foundation everything else stands on.*

Before we can ask "where is the Moon?", we must answer "**when**?" — and answer
it in a way a computer (and an astronomer) can use. This lesson builds the single
number that names an instant unambiguously. It is the least glamorous lesson and
the most important: every other calculation in the project begins by turning a
date into this number.

---

## 1. Why civil time is the wrong tool for astronomy

"15 August 1990, 5:00 in the morning" is ambiguous and awkward:

- **Ambiguous** — 5 a.m. *where*? Delhi and New York are 10½ hours apart. The
  Moon doesn't care about time zones; it has one position at one physical
  instant.
- **Awkward to compute with** — months have 28–31 days, years have 365 or 366,
  and the Gregorian calendar even *skipped 10 days* in 1582. You cannot easily
  ask "how many days between these two dates?" — and "how many days" is exactly
  what orbital motion depends on.

So astronomers use a **continuous count of days** from a fixed origin, with the
time-of-day as a fraction. No months, no leap years, no zones — just a real
number that always increases.

> **The Hindu tradition did exactly the same thing.** The *Sūrya Siddhānta*
> computes planetary positions from the **अहर्गण** (*ahargaṇa*, "heap of days")
> — the number of days elapsed since its epoch. The Julian Day below is the same
> idea with a different zero point. You are not learning a foreign concept; you
> are learning the modern spelling of a very old one.

---

## 2. The Julian Day (JD)

The **Julian Day number** is the count of days since noon on **1 January 4713
BCE** (a deliberately ancient origin so every historical date is positive). The
*fraction* is the time since the previous noon.

```
JD = (whole days since the epoch) + (fraction of a day since noon UT)
```

Two reference values you'll see constantly:

- **JD 2440587.5** = 1970-01-01 00:00 UT (the Unix epoch) — the bridge between a
  JavaScript `Date` (milliseconds since 1970) and JD.
- **JD 2451545.0** = 2000-01-01 12:00 UT, called **J2000.0**. Modern ephemeris
  and precession formulas are written as polynomials in *time since J2000*, so
  this constant appears in nearly every astronomical expression.

Converting a `Date` to JD is therefore just unit arithmetic from the Unix epoch:

```ts
// src/lib/astro/julian.ts
export function dateToJulian(date: Date): number {
  return date.getTime() / MS_PER_DAY + JD_UNIX_EPOCH; // ms→days, then add the 1970 offset
}
```

That's the whole conversion. `JD_UNIX_EPOCH = 2440587.5`, `MS_PER_DAY =
86_400_000`. The inverse, `julianToDate`, runs it backwards. Because a JD is just
a number of days, **time differences are subtractions** and **"T centuries since
J2000" is `(jd − 2451545) / 36525`** — the form precession and ephemeris series
want (you'll meet it in Lessons 3 and 4 as `julianCenturiesSinceJ2000`).

---

## 3. Universal Time vs the clock on the wall

JD is tied to **Universal Time (UT)** — essentially the time at Greenwich
(longitude 0°), which is what astronomy is referenced to. But a calendar is for
*people*, and people read a **civil clock** in a **time zone**.

So the project keeps a clean split:

- **All physics is done in UT / JD** — the Sun, Moon, tithi end-times, sunrise
  instants. These are facts about the universe, independent of where you stand.
- **Only at the edges** do we convert to a civil date in a named zone for
  display — and to decide *which civil day* an event falls on.

That edge conversion is genuinely fiddly (zones shift, some have half-hour
offsets like India's +05:30, many observe daylight saving), so it is isolated
into a few helpers:

```ts
// src/lib/astro/julian.ts
civilMidnightInZone(date, 'Asia/Kolkata')              // local 00:00 of that civil day → an instant
civilTimeInZone(2026, 6, 23, 'Asia/Kolkata', 12, 0)    // a local wall-clock time → the UTC instant
civilYMDInZone(date, 'America/New_York')               // an instant → the local {year, month, day}
```

These use the platform's IANA time-zone database (via `Intl`), so they're
correct for any zone and any DST rule without us hard-coding offsets.

> **Why this matters for the calendar.** "Diwali is on the day of the new moon"
> needs a *civil day* — but the new moon is a UT *instant*. The same instant can
> be 23:30 on the 4th in Delhi and 13:00 on the 4th in New York, or even land on
> different calendar days. Getting the day right for *your* location is entirely
> this zone-conversion step; the astronomy underneath is identical for everyone.

---

## 4. For any place and time

Notice what this lesson bought us: a representation of "when" that is

- **universal** — one JD = one physical instant, the same for all observers;
- **uniform** — no months or leap years to special-case; arithmetic just works;
- **range-free** — 1500 CE or 2500 CE are just different numbers, so the whole
  project works across centuries with no boundary cases.

Every later lesson starts the same way: take the moment in question, call
`dateToJulian`, and hand the JD to the astronomy. Location enters *only* through
two doors — the time-zone conversion here (which civil day), and the observer's
latitude/longitude in [Lesson 8](./08-the-day.md) (sunrise) and
[Lesson 2](./02-the-sky.md) (sidereal time).

---

## Caveats worth knowing

- **UT vs TT.** Ultra-precise work distinguishes Universal Time from Terrestrial
  Time (they differ by ΔT ≈ 70 s today, growing historically). `astronomy-engine`
  handles ΔT internally, so we pass civil instants and let it do the right
  thing; you only need to know the distinction exists.
- **A JD day starts at noon, not midnight** (the `.5` in 2451545**.5** for
  midnight). It's a historical convention so a single night's observations share
  one integer day. Harmless once you know it.

## The code
- `src/lib/astro/julian.ts` — `dateToJulian`, `julianToDate`,
  `julianCenturiesSinceJ2000`, `civilMidnightInZone`, `civilTimeInZone`,
  `civilYMDInZone`, and the constants `JD_J2000`, `JD_UNIX_EPOCH`.
- `tests/unit/julian.test.ts`, `tests/unit/civil-timezones.test.ts`.

---
*Next: [Lesson 2 · The sky](./02-the-sky.md) — now that we can name an instant,
we set up the coordinate system in which the Sun and Moon have a "position."*
</content>
