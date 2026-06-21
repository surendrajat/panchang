# Lesson 8 · The day and सूर्योदय (sunrise)

*Prerequisites: [Lesson 2](./02-the-sky.md) (horizon, sidereal time),
[Lesson 6](./06-tithi.md) (the tithi is a moving thing).*

So far we've computed *instants* — the moment a tithi or yoga ends. But a
calendar hangs things on **days**, and the Hindu day is not the midnight-to-
midnight day of the wall clock. It runs **सूर्योदय to सूर्योदय** (*sūryodaya*,
sunrise to sunrise). This lesson explains why that choice drives the whole
festival system, and how we compute sunrise accurately for any latitude — the
first place the *observer's own location* truly enters the physics.

---

## 1. The rule that organises everything: "the tithi at sunrise owns the day"

A tithi is a 20–26-hour thing that drifts across the civil clock (Lesson 6). A
festival, though, must land on **one calendar day**. The classical resolution is
beautifully simple:

> **The tithi prevailing at sunrise is the tithi of that day.**

Whatever tithi is running when the Sun comes up "owns" the whole day, even if it
ends at 9 a.m. and a different tithi fills the rest of the daylight. So "Rāma
Navamī = Caitra Śukla Navamī" really means *"the day at whose sunrise Navamī is
running."* The vāra (Lesson 7) works the same way — the weekday of the sunrise.

This is why sunrise is not a cosmetic timing in the corner of the page; it is the
**hinge** the calendar turns on. And it's why the kṣaya/vṛddhi cases of Lesson 6
are such a big deal: if a tithi touches *no* sunrise or *two* sunrises, this rule
needs a documented patch — the subject of [Lesson 11](./11-festivals.md).

```
   sunrise day:   ☀▁▁▁▁▁▁▁▁▁▁▁▁▁☀   ← the whole strip is "Tuesday, Navamī"
                  ↑ Navamī running here decides it
   civil day:        ▁▁▁▁│▁▁▁▁▁▁▁▁   (midnight boundary — irrelevant to the rule)
```

---

## 2. What "sunrise" precisely means (it isn't the geometric horizon)

Ask "when does the Sun rise?" and there are several defensible answers a few
minutes apart. The pañcāṅga (and this project) use the standard *visible* sunrise:
**the instant the Sun's upper edge first appears**, accounting for the atmosphere.
Two corrections move it away from the naïve "centre of the Sun at the horizon":

- **Atmospheric refraction** bends light over the horizon, lifting the Sun's
  apparent position by about **34′** — you see it before it's geometrically up.
- **The Sun's semidiameter** is about **16′**, and we want the *upper limb*, not
  the centre, to touch the horizon.

Together: sunrise is when the Sun's **centre is ~50′ (0.833°) below** the
geometric horizon. That −0.833° "sunrise altitude" is the standard the project
uses (via the library's rise/set search):

```ts
// src/lib/astro/sunrise.ts
export function sunRiseSet(location, date): { rise: Date | null; set: Date | null }
// finds when the Sun's apparent upper limb crosses the horizon for this
// latitude/longitude/altitude, refraction included — or null at the poles.
```

`moonRiseSet` does the same for the Moon (needed for the चन्द्रोदय,
moonrise-based, festivals like Karva Chauth in Lesson 11).

---

## 3. Here, finally, is where *your location* enters

Sunrise depends on **where you stand** — latitude sets how steeply the Sun climbs,
longitude sets the clock time, altitude nudges it slightly. This is the first
genuinely *observer-dependent* quantity in the course (the longitudes of Lesson 3
were the same for everyone). So `sunRiseSet` takes a full `location`
(lat, lon, altitude, IANA time zone), and from here on the calendar is **local**:
two cities can have different tithi *days* for the same festival because their
sunrises fall on opposite sides of a tithi boundary.

That is not a bug; it's the correct behaviour — and it's exactly why an offline
app must carry a city database and compute sunrise on-device rather than fetch a
fixed table.

---

## 4. How accurate, and how we know

Sunrise is **ayanāṁśa-independent** (it's pure Sun-vs-horizon geometry), so it
isolates the rise/set model cleanly. We pin it to the **Swiss Ephemeris**:

- `tests/regression/panchanga-vs-swisseph.test.ts` checks sunrise for Delhi,
  Bengaluru, New York, and London and requires agreement within **30 seconds**
  (measured: 6–23 s — the small residual is differing refraction models, not
  error).

Because the festival day depends on *which side of sunrise* a tithi boundary
falls, this tens-of-seconds accuracy is what keeps festival dates correct across
locations.

---

## Caveats worth knowing

- **Polar latitudes.** Above the Arctic/Antarctic circles the Sun may not rise or
  set for days. `sunRiseSet` returns `null`, and the calendar degrades gracefully
  rather than inventing a sunrise. The DST/zone walking around this is tested in
  `tests/regression/polar-dst.test.ts`.
- **Convention choices live here, not in the physics.** "Upper limb + refraction"
  is the mainstream choice (it matches Drik Panchang); some traditions use the
  Sun's centre or a different refraction. We document the choice; the *machinery*
  would compute any of them.
- **A small, honest offset.** Our sunrises run a few seconds later than Swiss
  Ephemeris's (the refraction model). It's far inside tolerance, but we report it
  rather than hide it.

## The code
- `src/lib/astro/sunrise.ts` — `sunRiseSet`, `moonRiseSet`, `sunriseOnDay`,
  `sunsetOnDay`.
- `tests/regression/panchanga-vs-swisseph.test.ts`, `tests/unit/sunrise.test.ts`.

---
*Next: [Lesson 9 · मास](./09-masa.md) — stacking lunar months into a year, and
the leap and lost months that keep the Moon's calendar locked to the Sun's.*
</content>
