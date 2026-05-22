# Drik Panchang reference fixtures

This directory holds known-good panchanga values captured from
[drikpanchang.com](https://www.drikpanchang.com) for select (location, date)
pairs. The regression suite (`tests/regression/compare-vs-fixtures.test.ts`)
runs each fixture through `computePanchanga()` and asserts equality within
tolerance.

## Tolerances (per ARCHITECTURE.md §12)

- Tithi/Nakshatra/Yoga/Karana **end times**: ±2 minutes
- Sunrise / Sunset: ±30 seconds
- Names and indices: exact match
- Festival dates: exact match

## Capturing a fixture (manual workflow)

1. Open the Drik Panchang page for the location and date.
2. Note the values for tithi, nakshatra, yoga, karana, sunrise, sunset
   (each with its "until ..." end time when applicable).
3. Add a JSON file to this directory with the schema below.

## Schema

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
    "nakshatra": { "name": "Krittika" },
    "festivals": ["krishna_janmashtami"]
  }
}
```

Fields under `expect` are optional — only what you've captured is checked.

## Phase 1 seed set

The seed set is intentionally small (~10 entries). Phase 2 expands to the
full 260-entry suite described in ARCHITECTURE.md §12.
