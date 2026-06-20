// Sky-wheel symbol codepoints, rendered through the bundled 'Panchang Symbols'
// font family (see src/styles/tokens.css for the @font-face split):
//   • signs + sun/moon  → JetBrains Mono Nerd Font (Material Design icons), PUA
//   • planets / nodes    → STIX Two Math astrological symbols, standard Unicode
// Bundling these locally means the marks render identically on every device —
// no emoji fallback.

// Zodiac sign icons (md-zodiac-*), index 0 = Mesha (Aries) … 11 = Meena (Pisces).
export const SIGN_GLYPH: readonly string[] = [
  '\u{F0A7E}', // Mesha / Aries
  '\u{F0A87}', // Vrishabha / Taurus
  '\u{F0A81}', // Mithuna / Gemini
  '\u{F0A7F}', // Karka / Cancer
  '\u{F0A82}', // Simha / Leo
  '\u{F0A88}', // Kanya / Virgo
  '\u{F0A83}', // Tula / Libra
  '\u{F0A86}', // Vrishchika / Scorpio
  '\u{F0A85}', // Dhanu / Sagittarius
  '\u{F0A80}', // Makara / Capricorn
  '\u{F0A7D}', // Kumbha / Aquarius
  '\u{F0A84}', // Meena / Pisces
];

// Luminaries — Nerd Font pictorial icons (sun-burst / crescent).
export const SUN_GLYPH = '\u{F185}';
export const MOON_GLYPH = '\u{F4EE}';

// Grahas — the real STIX astrological planet & node symbols.
export const PLANET_GLYPH: Record<string, string> = {
  mercury: '☿', // ☿
  venus: '♀', // ♀
  mars: '♂', // ♂
  jupiter: '♃', // ♃
  saturn: '♄', // ♄
  rahu: '☊', // ☊ ascending node
  ketu: '☋', // ☋ descending node
};
