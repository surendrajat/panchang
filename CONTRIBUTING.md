# Contributing

Thanks for considering a contribution! A few principles before the
mechanics.

## Principles

1. **Correctness first**. If your change can affect a computed value, a
   regression test must accompany it. See `tests/fixtures/drik-panchang/`
   for the format.
2. **No telemetry, no analytics, no third-party SDKs**. The privacy
   promise is the product. If a feature requires an external service,
   open an issue first.
3. **Smallest possible diff**. Prefer touching one or two files.
4. **AGPL-3.0-or-later**. By contributing you agree your contributions
   will be licensed under the same terms as the rest of the project.

## Setup

Requires Node 24 (pinned via `.nvmrc` / `engines`) and pnpm 11 (pinned via `packageManager` in `package.json`).

```bash
pnpm install
pnpm test         # unit + regression — must be green before pushing
pnpm dev          # http://localhost:5173
pnpm build        # static output in ./dist
pnpm lint         # tsc --noEmit + svelte-check + eslint (one gate)
pnpm format:check # prettier --check (use `pnpm format` to fix)
```

## Adding a festival

1. Add the rule predicate in
   `src/lib/panchanga/festivals/pan-india.ts`.
2. Add a fixture under `tests/fixtures/drik-panchang/` with the date a
   reliable source (drikpanchang.com or the official panchanga of your
   tradition) gives for the next 1–2 years. One fixture per ambiguous
   tie-breaker.
3. Document any tie-breaker choice in `docs/METHODOLOGY.md`.

## Adding a fixture

The regression suite (`tests/regression/compare-vs-fixtures.test.ts`)
loads every JSON file in `tests/fixtures/drik-panchang/`. Schema:

```json
{
  "label": "Bengaluru — 2024-08-26 (Janmashtami)",
  "location": {
    "name": "Bengaluru, India",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "altitude": 920,
    "timezone": "Asia/Kolkata"
  },
  "civilDate": "2024-08-26",
  "expect": {
    "tithi": { "name": "Ashtami", "paksha": "krishna" },
    "festivals": ["krishna_janmashtami"]
  }
}
```

Fields under `expect` are optional — only what you write is checked.

## Changing an algorithm

If your patch alters tithi / nakshatra / yoga / karana / masa /
sunrise computation:

1. Bench it against every existing fixture. Time deltas should be
   smaller, not larger.
2. Update `docs/METHODOLOGY.md` with the new derivation if applicable.
3. Note the change in a `CHANGELOG.md` entry (create the file if it
   doesn't exist yet).

## UI / accessibility

- Keyboard-navigable. Every interactive element must reach focus via
  Tab and respond to Enter / Space.
- Screen-reader-friendly. Use `aria-*` attributes where semantic HTML
  isn't enough.
- `prefers-reduced-motion` and `prefers-color-scheme` must be
  respected.
- Avoid bundling new fonts; respect system defaults unless the design
  token already covers it.

## Commit / PR style

- Conventional commits aren't required, but useful prefixes are
  welcome: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.
- Squash-merge to keep main history linear.
- A green CI is required.

## Reporting an inaccuracy

If a panchanga value disagrees with a reliable source by more than the
documented tolerance (±2 min on tithi/nakshatra/yoga end times, ±30s on
sunrise/sunset), open an issue with:

- Location (lat, lon, tz)
- Civil date
- The source you're comparing against (URL preferred)
- The specific field and the two values

A failing fixture is the gold standard — and almost always tells us
exactly what's wrong faster than a description.
