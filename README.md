# Panchanga

A free, offline-first Hindu calendar that runs entirely in your browser.

**▶ Open the app: [panchang.pages.dev](https://panchang.pages.dev)**

No accounts. No ads. No tracking. Install it once and it works on a plane.

## What you get

- **Daily panchanga** — Tithi, Nakshatra, Yoga, Karana (all of them, with end times), and Vara, anchored to sunrise at your location.
- **Lunar month** — Masa with Adhik Maas detection; switch between Amanta and Purnimanta conventions.
- **Muhurta** — 10 windows surfaced for any day: Brahma Muhurta, Pratah Sandhya, Abhijit, Vijaya Muhurta, Godhuli, Sayahna Sandhya, Nishita Kaal, plus the inauspicious Rahu Kaal / Yamaganda / Gulika.
- **Festivals** — Pan-India set with Drik-aligned rules (Pradosha, Nishita Kaal interval, Aparahna with Shravana-nakshatra preference, Bhadra-aware Holika/Raksha Bandhan, sunset-cutoff Sankranti). Verified against drikpanchang.com across the supported default-convention corpus, with documented Holika/Holi edge-case divergences in 2012 and 2013.
- **Year context** — Vikram Samvat, Shaka Samvat, Kaliyuga, plus current Ritu and Ayana.
- **Sun/Moon** — sunrise, sunset, moonrise, moonset, moon phase with illumination %.

## Supported locations

Bundled city list covers India's major metros, plus Hindu-population centres across Southeast Asia (Bali, Kuala Lumpur, Bangkok, Manila, Singapore), the Gulf (Dubai, Doha), the Caribbean (Trinidad, Suriname), Mauritius, Fiji, and major Western diaspora cities. You can also use the device's GPS — everything is computed locally for the location's true sunrise.

## Languages

- **English** with Devanagari ornament glyphs.
- **हिन्दी** with literary Sanskrit-Hindi vocabulary (पञ्चाङ्ग, सम्वत, मुहूर्त).
- Numerals in either Hindu (1, 2, 3) or Devanagari (१, २, ३) — toggle from the top bar.

## Calculation conventions

- **Ephemeris**: [astronomy-engine](https://github.com/cosinekitty/astronomy) — apparent geocentric Sun/Moon, sub-arcsecond accuracy.
- **Ayanamsa**: Lahiri default (Chitra Paksha), tuned to Drik Panchang's computational Lahiri values. KP, Raman, Yukteshwar, True Chitra also available.
- **Sunrise**: Upper edge with atmospheric refraction, matching the Drik default.
- **Festival tiebreakers**: Documented in [METHODOLOGY.md](./METHODOLOGY.md) — every rule cites the muhurta window it's anchored to.

## Privacy

Everything lives in your browser's IndexedDB. There is no server. The app's source files are precached so it loads instantly on repeat visits and works offline indefinitely.

## Run it yourself

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # unit + regression
pnpm build      # static output in ./dist
```

Requires Node 24 (pinned in `.nvmrc`) and pnpm 11.

## Contributing

Bug reports, accuracy reports against your local panchang, and translations for additional languages are all welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[AGPL-3.0-or-later](./LICENSE). If you run a modified version as a paid service, your changes must be published back. For a permissive fork in a private use case, open an issue.

## Acknowledgements

- [astronomy-engine](https://github.com/cosinekitty/astronomy) for accurate ephemeris calculations and timezone handling.
- Festival-date conventions verified against [drikpanchang.com](https://www.drikpanchang.com/).
- Lahiri ayanamsa per the Indian Astronomical Ephemeris. Sanskrit term spellings cross-checked with standard panchanga references. See [METHODOLOGY.md](./METHODOLOGY.md) for the full source list.
