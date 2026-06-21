# Panchanga

A free, offline-first Hindu calendar that runs entirely in your browser.

**🌎 [panchang.surendrajat.xyz](https://panchang.surendrajat.xyz)**

No accounts, no ads, no tracking. Install once, works offline.

## Features

- **Panchanga** — Tithi, Nakshatra, Yoga and Karana with end times, plus a sunrise-anchored Vara.
- **Calendar** — lunar month (Masa) with Adhik Maas, Amanta/Purnimanta conventions, Vikram & Shaka Samvat, Ritu and Ayana.
- **Muhurtas** — auspicious windows (Brahma, Abhijit, Vijaya, …) and inauspicious ones (Rahu Kaal, Yamaganda, Gulika).
- **Festivals** — a pan-India set with rules aligned to Drik Panchang.
- **Sun & Moon** — rise and set times, and the moon phase with illumination.
- **Kundli** — Lagna, the nine grahas, bhavas, Vimshottari dasha, Navamsa, and Ashtakoota (guna milan) matching.
- **Sky & Learn** — a live view of your local sky, and an interactive guide to how the panchanga is built.

## Languages

English and हिन्दी, with Latin (1, 2, 3) or Devanagari (१, २, ३) numerals, and an optional transliteration toggle (Mesha/Maṅgala ↔ Aries/Mars).

## Locations

Bundled cities cover India's metros and Hindu-diaspora centres worldwide, or use GPS — everything is computed locally for your true local sunrise.

## How it works

Positions come from [astronomy-engine](https://github.com/cosinekitty/astronomy) (apparent geocentric, sub-arcsecond), sidereal with Lahiri by default (KP, Raman, Yukteshwar and True Chitra also available).

Panchanga elements match the Swiss Ephemeris exactly (anga indices identical, end times within ~40 seconds), and graha and Lagna positions agree to within ~0.5′; festival dates are verified against Drik Panchang. This is validated over **1925–2040**, with festival rules covering **1950–2100** (matched to Drik Panchang for 2015–2028).

To learn the math and the _why_ from scratch, read the **[guide](./docs/guide/)**; for terse references see [METHODOLOGY](./docs/METHODOLOGY.md), [METHODOLOGY_JYOTISH](./docs/METHODOLOGY_JYOTISH.md) and [ARCHITECTURE](./docs/ARCHITECTURE.md).

## Privacy

No server, no telemetry — everything lives in your browser. The service worker precaches the app so it loads instantly and works offline.

## Run locally

```bash
pnpm install
pnpm dev      # http://localhost:5173
pnpm test     # unit + regression suite
pnpm build    # static output → ./dist
```

Requires Node 24 and pnpm 11 (both pinned).

## Contributing

Bug reports, accuracy comparisons against local panchangas, and translations are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

Copyright 2026 @surendrajat · [AGPL-3.0-or-later](./LICENSE).
