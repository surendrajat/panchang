// One home for the Sky/Learn vertical's bilingual data mappings, so the same
// table isn't re-declared (or allowed to drift) across components. Names follow
// the app's canonical diacritic-free transliteration; Devanagari is the hi form.
//
// (Indexed *panchanga* names — tithi / nakshatra / yoga / rashi / masa — already
// live in $lib/i18n; this module is only the sky-specific extras.)

import type { GrahaKey } from '$lib/jyotish';

// ── Solar month + Gregorian span while the Sun sits in each rashi ────────────
// Index 0 = Mesha. Used by the masa cell and the tap-to-explore rashi card.
export interface MonInfo {
  mon: { en: string; hi: string };
  greg: { en: string; hi: string };
}
export const SIGN_MONTH: readonly MonInfo[] = [
  { mon: { en: 'Vaishakha', hi: 'वैशाख' }, greg: { en: 'Apr–May', hi: 'अप्रैल–मई' } },
  { mon: { en: 'Jyeshtha', hi: 'ज्येष्ठ' }, greg: { en: 'May–Jun', hi: 'मई–जून' } },
  { mon: { en: 'Ashadha', hi: 'आषाढ़' }, greg: { en: 'Jun–Jul', hi: 'जून–जुलाई' } },
  { mon: { en: 'Shravana', hi: 'श्रावण' }, greg: { en: 'Jul–Aug', hi: 'जुलाई–अगस्त' } },
  { mon: { en: 'Bhadrapada', hi: 'भाद्रपद' }, greg: { en: 'Aug–Sep', hi: 'अगस्त–सितंबर' } },
  { mon: { en: 'Ashvina', hi: 'आश्विन' }, greg: { en: 'Sep–Oct', hi: 'सितंबर–अक्तूबर' } },
  { mon: { en: 'Kartika', hi: 'कार्तिक' }, greg: { en: 'Oct–Nov', hi: 'अक्तूबर–नवंबर' } },
  { mon: { en: 'Margashirsha', hi: 'मार्गशीर्ष' }, greg: { en: 'Nov–Dec', hi: 'नवंबर–दिसंबर' } },
  { mon: { en: 'Pausha', hi: 'पौष' }, greg: { en: 'Dec–Jan', hi: 'दिसंबर–जनवरी' } },
  { mon: { en: 'Magha', hi: 'माघ' }, greg: { en: 'Jan–Feb', hi: 'जनवरी–फरवरी' } },
  { mon: { en: 'Phalguna', hi: 'फाल्गुन' }, greg: { en: 'Feb–Mar', hi: 'फरवरी–मार्च' } },
  { mon: { en: 'Chaitra', hi: 'चैत्र' }, greg: { en: 'Mar–Apr', hi: 'मार्च–अप्रैल' } },
];

// ── The seven vara, in weekday order (0 = Sunday), each ruled by one graha ────
export interface Vara {
  dev: string;
  tr: string;
  en: string;
  lord: GrahaKey;
}
export const VARA: readonly Vara[] = [
  { dev: 'रविवार', tr: 'Ravivara', en: 'Sunday', lord: 'sun' },
  { dev: 'सोमवार', tr: 'Somavara', en: 'Monday', lord: 'moon' },
  { dev: 'मंगलवार', tr: 'Mangalavara', en: 'Tuesday', lord: 'mars' },
  { dev: 'बुधवार', tr: 'Budhavara', en: 'Wednesday', lord: 'mercury' },
  { dev: 'गुरुवार', tr: 'Guruvara', en: 'Thursday', lord: 'jupiter' },
  { dev: 'शुक्रवार', tr: 'Shukravara', en: 'Friday', lord: 'venus' },
  { dev: 'शनिवार', tr: 'Shanivara', en: 'Saturday', lord: 'saturn' },
];

// ── One-line graha descriptions for the tap-to-explore card ───────────────────
export const PLANET_INFO: Record<GrahaKey, { en: string; hi: string }> = {
  sun: { en: 'The soul, vitality and the self.', hi: 'आत्मा, ओज और स्वत्व।' },
  moon: { en: 'The mind, emotion and nourishment.', hi: 'मन, भावना और पोषण।' },
  mars: {
    en: 'Energy, courage and drive — lord of Mesha & Vrishchika.',
    hi: 'ऊर्जा, साहस, कर्म — मेष व वृश्चिक का स्वामी।',
  },
  mercury: {
    en: 'Intellect, speech and commerce — lord of Mithuna & Kanya.',
    hi: 'बुद्धि, वाणी, व्यापार — मिथुन व कन्या का स्वामी।',
  },
  jupiter: {
    en: 'Wisdom, growth and fortune — lord of Dhanu & Meena.',
    hi: 'ज्ञान, विस्तार, भाग्य — धनु व मीन का स्वामी।',
  },
  venus: {
    en: 'Love, beauty and the arts — lord of Vrishabha & Tula.',
    hi: 'प्रेम, सौन्दर्य, कला — वृषभ व तुला का स्वामी।',
  },
  saturn: {
    en: 'Discipline, time and karma — lord of Makara & Kumbha.',
    hi: 'अनुशासन, समय, कर्मफल — मकर व कुम्भ का स्वामी।',
  },
  rahu: {
    en: 'A shadow-graha, not a real body — the north point where the Moon’s path crosses the Sun’s. Eclipses happen here; it stands for ambition and the unconventional.',
    hi: 'छाया-ग्रह (कोई वास्तविक पिंड नहीं) — चन्द्रपथ का सूर्यपथ से उत्तर संधि-बिंदु। यहीं ग्रहण होते हैं; महत्वाकांक्षा व अपरंपरा।',
  },
  ketu: {
    en: 'A shadow-graha, not a real body — the south crossing point, always opposite Rahu. Detachment, insight and liberation.',
    hi: 'छाया-ग्रह (कोई वास्तविक पिंड नहीं) — दक्षिण संधि-बिंदु, सदा राहु के सम्मुख। वैराग्य, अंतर्दृष्टि व मोक्ष।',
  },
};

// ── 8-point compass labels (azimuth bucket 0=N, 2=E, 4=S, 6=W) ────────────────
export const COMPASS: { en: readonly string[]; hi: readonly string[] } = {
  en: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
  hi: ['उ', 'उ-पू', 'पू', 'द-पू', 'द', 'द-प', 'प', 'उ-प'],
};

// ── Bright stars (J2000 RA h, Dec °, visual mag); many ARE nakshatra junction-
//    stars (Rohini=Aldebaran, Chitra=Spica…), so the dome doubles as a nakshatra
//    map. n = name in {hi, tr, en}. ────────────────────────────────────────────
export interface BrightStar {
  ra: number;
  dec: number;
  mag: number;
  n: { hi: string; tr: string; en: string };
}
export const BRIGHT_STARS: readonly BrightStar[] = [
  { ra: 6.752, dec: -16.72, mag: -1.46, n: { hi: 'लुब्धक', tr: 'Lubdhaka', en: 'Sirius' } },
  { ra: 5.278, dec: 45.998, mag: 0.08, n: { hi: 'ब्रह्महृदय', tr: 'Brahmahridaya', en: 'Capella' } },
  { ra: 5.242, dec: -8.2, mag: 0.13, n: { hi: 'रिगेल', tr: 'Rigel', en: 'Rigel' } },
  { ra: 14.261, dec: 19.18, mag: -0.05, n: { hi: 'स्वाती', tr: 'Svati', en: 'Arcturus' } },
  { ra: 18.616, dec: 38.78, mag: 0.03, n: { hi: 'अभिजित्', tr: 'Abhijit', en: 'Vega' } },
  { ra: 7.655, dec: 5.225, mag: 0.34, n: { hi: 'प्रोसायन', tr: 'Procyon', en: 'Procyon' } },
  { ra: 5.919, dec: 7.407, mag: 0.5, n: { hi: 'आर्द्रा', tr: 'Ardra', en: 'Betelgeuse' } },
  { ra: 4.599, dec: 16.51, mag: 0.85, n: { hi: 'रोहिणी', tr: 'Rohini', en: 'Aldebaran' } },
  { ra: 19.846, dec: 8.868, mag: 0.76, n: { hi: 'श्रवण', tr: 'Shravana', en: 'Altair' } },
  { ra: 13.42, dec: -11.16, mag: 0.97, n: { hi: 'चित्रा', tr: 'Chitra', en: 'Spica' } },
  { ra: 16.49, dec: -26.43, mag: 0.96, n: { hi: 'ज्येष्ठा', tr: 'Jyeshtha', en: 'Antares' } },
  { ra: 7.755, dec: 28.03, mag: 1.14, n: { hi: 'पुनर्वसु', tr: 'Punarvasu', en: 'Pollux' } },
  { ra: 10.139, dec: 11.97, mag: 1.35, n: { hi: 'मघा', tr: 'Magha', en: 'Regulus' } },
  { ra: 20.69, dec: 45.28, mag: 1.25, n: { hi: 'डेनेब', tr: 'Deneb', en: 'Deneb' } },
  { ra: 22.96, dec: -29.62, mag: 1.16, n: { hi: 'फ़ोमलहॉट', tr: 'Fomalhaut', en: 'Fomalhaut' } },
  { ra: 6.399, dec: -52.7, mag: -0.74, n: { hi: 'अगस्त्य', tr: 'Agastya', en: 'Canopus' } },
  { ra: 1.629, dec: -57.24, mag: 0.46, n: { hi: 'एकरनार', tr: 'Achernar', en: 'Achernar' } },
  { ra: 22.137, dec: -46.96, mag: 1.74, n: { hi: 'मयूर', tr: 'Peacock', en: 'Peacock' } },
];

// Polaris (the pole star) — drawn specially (a fixed marker), kept here for one home.
export const POLARIS = {
  ra: 2.53,
  dec: 89.26,
  n: { hi: 'ध्रुव', tr: 'Dhruva', en: 'Pole Star' },
};

// ── Constellation figures: star vertices [RA h, Dec °] + line segments (index
//    pairs into `stars`). name in {hi, tr, en}. ───────────────────────────────
export interface Constellation {
  name: { hi: string; tr: string; en: string };
  stars: number[][];
  lines: number[][];
}
export const CONSTELLATIONS: readonly Constellation[] = [
  {
    name: { hi: 'सप्तर्षि', tr: 'Saptarishi', en: 'Big Dipper' },
    stars: [
      [11.06, 61.75],
      [11.03, 56.38],
      [11.9, 53.69],
      [12.26, 57.03],
      [12.9, 55.96],
      [13.4, 54.93],
      [13.79, 49.31],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [3, 4],
      [4, 5],
      [5, 6],
    ],
  },
  {
    name: { hi: 'मृग', tr: 'Mriga', en: 'Orion' },
    stars: [
      [5.92, 7.41],
      [5.42, 6.35],
      [5.68, -1.94],
      [5.6, -1.2],
      [5.53, -0.3],
      [5.8, -9.67],
      [5.24, -8.2],
    ],
    lines: [
      [0, 1],
      [0, 2],
      [1, 4],
      [2, 3],
      [3, 4],
      [2, 5],
      [4, 6],
      [5, 6],
    ],
  },
  {
    name: { hi: 'वृश्चिक', tr: 'Vrishchika', en: 'Scorpius' },
    stars: [
      [16.09, -19.8],
      [16.0, -22.62],
      [15.98, -26.11],
      [16.49, -26.43],
      [16.6, -28.22],
      [16.84, -34.29],
      [17.56, -37.1],
      [17.51, -37.3],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [1, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
    ],
  },
  {
    name: { hi: 'कैसिओपिया', tr: 'Cassiopeia', en: 'Cassiopeia' },
    stars: [
      [0.15, 59.15],
      [0.68, 56.54],
      [0.95, 60.72],
      [1.43, 60.24],
      [1.91, 63.67],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
  {
    name: { hi: 'धनु', tr: 'Dhanu', en: 'Sagittarius' },
    stars: [
      [18.47, -25.42],
      [18.35, -29.83],
      [18.4, -34.38],
      [18.76, -26.99],
      [18.92, -26.3],
      [19.04, -29.88],
      [19.12, -27.67],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 5],
      [5, 4],
      [4, 3],
      [3, 0],
      [4, 6],
      [6, 5],
    ],
  },
];
