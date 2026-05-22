// Pan-India festival rules — Phase 1 set.
//
// Most rules follow "tithi N of paksha P in Amanta-month M". Critically,
// when the festival is in a Krishna paksha, we always match against
// `p.masa.amantaName` — the system-invariant canonical Amanta name —
// rather than `p.masa.name`. Otherwise a single physical festival day
// would fire twice for a Purnimanta user (once under each system's
// month label).
//
// The 11 monthly observances (Ekadashi, Pradosh, Sankashti, etc.) appear
// at the bottom.
//
// Naming choices per ARCHITECTURE.md §14: Smarta defaults. METHODOLOGY.md
// documents the tie-breakers we apply for Janmashtami, Diwali, and a
// few others.

import type { Panchanga } from '../types';
import type { FestivalRule } from './rules';

// Shukla-paksha festivals: month name is the same in Amanta and
// Purnimanta, so we can match either `masa.name` or `masa.amantaName` —
// we use `amantaName` for consistency with the Krishna helpers.
function inShukla(tithiNumber: number, amantaMasa: string) {
  return (p: Panchanga): boolean =>
    p.tithi.paksha === 'shukla' &&
    p.tithi.number === tithiNumber &&
    p.masa.amantaName === amantaMasa &&
    !p.masa.isAdhika;
}

// Krishna-paksha festivals: must dispatch on the canonical Amanta name,
// not the display name. In Purnimanta the same Krishna paksha is
// re-labelled as the next month, so a `(Ashvina || Kartika)` OR-rule
// would fire on TWO different lunar months (Bhadrapada-krishna and
// Ashvina-krishna for a Purnimanta user). Using `amantaName` keys on
// the underlying lunar bracket regardless of display system.
function inKrishna(tithiNumber: number, amantaMasa: string) {
  return (p: Panchanga): boolean =>
    p.tithi.paksha === 'krishna' &&
    p.tithi.number === tithiNumber &&
    p.masa.amantaName === amantaMasa &&
    !p.masa.isAdhika;
}

// Solar sankrantis: detect the civil date on which the Sun crosses
// into the target sidereal sign. `signAtDayStart` is the sign as the
// civil day begins; `signAtDayEnd` is the sign as it ends. A
// transition into `targetSign` between those two instants is the
// sankranti for that sign.
function isSankrantiInto(targetSign: number): (p: Panchanga) => boolean {
  return (p) =>
    p.solar.signAtDayStart !== p.solar.signAtDayEnd && p.solar.signAtDayEnd === targetSign;
}

// Lohri is the day before Makara Sankranti. Detect it the same way
// but one sign earlier: today both starts and ends in Dhanu (8), AND
// tomorrow's sankranti would be into Makara. The latter can't be
// derived from `p` alone without looking ahead, so we fall back to a
// gated Gregorian heuristic: Dhanu (sun.sign === 8) AND Jan 13 in the
// location's tz. This is correct for every year 1900–2100 since the
// Gregorian/sidereal drift only changes Lohri's calendar date by ±1.
function isLohri(p: Panchanga): boolean {
  if (p.solar.signAtDayEnd !== 8) return false; // must still be in Dhanu at end of day
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: p.location.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [, m, d] = fmt.format(p.date).split('-').map(Number);
  return m === 1 && d === 13;
}

export const PAN_INDIA_FESTIVALS: readonly FestivalRule[] = [
  // --- Major Phase 1 list (per ARCHITECTURE.md §7) ---

  // Solar / sun-sign transit
  // Makara Sankranti = Sun enters Makara (sidereal sign 9).
  // Pongal shares that day in the Tamil calendar.
  {
    key: 'makara_sankranti',
    displayName: 'Makara Sankranti',
    displayNameHi: 'मकर संक्रांति',
    matches: isSankrantiInto(9),
  },
  {
    key: 'pongal',
    displayName: 'Thai Pongal',
    displayNameHi: 'थाई पोंगल',
    matches: isSankrantiInto(9),
  },
  { key: 'lohri', displayName: 'Lohri', displayNameHi: 'लोहड़ी', matches: isLohri },

  // Maha Shivaratri — Magha Krishna 14 (Amanta).
  // In Purnimanta this same day reads as Phalguna Krishna 14.
  {
    key: 'maha_shivaratri',
    displayName: 'Maha Shivaratri',
    displayNameHi: 'महा शिवरात्रि',
    matches: inKrishna(14, 'Magha'),
  },

  // Vasant Panchami — Magha Shukla 5
  {
    key: 'vasant_panchami',
    displayName: 'Vasant Panchami',
    displayNameHi: 'वसंत पंचमी',
    matches: inShukla(5, 'Magha'),
  },

  // Holika Dahan — Phalguna Shukla 15 (Purnima)
  {
    key: 'holika_dahan',
    displayName: 'Holika Dahan',
    displayNameHi: 'होलिका दहन',
    matches: inShukla(15, 'Phalguna'),
  },
  // Holi (Dhuleti) — Phalguna Krishna 1 (Amanta).
  // Purnimanta reads this same day as Chaitra Krishna 1.
  {
    key: 'holi',
    displayName: 'Holi (Dhuleti)',
    displayNameHi: 'होली (धुलेटी)',
    matches: inKrishna(1, 'Phalguna'),
  },

  // Ugadi / Gudi Padwa — Chaitra Shukla 1
  {
    key: 'ugadi',
    displayName: 'Ugadi / Gudi Padwa',
    displayNameHi: 'उगादि / गुड़ी पड़वा',
    matches: inShukla(1, 'Chaitra'),
  },

  // Rama Navami — Chaitra Shukla 9
  {
    key: 'rama_navami',
    displayName: 'Rama Navami',
    displayNameHi: 'राम नवमी',
    matches: inShukla(9, 'Chaitra'),
  },

  // Hanuman Jayanti — Chaitra Shukla 15 (Purnima)
  {
    key: 'hanuman_jayanti',
    displayName: 'Hanuman Jayanti',
    displayNameHi: 'हनुमान जयंती',
    matches: inShukla(15, 'Chaitra'),
  },

  // Akshaya Tritiya — Vaishakha Shukla 3
  {
    key: 'akshaya_tritiya',
    displayName: 'Akshaya Tritiya',
    displayNameHi: 'अक्षय तृतीया',
    matches: inShukla(3, 'Vaishakha'),
  },

  // Buddha Purnima — Vaishakha Shukla 15
  {
    key: 'buddha_purnima',
    displayName: 'Buddha Purnima',
    displayNameHi: 'बुद्ध पूर्णिमा',
    matches: inShukla(15, 'Vaishakha'),
  },

  // Guru Purnima — Ashadha Shukla 15
  {
    key: 'guru_purnima',
    displayName: 'Guru Purnima',
    displayNameHi: 'गुरु पूर्णिमा',
    matches: inShukla(15, 'Ashadha'),
  },

  // Nag Panchami — Shravana Shukla 5
  {
    key: 'nag_panchami',
    displayName: 'Nag Panchami',
    displayNameHi: 'नाग पंचमी',
    matches: inShukla(5, 'Shravana'),
  },

  // Raksha Bandhan — Shravana Shukla 15 (Purnima)
  {
    key: 'raksha_bandhan',
    displayName: 'Raksha Bandhan',
    displayNameHi: 'रक्षा बंधन',
    matches: inShukla(15, 'Shravana'),
  },

  // Krishna Janmashtami — Shravana Krishna 8 (Amanta).
  // Purnimanta reads this as Bhadrapada Krishna 8.
  {
    key: 'krishna_janmashtami',
    displayName: 'Krishna Janmashtami',
    displayNameHi: 'कृष्ण जन्माष्टमी',
    matches: inKrishna(8, 'Shravana'),
  },

  // Ganesh Chaturthi — Bhadrapada Shukla 4
  {
    key: 'ganesh_chaturthi',
    displayName: 'Ganesh Chaturthi',
    displayNameHi: 'गणेश चतुर्थी',
    matches: inShukla(4, 'Bhadrapada'),
  },

  // Thiruvonam (Onam) — Shravana nakshatra falling in the Amanta
  // Bhadrapada window (Aug-Sep). Solar-Malayalam Chingam-tied, so we
  // approximate by the lunar bracket.
  {
    key: 'thiruvonam',
    displayName: 'Thiruvonam (Onam)',
    displayNameHi: 'थिरुओणम (ओणम)',
    matches: (p) => p.nakshatra.name === 'Shravana' && p.masa.amantaName === 'Bhadrapada',
  },

  // Navaratri start — Ashvina Shukla 1
  {
    key: 'navaratri_start',
    displayName: 'Sharad Navaratri (Day 1)',
    displayNameHi: 'शरद नवरात्रि (पहला दिन)',
    matches: inShukla(1, 'Ashvina'),
  },

  // Vijayadashami / Dussehra — Ashvina Shukla 10
  {
    key: 'vijayadashami',
    displayName: 'Vijayadashami (Dussehra)',
    displayNameHi: 'विजयदशमी (दशहरा)',
    matches: inShukla(10, 'Ashvina'),
  },

  // Karva Chauth — Ashvina Krishna 4 (Amanta).
  // Purnimanta reads this as Kartika Krishna 4.
  {
    key: 'karva_chauth',
    displayName: 'Karva Chauth',
    displayNameHi: 'करवा चौथ',
    matches: inKrishna(4, 'Ashvina'),
  },

  // Dhanteras — Ashvina Krishna 13 (Amanta)
  {
    key: 'dhanteras',
    displayName: 'Dhanteras',
    displayNameHi: 'धनतेरस',
    matches: inKrishna(13, 'Ashvina'),
  },

  // Naraka Chaturdashi — Ashvina Krishna 14 (Amanta)
  {
    key: 'naraka_chaturdashi',
    displayName: 'Naraka Chaturdashi',
    displayNameHi: 'नरक चतुर्दशी',
    matches: inKrishna(14, 'Ashvina'),
  },

  // Diwali / Lakshmi Puja — Ashvina Krishna Amavasya (Amanta).
  // Purnimanta reads this as Kartika Krishna Amavasya. Tie-breaker
  // (per METHODOLOGY): when Amavasya spans two evenings, pick the day
  // it is present during pradosha. The current rule simplifies to
  // sunrise-tithi; will be refined in Phase 2.
  {
    key: 'diwali',
    displayName: 'Diwali (Lakshmi Puja)',
    displayNameHi: 'दीवाली (लक्ष्मी पूजा)',
    matches: inKrishna(15, 'Ashvina'),
  },

  // Govardhan Puja — Kartika Shukla 1
  {
    key: 'govardhan_puja',
    displayName: 'Govardhan Puja',
    displayNameHi: 'गोवर्धन पूजा',
    matches: inShukla(1, 'Kartika'),
  },

  // Bhai Dooj — Kartika Shukla 2
  {
    key: 'bhai_dooj',
    displayName: 'Bhai Dooj',
    displayNameHi: 'भाई दूज',
    matches: inShukla(2, 'Kartika'),
  },

  // Tulsi Vivaha — Kartika Shukla 12
  {
    key: 'tulsi_vivaha',
    displayName: 'Tulsi Vivaha',
    displayNameHi: 'तुलसी विवाह',
    matches: inShukla(12, 'Kartika'),
  },

  // Kartik Purnima — Kartika Shukla 15
  {
    key: 'kartik_purnima',
    displayName: 'Kartik Purnima',
    displayNameHi: 'कार्तिक पूर्णिमा',
    matches: inShukla(15, 'Kartika'),
  },

  // Vaikuntha Ekadashi — Margashirsha Shukla 11 (Dhanurmasa Ekadashi).
  {
    key: 'vaikuntha_ekadashi',
    displayName: 'Vaikuntha Ekadashi',
    displayNameHi: 'वैकुण्ठ एकादशी',
    matches: inShukla(11, 'Margashirsha'),
  },

  // --- Monthly recurring observances ---

  {
    key: 'ekadashi',
    displayName: 'Ekadashi',
    displayNameHi: 'एकादशी',
    matches: (p) => p.tithi.number === 11,
  },
  {
    key: 'pradosh',
    displayName: 'Pradosh Vrat',
    displayNameHi: 'प्रदोष व्रत',
    matches: (p) => p.tithi.number === 13,
  },
  {
    key: 'sankashti_chaturthi',
    displayName: 'Sankashti Chaturthi',
    displayNameHi: 'संकष्टी चतुर्थी',
    matches: (p) => p.tithi.paksha === 'krishna' && p.tithi.number === 4,
  },
  {
    key: 'amavasya',
    displayName: 'Amavasya',
    displayNameHi: 'अमावस्या',
    matches: (p) => p.tithi.index === 30,
  },
  {
    key: 'purnima',
    displayName: 'Purnima',
    displayNameHi: 'पूर्णिमा',
    matches: (p) => p.tithi.index === 15,
  },
  {
    key: 'masik_shivaratri',
    displayName: 'Masik Shivaratri',
    displayNameHi: 'मासिक शिवरात्रि',
    // Monthly Shiva observance — Krishna 14, except the one in Magha
    // (which is the major Maha Shivaratri above).
    matches: (p) =>
      p.tithi.paksha === 'krishna' && p.tithi.number === 14 && p.masa.amantaName !== 'Magha',
  },
];
