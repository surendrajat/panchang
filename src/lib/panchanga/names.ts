// Canonical English/Sanskrit names. Pronunciation transliteration uses
// IAST without diacritics for ease of typing; UI may switch to Devanagari
// in Phase 2. Order is canonical — do not reorder these arrays.

// Tithi names — 15 names that repeat across both pakshas.
export const TITHI_NAMES: readonly string[] = [
  'Pratipada',
  'Dwitiya',
  'Tritiya',
  'Chaturthi',
  'Panchami',
  'Shashthi',
  'Saptami',
  'Ashtami',
  'Navami',
  'Dashami',
  'Ekadashi',
  'Dwadashi',
  'Trayodashi',
  'Chaturdashi',
  'Purnima', // shukla 15
  'Pratipada',
  'Dwitiya',
  'Tritiya',
  'Chaturthi',
  'Panchami',
  'Shashthi',
  'Saptami',
  'Ashtami',
  'Navami',
  'Dashami',
  'Ekadashi',
  'Dwadashi',
  'Trayodashi',
  'Chaturdashi',
  'Amavasya', // krishna 15
];

// 27 nakshatras. Each spans 13°20′ of the sidereal zodiac.
export const NAKSHATRA_NAMES: readonly string[] = [
  'Ashwini',
  'Bharani',
  'Krittika',
  'Rohini',
  'Mrigashira',
  'Ardra',
  'Punarvasu',
  'Pushya',
  'Ashlesha',
  'Magha',
  'Purva Phalguni',
  'Uttara Phalguni',
  'Hasta',
  'Chitra',
  'Swati',
  'Vishakha',
  'Anuradha',
  'Jyeshtha',
  'Mula',
  'Purva Ashadha',
  'Uttara Ashadha',
  'Shravana',
  'Dhanishta',
  'Shatabhisha',
  'Purva Bhadrapada',
  'Uttara Bhadrapada',
  'Revati',
];

// 27 yogas. Each spans 13°20′ of (sun + moon) sidereal longitude.
export const YOGA_NAMES: readonly string[] = [
  'Vishkambha',
  'Priti',
  'Ayushman',
  'Saubhagya',
  'Shobhana',
  'Atiganda',
  'Sukarma',
  'Dhriti',
  'Shula',
  'Ganda',
  'Vriddhi',
  'Dhruva',
  'Vyaghata',
  'Harshana',
  'Vajra',
  'Siddhi',
  'Vyatipata',
  'Variyana',
  'Parigha',
  'Shiva',
  'Siddha',
  'Sadhya',
  'Shubha',
  'Shukla',
  'Brahma',
  'Indra',
  'Vaidhriti',
];

// 11 named karanas. The first 7 ("movable") repeat 8 times through the
// lunar month at positions 1..56. The last 4 ("fixed") occupy positions
// 57, 58, 59, 0 — the half-tithi before Pratipada of Shukla Paksha.
export const MOVABLE_KARANA_NAMES: readonly string[] = [
  'Bava',
  'Balava',
  'Kaulava',
  'Taitila',
  'Garaja',
  'Vanija',
  'Vishti', // Vishti = Bhadra
];

export const FIXED_KARANA_NAMES: readonly string[] = [
  'Shakuni', // pos 57 (krishna 14 second half)
  'Chatushpada', // pos 58 (krishna 30 first half / amavasya)
  'Naga', // pos 59 (krishna 30 second half)
  'Kimstughna', // pos 0 (shukla 1 first half)
];

// 12 lunar months in Amanta canonical order, Chaitra = 1.
export const MASA_NAMES: readonly string[] = [
  'Chaitra',
  'Vaishakha',
  'Jyeshtha',
  'Ashadha',
  'Shravana',
  'Bhadrapada',
  'Ashvina',
  'Kartika',
  'Margashirsha',
  'Pausha',
  'Magha',
  'Phalguna',
];

// The sidereal sign Sun is in at new moon determines the name of the
// lunar month *starting* at that new moon. Index = Sun's sidereal sign
// at the preceding new moon (0..11, Mesha=0). Output = masa index 1..12.
// Source: standard Drik Panchang naming convention.
export const MASA_INDEX_BY_SUN_SIGN: readonly number[] = [
  // Mesha (0) → Vaishakha (2)
  2,
  // Vrishabha (1) → Jyeshtha (3)
  3,
  // Mithuna (2) → Ashadha (4)
  4,
  // Karka (3) → Shravana (5)
  5,
  // Simha (4) → Bhadrapada (6)
  6,
  // Kanya (5) → Ashvina (7)
  7,
  // Tula (6) → Kartika (8)
  8,
  // Vrishchika (7) → Margashirsha (9)
  9,
  // Dhanu (8) → Pausha (10)
  10,
  // Makara (9) → Magha (11)
  11,
  // Kumbha (10) → Phalguna (12)
  12,
  // Meena (11) → Chaitra (1)
  1,
];

// 12 sidereal signs (rashis). Index 0 = Mesha (Sun enters ~mid-April).
// Used to display Surya Rashi and Chandra Rashi on the day card.
export const RASHI_NAMES: readonly string[] = [
  'Mesha', // 0 — Aries
  'Vrishabha', // 1 — Taurus
  'Mithuna', // 2 — Gemini
  'Karka', // 3 — Cancer
  'Simha', // 4 — Leo
  'Kanya', // 5 — Virgo
  'Tula', // 6 — Libra
  'Vrishchika', // 7 — Scorpio
  'Dhanu', // 8 — Sagittarius
  'Makara', // 9 — Capricorn
  'Kumbha', // 10 — Aquarius
  'Meena', // 11 — Pisces
];

// 6 ritus, each spanning 2 solar months. Vasanta (spring) begins ~mid-March.
export const RITU_NAMES: readonly string[] = [
  'vasanta',
  'grishma',
  'varsha',
  'sharad',
  'hemanta',
  'shishira',
];

// 7 weekdays, Sunday=0 to match Date.getDay() convention.
export const VARA_NAMES: readonly string[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

// Display names for varas.
export const VARA_DISPLAY: Record<string, string> = {
  sunday: 'Ravivara',
  monday: 'Somavara',
  tuesday: 'Mangalavara',
  wednesday: 'Budhavara',
  thursday: 'Guruvara',
  friday: 'Shukravara',
  saturday: 'Shanivara',
};

// 60-year Jovian cycle (Samvatsara) names. Index 0 = Prabhava.
// Source: Surya Siddhanta, Chapter XIV.
export const SAMVATSARA_NAMES: readonly string[] = [
  'Prabhava',
  'Vibhava',
  'Shukla',
  'Pramoda',
  'Prajapati',
  'Angirasa',
  'Shrimukha',
  'Bhava',
  'Yuva',
  'Dhata',
  'Ishvara',
  'Bahudhanya',
  'Pramathi',
  'Vikrama',
  'Vrisha',
  'Chitrabhanu',
  'Subhanu',
  'Tarana',
  'Parthiva',
  'Vyaya',
  'Sarvajit',
  'Sarvadhari',
  'Virodhi',
  'Vikriti',
  'Khara',
  'Nandana',
  'Vijaya',
  'Jaya',
  'Manmatha',
  'Durmukha',
  'Hevilambi',
  'Vilambi',
  'Vikari',
  'Sharvari',
  'Plava',
  'Shubhakrit',
  'Shobhakrit',
  'Krodhi',
  'Vishvavasu',
  'Parabhava',
  'Plavanga',
  'Kilaka',
  'Saumya',
  'Sadharana',
  'Virodhakrit',
  'Paridhavi',
  'Pramadhi',
  'Ananda',
  'Rakshasa',
  'Nala',
  'Pingala',
  'Kalayukta',
  'Siddharthi',
  'Raudra',
  'Durmati',
  'Dundubhi',
  'Rudhirodgari',
  'Raktakshi',
  'Krodhana',
  'Akshaya',
];
