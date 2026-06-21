# Lesson 2 · The sky — the ecliptic and where a "position" lives

*Prerequisites: [Lesson 1](./01-time.md) (we can now name an instant).*

We keep saying "the Sun's longitude" and "the Moon's longitude." This lesson
explains what that angle actually is — the coordinate system Hindu astronomy
measures everything in — and introduces one more clock, **sidereal time**, that
we'll need the moment we ask "what is rising on the horizon?"

---

## 1. The celestial sphere: pretend the stars are painted on a dome

Stand outside and the stars look stuck to the inside of a giant sphere with you
at the centre. That picture is wrong about distance but *perfect* for direction —
and direction is all a calendar needs. So we model the sky as a sphere and give
every point on it two angular coordinates, exactly like latitude/longitude on
Earth.

The question is only: **which equator do we measure from?** There are two
natural choices, and Hindu astronomy makes the less obvious — and better — one.

---

## 2. The ecliptic (क्रान्तिवृत्त) — the highway of the solar system

The Sun, Moon, and planets do **not** wander all over the sky. They stay within
a narrow band, because the planets orbit in nearly the same plane. The centre
line of that band — the Sun's apparent yearly path against the stars — is the
**ecliptic** (क्रान्तिवृत्त, *krāntivṛtta*).

```
                 ecliptic (the Sun's yearly path) — everything lives near here
        · · · ☉ · · · · · · · · ☽ · · · · · · ♂ · · · ·
      ─────────────────────────────────────────────────  ← the band (the zodiac)
        · · · · · · · · · · · · · · · · · · · · · · · ·
```

Because the Sun and Moon hug this line, their position is captured almost
entirely by **one** number: how far along the ecliptic they are. That number is
the **ecliptic longitude**, λ, measured 0°→360° around the circle. (There's a
second tiny coordinate, ecliptic *latitude*, for how far off the centre line —
nonzero only for the Moon and planets, and we mostly ignore it.)

This is the deep reason the calendar is *simple*: a 2-D sky problem collapses to
**a few angles on a circle**. The zodiac you've heard of is just this circle, and
its twelve signs (राशि, *rāśi*) are twelve 30° arcs of it — [Lesson 5](./05-nakshatra-and-rashi.md).

> **Why the ecliptic and not the equator?** The other natural reference is the
> Earth's equator projected onto the sky (the *equatorial* system, with
> coordinates right-ascension and declination — what telescopes use). But the
> Sun and Moon drift across the equator through the year, so their equatorial
> coordinates are messy. On the ecliptic they move almost along one axis. Hindu
> astronomy chose the ecliptic millennia ago; we follow it. (We still *touch*
> the equatorial system in Lesson 3, because ephemeris models compute there
> first and then rotate onto the ecliptic.)

---

## 3. Where is 0°? — the equinox, and a wrinkle for later

Longitude needs an origin. The natural one is the **vernal equinox**: the point
where the Sun crosses the equator going north (around 21 March), i.e. where the
ecliptic and the equator intersect. Measuring λ from there gives the **tropical**
(सायन, *sāyana*) longitude — "tropical" because it's tied to the seasons.

Here is the wrinkle that all of [Lesson 4](./04-precession-and-ayanamsa.md) is
about: that equinox point **slowly slides** around the ecliptic (one lap every
~25,800 years). So "longitude from the equinox" drifts against the actual stars.
Hindu astronomy wants longitude from the **fixed stars** (निरयन, *nirayana*,
"sidereal"). The constant offset between the two is the **अयनांश** (*ayanāṁśa*).
For now just hold the thought: *there are two zeros, and we'll convert between
them later.*

---

## 4. Sidereal time — the Earth's spin, measured against the stars

Longitude tells you *where on the ecliptic* a body is. But to ask **"what is on
the eastern horizon right now?"** — which we need for the ascendant (लग्न,
[Lesson 12](./12-jyotish.md)) and indirectly for sunrise — you also need to know
**how far the Earth has turned**. That's **sidereal time**.

A normal (solar) day, 24 h, is one spin of the Earth *relative to the Sun*. But
the Sun itself crept ~1° along the ecliptic during the day, so relative to the
**stars** the Earth completes a turn about 4 minutes *sooner*. That star-relative
rotation is the **sidereal day** (~23 h 56 m), and the angle it has reached is
**Greenwich Apparent Sidereal Time (GAST)** — effectively "which ecliptic
longitude is currently crossing the Greenwich meridian."

```ts
// src/lib/astro/ephemeris.ts
export function gastHoursAtJD(jd: number): number { /* … */ }  // 0–24 h
```

To make it **local**, add your longitude (east positive), converting 15° of
longitude per hour:

```
Local Sidereal Time  =  GAST  +  (observer longitude / 15)
```

This single line is where the *observer's east–west position* finally enters the
astronomy. (We'll use it directly in Lesson 12 to find the rising point, and it
underlies the geometry of sunrise in Lesson 8.) It is also a place where
implementations quietly differ — and where this project made a deliberate,
verified choice to match the gold-standard convention; that story is in
[Lesson 12](./12-jyotish.md).

---

## 5. For any place and time

You now have the full coordinate setup:

- a **circle** (the ecliptic) on which the Sun and Moon have a single angle λ;
- **two origins** for that angle (tropical and sidereal), bridged by the
  ayanāṁśa;
- **sidereal time**, which tells you how the rotating Earth is oriented under
  that circle at a given instant and longitude.

Everything from here is: compute λ☉ and λ☽ (Lesson 3), pick the right origin
(Lesson 4), and slice the circle (Lesson 5).

---

## Caveats worth knowing

- **Ecliptic *of date*.** The ecliptic plane itself shifts microscopically over
  centuries; "apparent ecliptic of date" means we use the plane as it is at the
  instant in question, not a frozen 2000.0 plane. Lesson 3 says why this matters
  for "apparent" positions.
- **"Apparent" vs "mean" sidereal time** differ by the *equation of the
  equinoxes* (a nutation term, < 1.2″ in time). We use **apparent** (GAST), which
  is the self-consistent choice once positions are apparent — a detail that
  turns out to matter at the arc-second level for the ascendant (Lesson 12).

## The code
- `src/lib/astro/ephemeris.ts` — `gastHoursAtJD` (sidereal time),
  `bodyLongitudeAtJD` (apparent ecliptic longitude, Lesson 3).
- `src/lib/astro/ayanamsa.ts` — the tropical↔sidereal bridge (Lesson 4).

---
*Next: [Lesson 3 · Sūrya and Candra](./03-sun-and-moon.md) — actually computing
λ☉ and λ☽, the two numbers the whole calendar runs on.*
</content>
