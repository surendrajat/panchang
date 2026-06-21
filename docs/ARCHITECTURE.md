# Architecture

A description of the app as it is shipped. To *learn* the astronomy and calendar
maths from scratch, read the tutorial in [`guide/`](./guide/) — that is the
primary teaching source. For a terse reference of the formulas and their
provenance see [`METHODOLOGY.md`](./METHODOLOGY.md) (panchanga) and
[`METHODOLOGY_JYOTISH.md`](./METHODOLOGY_JYOTISH.md) (kundli).

## What it is

A static, installable **PWA** — Svelte 5 (runes) + Vite + TypeScript. It computes
a daily **panchanga**, a lunar **month** calendar, a **festival** list, a birth
chart (**Kundli**) with guna-milan matching, and an experimental **Sky** view —
entirely **on-device**, for any bundled city or GPS point, in English/हिन्दी with
Latin or Devanagari numerals.

Two runtime dependencies only: **`astronomy-engine`** (ephemeris) and **`dexie`**
(IndexedDB). No backend, no telemetry, no remote fonts. AGPL-3.0.

## Principles

- **Pure compute, isolated I/O.** The calculation layers are pure functions of
  `(instant, location, options)`. Caching and persistence live in the storage
  layer, never inside the math.
- **One swappable astronomy backend.** Everything reads positions through
  `lib/astro`; swapping `ephemeris.ts` + `ayanamsa.ts` would change the engine
  without touching anything above.
- **Sidereal by default**, sunrise-anchored civil days, ayanamsa applied once at
  the boundary — see Conventions.
- **Data-driven i18n**, not branch-driven: a language is a table of strings, not
  a fork in the code.
- **Accuracy honesty**: validate against Drik or label "preview"; never widen a
  tolerance to hide a disagreement (see Accuracy).

## Layers

```
lib/astro/        julian · ephemeris (Sun/Moon/planets/nodes) · ayanamsa ·
                  sunrise · altaz · angle · bisect            ← swappable backend
  ↓                                   ↓
lib/panchanga/                    lib/jyotish/
  tithi nakshatra yoga karana       grahas · lagna · chart (+ houses) ·
  vara masa samvat ritu ayana       dasha (Vimshottari) · divisional (navamsa) ·
  muhurta moon-phase tiebreakers    matching (ashtakoota) · sky-math · names
  festivals/
  ↓                                   ↓
routes/ + components/   Day Month Festivals Kundli Match Sky Settings
lib/state/  (runes)     preferences · clock · jyotish-draft · sw-update
lib/storage/ (Dexie)    db · cache · birth-profiles · saved-locations · preferences
lib/i18n/ + lib/format/ en/hi + names + transliteration · numerals · time
lib/location/           cities (curated metros + diaspora) · GPS
```

### `lib/astro` — the backend seam
`julian.ts` (instants, civil-midnight fixpoint that survives DST/extreme offsets),
`ephemeris.ts` (the adapter over `astronomy-engine`: Sun, Moon, the five visible
planets, true node, obliquity, sidereal time — EQJ vectors rotated to
ecliptic-of-date), `ayanamsa.ts` (IAU-2006 precession; Lahiri/KP/Raman/
Yukteshwar/True-Chitra, anchored to Drik's *computational* values), `sunrise.ts`,
`altaz.ts` (horizontal coords + rise/set arcs for the Sky dome), `angle.ts`,
`bisect.ts` (angular-crossing root-finder for anga end-times).

### `lib/panchanga` — the almanac
`compute.ts` exposes the pure `computePanchanga()`; one file per anga, plus masa
(with adhik-maas), samvat, ritu, ayana, muhurta, moon-phase. `festivals/` holds
the rule set (`pan-india.ts` + `rules.ts`); `tiebreakers.ts` (one level up, in
`panchanga/`) is the vyapini-window / tie-break engine — the single place
complexity concentrates and the highest-risk file.

### `lib/jyotish` — the birth chart
Pure arithmetic on top of the same astro backend: `grahas.ts` (sidereal graha
longitudes), `lagna.ts` (ascendant from sidereal time), `chart.ts` (whole-sign
houses), `dasha.ts` (Vimshottari from Moon nakshatra), `divisional.ts` (navamsa),
`matching.ts` (ashtakoota guna-milan from two charts), `names.ts`, `glyphs.ts`,
`rashi-art.ts`. `sky-math.ts` backs the Sky view.

### Presentation
Hash-routed pages in `routes/` (no router dependency) render components in
`components/` (`DayCard`, `MonthGrid`, `KundliChart`, `MoonPhase`, `BodyIcon`,
`LocationPicker`, …). Kundli/Match/Sky are lazy-loaded. `festivals.worker.ts`
computes the year's festival list off the main thread (postMessage requires
`$state.snapshot()` of the location — `$state` proxies don't structured-clone).

### State & storage
`lib/state/*.svelte.ts` are runes stores — `preferences` (language, numerals,
ayanamsa, node type, month system, week start, location, theme), `clock`,
`jyotish-draft`, `sw-update`. `lib/storage` is Dexie (versioned schema, currently
**v3**) with a compute `cache`, `cachedFestivals`, `birthProfiles`, and
saved-locations/preferences mirrors.

### i18n & format
`lib/i18n` is two string tables (`en.ts`/`hi.ts`) plus `names.ts`/`names-hi.ts`
for the Sanskrit name sets, driven by a per-language `META` table. A
**transliteration** preference swaps grahas/rashis between Sanskrit (Mesha,
Maṅgala) and Western (Aries, Mars); tithi/nakshatra/yoga/festival names stay
Sanskrit in both. `lib/format` handles numerals (Devanagari/Latin) and time.

## Routes (hash-based)

| Hash | Page |
|---|---|
| `#/` or `#/today` | Today (rendered by `Day.svelte` with today's date) |
| `#/day/YYYY-MM-DD` | Day detail (same component) |
| `#/month/YYYY-MM` | Month calendar |
| `#/festivals/YYYY` | Festival list |
| `#/kundli` | Birth chart |
| `#/match` | Legacy alias → redirects to `#/kundli` (Milan is a section inside Kundli) |
| `#/sky` | Sky view (experimental) |
| `#/settings` | Settings |

## Data flow

`preferences` (runes) → a route reads the instant + location + options → calls a
pure `compute*()` → the storage layer memoizes the result → the component renders.
Changing a preference re-runs the affected deriveds; nothing writes preferences
during render. The Sky view runs a self-throttled rAF (idle 1 Hz at rest, ~30 fps
while scrubbing time) and tears it down on unmount.

## Conventions

- **Sidereal** longitudes everywhere; the ayanamsa is subtracted once at the
  boundary, never baked into the ephemeris.
- **Civil days are sunrise-anchored** (vara, and the day a tithi "belongs to");
  festival walks re-anchor per civil day rather than adding 86.4 M ms.
- **Defaults** (`storage/db.ts`): purnimanta month system, true node (Rahu/Ketu),
  transliteration on, Lahiri ayanamsa.
- **End times** come from `bisect.ts` angular bisection, not linear interpolation.

## Build, test, deploy

- `pnpm dev` (Vite, port 5173) · `pnpm build` (static bundle + `vite-plugin-pwa`
  service worker) · `pnpm test` (Vitest) · `pnpm run lint` — the one gate:
  `tsc --noEmit` + `svelte-check` + ESLint (typescript-eslint + svelte a11y).
- Output is fully static and offline-capable; deploy anywhere that serves files.
- Node pinned via `.nvmrc` and `package.json` (`engines`/`volta`).

## Accuracy & testing

Formulas are sourced and fixture-tested (sunrise/sunset, anga end-times, a
multi-year New Delhi festival audit, a multi-city smoke, polar/DST regressions).
Known gaps are named, not hidden (e.g. strict moonrise/moonset coverage). The
rule: anything not proven against a reference is labelled a preview, and
tolerances are never loosened to manufacture agreement.

---

*Historical note: the original 800-line pre-implementation build spec is in git
history (before this rewrite) if the early design rationale is ever needed.*
