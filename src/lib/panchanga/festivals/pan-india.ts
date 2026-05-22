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
import {
  vyapiniMatches,
  bhadraAwareVyapiniMatches,
  bhadraAwareVyapiniMatchesForDate,
  bhadraAwareVyapiniWithSunriseFallback,
  vyapiniWithSunriseFallback,
  vyapiniWithNakshatraPreference,
  sankrantiInto,
} from '../tiebreakers';

// Nakshatra index for Shravana (used by Vijayadashami).
const NAK_SHRAVANA = 22;

// Tithi index helpers for the vyapini rules:
//   - shukla N → index N        (1..15)
//   - krishna N → index 15 + N  (16..30; krishna 15 = 30 = Amavasya)
const SHUKLA = (n: number) => n; // shukla 1..15
const KRISHNA = (n: number) => 15 + n; // krishna 1..15 → 16..30

// Shukla-paksha vyapini festival in a given Amanta month. The window
// names map directly to Drik's standard convention for each festival.
// `pick` chooses earlier-vs-later when two consecutive days both have
// the tithi at the window (see `vyapiniMatches`).
//
// `fallback`:
//   'strict'   — only the named-window check (default).
//   'sunrise'  — adds a tithi-at-sunrise fallback for kshaya tithis
//                where the window-strict rule produces NO match in
//                this paksha. Used by festivals like Vijayadashami /
//                Janmashtami / Karva Chauth where Drik defers to
//                sunrise observance in tithi-kshaya years.
function vyapiniShukla(
  tithi: number,
  masa: string,
  window: 'pradosha' | 'nishita' | 'aparahna' | 'madhyahna',
  pick: 'earlier' | 'later' = 'earlier',
  fallback: 'strict' | 'sunrise' = 'strict',
) {
  return (p: Panchanga): boolean => {
    if (p.masa.amantaName !== masa || p.masa.isAdhika) return false;
    if (fallback === 'sunrise') {
      return vyapiniWithSunriseFallback(p, window, SHUKLA(tithi), pick);
    }
    return vyapiniMatches(p, window, SHUKLA(tithi), pick);
  };
}

function vyapiniKrishna(
  tithi: number,
  masa: string,
  window: 'pradosha' | 'nishita' | 'aparahna' | 'madhyahna' | 'chandrodaya',
  pick: 'earlier' | 'later' = 'earlier',
  fallback: 'strict' | 'sunrise' = 'strict',
) {
  return (p: Panchanga): boolean => {
    if (p.masa.amantaName !== masa || p.masa.isAdhika) return false;
    if (fallback === 'sunrise') {
      return vyapiniWithSunriseFallback(p, window, KRISHNA(tithi), pick);
    }
    return vyapiniMatches(p, window, KRISHNA(tithi), pick);
  };
}

// Bhadra-Kaal aware Shukla-paksha festival rule (used by Holika Dahan
// and Raksha Bandhan). When Vishti (Bhadra) is active at the window
// center on day X, observance shifts to day X+1 even if the target
// tithi isn't at X+1's window. See `bhadraAwareVyapiniMatches`.
function vyapiniShuklaBhadra(
  tithi: number,
  masa: string,
  window: 'pradosha' | 'aparahna',
) {
  return (p: Panchanga): boolean => {
    // For the "shifted" day (Case B in bhadraAwareVyapiniMatches),
    // today's masa might already have ticked over to the next krishna
    // half — but in Amanta convention Phalguna/Shravana still own
    // their Krishna 1 day. Allow either Purnima-of-target-masa or
    // Krishna-1-of-target-masa under amantaName.
    if (p.masa.amantaName !== masa || p.masa.isAdhika) return false;
    return bhadraAwareVyapiniMatches(p, window, SHUKLA(tithi));
  };
}

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

// Solar sankrantis use the Drik "Punya Kaal" sunset rule: if the Sun
// enters the target sidereal sign *after* sunset on day N, observance
// shifts to day N+1. See `sankrantiInto` in tiebreakers.ts.
const isSankrantiInto = sankrantiInto;

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
    // Drik: Nishita-vyapini Chaturdashi. Earlier-day winner when the
    // tithi spans two midnights — the Pradosh-Nishita Mukhya rule
    // prefers the day where Chaturdashi has been longer in nishita.
    matches: vyapiniKrishna(14, 'Magha', 'nishita', 'earlier'),
  },

  // Vasant Panchami — Magha Shukla 5. Drik uses Purvahna-vyapini
  // (morning) Panchami, which for the years we audit matches the
  // simple "tithi at sunrise" rule exactly. Keep the simpler rule.
  {
    key: 'vasant_panchami',
    displayName: 'Vasant Panchami',
    displayNameHi: 'वसंत पंचमी',
    matches: inShukla(5, 'Magha'),
  },

  // Holika Dahan — Phalguna Shukla 15. Drik: Pradosha-vyapini Purnima
  // with Bhadra exclusion. When Vishti (Bhadra) blocks the pradosha
  // window on the standard day, observance shifts to the next day —
  // see `bhadraAwareVyapiniMatches`.
  {
    key: 'holika_dahan',
    displayName: 'Holika Dahan',
    displayNameHi: 'होलिका दहन',
    matches: vyapiniShuklaBhadra(15, 'Phalguna', 'pradosha'),
  },
  // Holi (Dhuleti) — the day AFTER Holika Dahan. Computed by replaying
  // the Holika Dahan condition on yesterday's date. This is more
  // accurate than "Phalguna Krishna 1 at sunrise" because in
  // Bhadra-shift years and tithi-kshaya years the simple sunrise rule
  // diverges by ±1 day.
  {
    key: 'holi',
    displayName: 'Holi (Dhuleti)',
    displayNameHi: 'होली (धुलेटी)',
    matches: (p) => {
      // In Amanta convention, Holi falls on a day whose amantaName is
      // still Phalguna (Krishna 1 of Phalguna), so we don't need to
      // load yesterday's masa — we can gate on today's masa.
      if (p.masa.amantaName !== 'Phalguna' || p.masa.isAdhika) return false;
      const yesterday = new Date(p.date.getTime() - 86_400_000);
      // Replay the Bhadra-aware Holika Dahan check for `yesterday`
      // using the date-based primitive (no yesterday-Panchanga needed).
      return bhadraAwareVyapiniMatchesForDate(p.location, yesterday, 'pradosha', SHUKLA(15));
    },
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

  // Akshaya Tritiya — Vaishakha Shukla 3. Sunrise rule matches Drik
  // for the audit window.
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

  // Nag Panchami — Shravana Shukla 5. Sunrise rule matches Drik.
  {
    key: 'nag_panchami',
    displayName: 'Nag Panchami',
    displayNameHi: 'नाग पंचमी',
    matches: inShukla(5, 'Shravana'),
  },

  // Raksha Bandhan — Shravana Shukla 15. Aparahna-vyapini Purnima.
  // Any Bhadra at Aparahna shifts to next day (Raksha must be done in
  // daytime — no late-night fallback like Holika). Sunrise fallback
  // covers tithi-kshaya years where Purnima doesn't span Aparahna on
  // either side (e.g., 2025).
  {
    key: 'raksha_bandhan',
    displayName: 'Raksha Bandhan',
    displayNameHi: 'रक्षा बंधन',
    // Drik rule: Bhadra at Aparahna only blocks if it extends past
    // the end of Prahar 1 of the night (~2h30m after sunset). Bhadra
    // ending in Prahar 1 is acceptable — Rakhi can be tied during
    // the late-afternoon / early-evening Pradosha after Bhadra ends.
    // Sunrise fallback covers tithi-kshaya years (e.g., 2025) where
    // Purnima doesn't span Aparahna on either side.
    matches: (p) => {
      if (p.masa.amantaName !== 'Shravana' || p.masa.isAdhika) return false;
      return bhadraAwareVyapiniWithSunriseFallback(p, 'aparahna', SHUKLA(15), 'prahar1');
    },
  },

  // Krishna Janmashtami — Shravana Krishna 8. Smarta convention picks
  // the LATER night when Ashtami covers two midnights. Falls back to
  // tithi-at-sunrise day in tithi-kshaya years where Nishita doesn't
  // qualify on any day.
  {
    key: 'krishna_janmashtami',
    displayName: 'Krishna Janmashtami',
    displayNameHi: 'कृष्ण जन्माष्टमी',
    matches: vyapiniKrishna(8, 'Shravana', 'nishita', 'later', 'sunrise'),
  },

  // Ganesh Chaturthi — Bhadrapada Shukla 4 (Madhyahna-vyapini).
  {
    key: 'ganesh_chaturthi',
    displayName: 'Ganesh Chaturthi',
    displayNameHi: 'गणेश चतुर्थी',
    matches: vyapiniShukla(4, 'Bhadrapada', 'madhyahna'),
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

  // Vijayadashami / Dussehra — Ashvina Shukla 10. Drik's rule prefers
  // the Aparahna-vyapini Dashami day on which **Shravana nakshatra**
  // is also present at Aparahna. Without Shravana, the earlier of two
  // qualifying days wins. Sunrise fallback for tithi-kshaya years.
  {
    key: 'vijayadashami',
    displayName: 'Vijayadashami (Dussehra)',
    displayNameHi: 'विजयदशमी (दशहरा)',
    matches: (p) => {
      if (p.masa.amantaName !== 'Ashvina' || p.masa.isAdhika) return false;
      return vyapiniWithNakshatraPreference(p, 'aparahna', SHUKLA(10), NAK_SHRAVANA);
    },
  },

  // Karva Chauth — Ashvina Krishna 4 (Chandrodaya-vyapini Chaturthi:
  // Chaturthi must be present at moonrise). Sunrise fallback when
  // Chaturthi doesn't span moonrise on either side (tithi-kshaya
  // years like 2016, 2025).
  {
    key: 'karva_chauth',
    displayName: 'Karva Chauth',
    displayNameHi: 'करवा चौथ',
    matches: vyapiniKrishna(4, 'Ashvina', 'chandrodaya', 'earlier', 'sunrise'),
  },

  // Dhanteras — Ashvina Krishna 13 (Pradosha-vyapini Trayodashi).
  {
    key: 'dhanteras',
    displayName: 'Dhanteras',
    displayNameHi: 'धनतेरस',
    matches: vyapiniKrishna(13, 'Ashvina', 'pradosha'),
  },

  // Naraka Chaturdashi — Ashvina Krishna 14. Drik observes Abhyanga
  // Snan at Chandrodaya in the early-morning hours; we approximate
  // with the sunrise tithi which matches Drik in most years.
  {
    key: 'naraka_chaturdashi',
    displayName: 'Naraka Chaturdashi',
    displayNameHi: 'नरक चतुर्दशी',
    matches: inKrishna(14, 'Ashvina'),
  },

  // Diwali / Lakshmi Puja — Ashvina Krishna Amavasya (Pradosha-vyapini
  // Amavasya). Picks the day where Amavasya is present at the evening
  // pradosha window.
  {
    key: 'diwali',
    displayName: 'Diwali (Lakshmi Puja)',
    displayNameHi: 'दीवाली (लक्ष्मी पूजा)',
    matches: vyapiniKrishna(15, 'Ashvina', 'pradosha'),
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

  // Kartik Purnima — Kartika Shukla 15. Sunrise rule matches Drik
  // across the audit window; the Pradosha-vyapini variant
  // over-corrects because Drik anchors observance to Krittika
  // nakshatra rather than Pradosha for this festival.
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
