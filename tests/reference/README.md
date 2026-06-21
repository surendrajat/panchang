# Swiss-Ephemeris reference values

The regression tests in `tests/regression/*-vs-swisseph.test.ts` pin the engine
to **Swiss Ephemeris** — the gold-standard astronomy library that astro.com,
Jagannatha Hora and ProKerala all build on. This is the project's _independent_
reference: the app computes everything with a different ephemeris
(`astronomy-engine`), and the tests assert the two converge. It is deliberately
**not** drikpanchang.com — see `EVALUATION.md` and the header of
`kundli-vs-drik.test.ts` for why we treat Drik as a comparison point, not a
source of truth.

## Why a generator script

Every hardcoded Swiss-Eph number in the suite is produced by
[`gen_swisseph.py`](./gen_swisseph.py), so the corpus is **reproducible and
auditable** rather than a pile of magic numbers from a throwaway script. If you
ever doubt a reference value, regenerate it and diff.

`pyswisseph` is a verification tool only — it is **not** a runtime or dev
dependency of the app, and nothing in `src/` imports it.

## Regenerate

```sh
python3 -m venv /tmp/swetest && /tmp/swetest/bin/pip install pyswisseph
/tmp/swetest/bin/python tests/reference/gen_swisseph.py
```

The script prints, grouped by the test file that consumes them:

| Section          | Test file                          | What it pins |
| ---------------- | ---------------------------------- | ------------ |
| ayanamsa         | `unit/ayanamsa.test.ts`            | Lahiri value, 1900–2100 |
| grahas + nodes   | `regression/kundli-vs-swisseph.ts` | 9 grahas (mean node), 8 epochs |
| true node        | `regression/kundli-vs-swisseph.ts` | `SE_TRUE_NODE`, 8 epochs |
| lagna            | `regression/kundli-vs-drik.ts`     | sidereal ascendant, 7 cases |
| sunrise + angas  | `regression/panchanga-vs-swisseph` | sunrise, tithi/nakshatra/yoga end times |

## Settings (pinned for reproducibility)

- **Ayanamsa:** `SIDM_LAHIRI` (the official Indian Astronomical Ephemeris value;
  the app uses the same — `src/lib/astro/ayanamsa.ts`).
- **Theory:** `FLG_MOSEPH` (Moshier — needs no ephemeris data files, so results
  are identical on any machine).
- **Sunrise:** `CALC_RISE` default = apparent upper limb + refraction.
- **End times:** the instant an angle (elongation / sidereal Moon /
  sidereal Sun+Moon) crosses its next segment boundary, found by minute-step +
  46-round bisection (≈ms precision).

## When a printed value disagrees with a test

That means **the app's output changed**. Do not blindly update the test —
first find out _why_ the engine moved (an intended accuracy change, or a
regression). Only update the reference after confirming the new value is more
correct, and bump `CALCULATION_VERSION` if cached output is affected.
</content>
