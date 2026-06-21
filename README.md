# Panchanga

A free, offline-first Hindu calendar that runs entirely in your browser.

**🌎 [panchang.surendrajat.xyz](https://panchang.surendrajat.xyz)**

No accounts. No ads. No tracking. Install once, works on a plane.

## Features

- **Daily panchanga** — Tithi, Nakshatra, Yoga, Karana with end times; Vara anchored to sunrise at your location.
- **Lunar month** — Masa with Adhik Maas detection; Amanta and Purnimanta conventions.
- **Muhurtas** — Brahma Muhurta, Abhijit, Vijaya, Godhuli, Nishita Kaal, and inauspicious windows (Rahu Kaal, Yamaganda, Gulika).
- **Festivals** — Pan-India set with rules aligned to Drik Panchang (Pradosha, Aparahna Nishita, Bhadra-aware dates, Sankranti sunset cutoff).
- **Year context** — Vikram Samvat, Shaka Samvat, Kaliyuga, Ritu, Ayana.
- **Sun & Moon** — sunrise, sunset, moonrise, moonset, moon phase with illumination %.

## Languages

- **English** and **हिन्दी** (auto-detected from your system language on first launch).
- Numerals in Latin (1, 2, 3) or Devanagari (१, २, ३).

## Locations

Bundled city list covers India's metros, Hindu-diaspora centres in Southeast Asia, the Gulf, the Caribbean, Mauritius, Fiji, and major Western cities. GPS is also supported — everything is computed locally for the true local sunrise.

## Calculations

- **Ephemeris**: [astronomy-engine](https://github.com/cosinekitty/astronomy) — apparent geocentric Sun/Moon, sub-arcsecond accuracy.
- **Ayanamsa**: Lahiri (Chitra Paksha) by default; KP, Raman, Yukteshwar, True Chitra available.
- **Sunrise**: Upper limb with atmospheric refraction, matching the Drik default.
- **Learn how it all works** — a from-scratch course on the math, the code, and
  the *why* of the Hindu calendar: **[docs/guide/](./docs/guide/)**.
- Reference summaries: [docs/METHODOLOGY.md](./docs/METHODOLOGY.md) (panchanga),
  [docs/METHODOLOGY_JYOTISH.md](./docs/METHODOLOGY_JYOTISH.md) (kundli),
  [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Privacy

Everything lives in your browser's IndexedDB. There is no server, no telemetry. Source files are precached by the service worker so the app loads instantly and works offline.

## Run locally

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # unit + regression suite
pnpm build      # static output → ./dist
```

Requires Node 24 and pnpm 11 (pinned in `.nvmrc`).

## Contributing

Bug reports, accuracy comparisons against local panchangas, and language translations are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

Copyright 2026 @surendrajat

This project is licensed under the [AGPL-3.0-or-later](./LICENSE).

## Acknowledgements

- [astronomy-engine](https://github.com/cosinekitty/astronomy) — ephemeris calculations.
- Festival rules verified against [drikpanchang.com](https://www.drikpanchang.com/).
