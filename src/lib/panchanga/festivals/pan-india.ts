// Pan-India festival rules — Phase 1 set.
//
// Most rules follow "tithi N of paksha P in Amanta-month M". Critically,
// when the festival is in a Krishna paksha, we always match against
// `p.masa.amantaName` — the system-invariant canonical Amanta name —
// rather than `p.masa.name`. Otherwise a single physical festival day
// would fire twice for a Purnimanta user (once under each system's
// month label).
//
// The 6 monthly recurrences (Ekadashi, Pradosh, Sankashti Chaturthi, Amavasya,
// Purnima, Masik Shivaratri) appear at the bottom; their keys are listed in
// MONTHLY_OBSERVANCE_KEYS, which the annual Festivals walk uses to skip them.
//
// Naming choices per docs/ARCHITECTURE.md §14: Smarta defaults. docs/guide/
// documents the tie-breakers we apply for Janmashtami, Diwali, and a
// few others.

import type { Panchanga } from '../types';
import type { FestivalRule } from './rules';
import { civilYMDInZone, dateToJulian, MS_PER_DAY } from '$lib/astro';
import { masaContext } from '../masa';
import {
  vyapiniMatches,
  bhadraAwareVyapiniWithSunriseFallback,
  bhadraAwareVyapiniWithSunriseFallbackForDate,
  vyapiniWithSunriseFallback,
  vyapiniWithNakshatraPreference,
  smartaJanmashtamiMatches,
  sankrantiInto,
  kartikaPratipadaBridgeDay,
  sunriseTithiObservedForDate,
  sunriseTithiIndex,
} from '../tiebreakers';

// Amanta month order, for the kshaya-Pratipada boundary rule in `inShukla`.
const AMANTA_ORDER = [
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
const prevAmanta = (m: string): string => {
  const i = AMANTA_ORDER.indexOf(m);
  return i < 0 ? m : AMANTA_ORDER[(i + 11) % 12];
};

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
// `fallback` (default 'sunrise'):
//   'sunrise'  — when the window-strict rule finds NO day in this paksha (a
//                kshaya / short tithi that pervades no window), fall back to the
//                day the tithi is observed at sunrise, so the festival never
//                vanishes. This is the default for every vyapini festival.
//   'strict'   — the named-window check only, no fallback.
function vyapiniShukla(
  tithi: number,
  masa: string,
  window: 'pradosha' | 'nishita' | 'aparahna' | 'madhyahna',
  pick: 'earlier' | 'later' = 'earlier',
  fallback: 'strict' | 'sunrise' = 'sunrise',
) {
  return (p: Panchanga): boolean => {
    if (p.masa.amantaName !== masa || p.masa.isAdhika) return false;
    // Shukla 1 (Pratipada): month M's OWN Amavasya is not a Pratipada day — the
    // Pratipada that begins there belongs to M+1 — so the kshaya fallback must
    // not fire a month late on it. (Genuine M Shukla 1 has sunrise = 1, not 30.)
    if (tithi === 1 && sunriseTithiIndex(p.location, p.date) === 30) return false;
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
  fallback: 'strict' | 'sunrise' = 'sunrise',
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
// center on day X, observance may shift to day X+1 depending on the
// caller's cutoff.
function vyapiniShuklaBhadra(
  tithi: number,
  masa: string,
  window: 'pradosha' | 'aparahna',
  // Current festival wiring passes this explicitly. The default is
  // preserved for experiments and should not be read as the Holika
  // Dahan convention.
  cutoff: 'sunset' | 'prahar1' | 'prahar4' | 'brahmaMuhurta' = 'brahmaMuhurta',
) {
  return (p: Panchanga): boolean => {
    // Gate on the target Amanta month (system-invariant); the Bhadra-aware
    // helper handles any shift to the next day itself.
    if (p.masa.amantaName !== masa || p.masa.isAdhika) return false;
    return bhadraAwareVyapiniWithSunriseFallback(p, window, SHUKLA(tithi), cutoff);
  };
}

// Shukla-paksha festivals: month name is the same in Amanta and
// Purnimanta, so we can match either `masa.name` or `masa.amantaName` —
// we use `amantaName` for consistency with the Krishna helpers.
function inShukla(tithiNumber: number, amantaMasa: string) {
  return (p: Panchanga): boolean => {
    if (p.masa.isAdhika) return false;
    const today = sunriseTithiIndex(p.location, p.date);
    if (today === null) return false;
    if (today === tithiNumber) {
      // Genuine sunrise tithi, this month — fire on the FIRST day of a vriddhi
      // (doubled tithi), i.e. only when yesterday's sunrise wasn't it already.
      if (p.masa.amantaName !== amantaMasa) return false;
      return sunriseTithiIndex(p.location, new Date(p.date.getTime() - MS_PER_DAY)) !== tithiNumber;
    }
    // Kshaya: the tithi is skipped — observed on the day it falls within (sunrise
    // = tithi-1, next sunrise = tithi+1, modular at the month boundary).
    const prev = tithiNumber === 1 ? 30 : tithiNumber - 1;
    const next = tithiNumber === 30 ? 1 : tithiNumber + 1;
    if (today !== prev) return false;
    if (sunriseTithiIndex(p.location, new Date(p.date.getTime() + MS_PER_DAY)) !== next)
      return false;
    if (tithiNumber !== 1) {
      // A non-Pratipada kshaya tithi falls mid-month (labelled M).
      return p.masa.amantaName === amantaMasa;
    }
    // A kshaya Pratipada begins on the PRIOR month's Amavasya (labelled M-1) —
    // which stops it from firing on month M's own Amavasya.
    if (p.masa.amantaName !== prevAmanta(amantaMasa)) return false;
    // ...and the new month beginning here must be NIJA, not the leap (Adhika)
    // month: festivals skip Adhika maas. (Edge: Adhika + kshaya Pratipada, e.g.
    // Chaitra 1964.) Adhika ⇔ the Sun crosses no sign during the lunar month.
    const ctx = masaContext(
      dateToJulian(new Date(p.date.getTime() + MS_PER_DAY)),
      p.options.ayanamsa,
    );
    return (ctx.signAtEnd - ctx.signAtStart + 12) % 12 !== 0;
  };
}

// Krishna-paksha festivals: must dispatch on the canonical Amanta name,
// not the display name. In Purnimanta the same Krishna paksha is
// re-labelled as the next month, so a `(Ashvina || Kartika)` OR-rule
// would fire on TWO different lunar months (Bhadrapada-krishna and
// Ashvina-krishna for a Purnimanta user). Using `amantaName` keys on
// the underlying lunar bracket regardless of display system.
function inKrishna(tithiNumber: number, amantaMasa: string) {
  return (p: Panchanga): boolean =>
    p.masa.amantaName === amantaMasa &&
    !p.masa.isAdhika &&
    sunriseTithiObservedForDate(p.location, p.date, 15 + tithiNumber);
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
  const { month, day } = civilYMDInZone(p.date, p.location.timezone);
  return month === 1 && day === 13;
}

// The monthly recurrences — these fire ~12-24× a year, so the annual Festivals
// list excludes them (they'd swamp it); they surface in the Day view instead.
// Used by the annual-walk fast path to skip their (vyapini-heavy) evaluation,
// and by the festival loader to filter the year list. Single source of truth.
export const MONTHLY_OBSERVANCE_KEYS: ReadonlySet<string> = new Set([
  'ekadashi',
  'pradosh',
  'sankashti_chaturthi',
  'amavasya',
  'purnima',
  'masik_shivaratri',
]);

export const PAN_INDIA_FESTIVALS: readonly FestivalRule[] = [
  // --- Major Phase 1 list (per docs/ARCHITECTURE.md §7) ---

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

  // Holika Dahan — Phalguna Shukla 15. Drik rule: Pradosha-vyapini
  // Purnima with later-day preference + Bhadra exclusion at the
  // start of Prahar 4 (≈3/4 of night).
  //
  // Known divergences (years where prahar4 gives ±1 day vs Drik):
  //   2012: app=Mar 8, Drik=Mar 7 — Bhadra ends 04:35 (past prahar4
  //         03:35), gap to sunrise 123.8 min; Drik doesn't shift.
  //   2013: app=Mar 27, Drik=Mar 26 — Bhadra ends 03:45 (past prahar4
  //         03:22), gap to sunrise 151.9 min; Drik doesn't shift.
  //   Both cases: Bhadra extends past Prahar 4 but ends ~25-28 min
  //   before Brahma Muhurta, and Drik fires on the same day. In 2016
  //   (Bhadra ends ~25 min before BM, Drik shifts) the pattern is
  //   almost identical. The discriminating margin is ≤3 min — below
  //   ephemeris precision. No robust closed-form rule distinguishes
  //   these cases. Prahar 4 is the best approximation: it is correct
  //   for all years in the main 2015-2028 audit window.
  {
    key: 'holika_dahan',
    displayName: 'Holika Dahan',
    displayNameHi: 'होलिका दहन',
    matches: vyapiniShuklaBhadra(15, 'Phalguna', 'pradosha', 'prahar4'),
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
      const yesterday = new Date(p.date.getTime() - MS_PER_DAY);
      // Replay the Bhadra-aware Holika Dahan check for `yesterday`
      // using the date-based primitive (no yesterday-Panchanga needed).
      return bhadraAwareVyapiniWithSunriseFallbackForDate(
        p.location,
        yesterday,
        'pradosha',
        SHUKLA(15),
        'prahar4',
      );
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

  // Krishna Janmashtami — Shravana Krishna 8 (Smarta default).
  // Ashtami must prevail during the Nishita Kaal INTERVAL (8th of 15
  // night-muhurtas, ~44 min wide), not just at its center. Critical
  // for locations east of Delhi where Nishita is ~45 min earlier and
  // a center-point check misses Ashtami's late-night entry. Split-year
  // Vaishnava/ISKCON dates should be added as explicit variants rather
  // than changing this default.
  {
    key: 'krishna_janmashtami',
    displayName: 'Krishna Janmashtami',
    displayNameHi: 'कृष्ण जन्माष्टमी',
    matches: (p) => smartaJanmashtamiMatches(p, 'Shravana'),
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
  // pradosha window. Uses sunrise fallback for rare years (e.g. 2013)
  // when the new moon occurs between sunrise and pradosha, so the strict
  // pradosha probe finds Pratipada instead of Amavasya.
  {
    key: 'diwali',
    displayName: 'Diwali (Lakshmi Puja)',
    displayNameHi: 'दीवाली (लक्ष्मी पूजा)',
    matches: vyapiniKrishna(15, 'Ashvina', 'pradosha', 'earlier', 'sunrise'),
  },

  // Govardhan Puja — Kartika Shukla 1, madhyahna-vyapini, later pick.
  //
  // The classical rule: Govardhan is observed on the day when Kartika
  // Shukla Pratipada (Shukla 1) is present at MADHYAHNA (midday).
  // 'Later' pick: when Pratipada spans two consecutive middays, the
  // later (clean Kartika) day wins.
  //
  // kartikaPratipadaBridgeDay handles edge cases where the panchanga
  // masa is still 'Ashvina' at sunrise (Pratipada starts after sunrise):
  //   Vyapini (2010-11-06): Pratipada starts 10:22 AM < noon. Madhyahna
  //     = Pratipada ✓. Nov 7 madhyahna = Dvitiya. Bridge fires. ✓
  //   Kshaya (2029-11-06): Pratipada starts 09:53 AM < noon. Bridge. ✓
  //   Non-bridge (2022, 2023): Amavasya ends after noon → bridge does
  //     NOT fire; clean Kartika day has Pratipada at noon instead. ✓
  {
    key: 'govardhan_puja',
    displayName: 'Govardhan Puja',
    displayNameHi: 'गोवर्धन पूजा',
    matches: (p: Panchanga) =>
      vyapiniShukla(1, 'Kartika', 'madhyahna', 'later', 'sunrise')(p) ||
      kartikaPratipadaBridgeDay(p),
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
    // Both pakshas, vriddhi-aware (purvaviddha) so a doubled Ekadashi fires on a
    // single day rather than two consecutive sunrises.
    matches: (p) =>
      sunriseTithiObservedForDate(p.location, p.date, 11) ||
      sunriseTithiObservedForDate(p.location, p.date, 26),
  },
  {
    key: 'pradosh',
    displayName: 'Pradosh Vrat',
    displayNameHi: 'प्रदोष व्रत',
    // Trayodashi prevailing at the pradosha (early-evening) window — Pradosh is an
    // evening vrat, so it follows the same window rule as the marquee festivals.
    matches: (p) =>
      vyapiniWithSunriseFallback(p, 'pradosha', 13, 'earlier') ||
      vyapiniWithSunriseFallback(p, 'pradosha', 28, 'earlier'),
  },
  {
    key: 'sankashti_chaturthi',
    displayName: 'Sankashti Chaturthi',
    displayNameHi: 'संकष्टी चतुर्थी',
    // Krishna Chaturthi prevailing at MOONRISE (chandrodaya) — Sankashti's
    // defining rule (the same one Karwa Chauth uses), often a day off from the
    // sunrise tithi.
    matches: (p) => vyapiniWithSunriseFallback(p, 'chandrodaya', 19, 'earlier'),
  },
  {
    key: 'amavasya',
    displayName: 'Amavasya',
    displayNameHi: 'अमावस्या',
    // SOURCED. Darsha Amavasya = the day the Amavasya tithi (30) prevails at
    // APARAHNA (afternoon), even when it is not present at sunrise. Basis: shraddha
    // is an aparahna rite — Dharmasindhu, Shraddha prakarana, states "Parvana
    // shraddha has to be of aparahna-prapti" — so the Darsha (monthly-amavasya)
    // shraddha is taken on the aparahna-vyapini Amavasya. Cross-checked vs
    // drikpanchang per-city: Delhi 2026 + Kolkata 2025, 24/24. Sunrise fallback
    // keeps a kshaya Amavasya at exactly one day per lunar month.
    matches: (p) => vyapiniWithSunriseFallback(p, 'aparahna', 30, 'earlier'),
  },
  {
    key: 'purnima',
    displayName: 'Purnima',
    displayNameHi: 'पूर्णिमा',
    // DRIK-ALIGNED (not independently sourced — be honest). We take the
    // aparahna-vyapini day because it reproduces drikpanchang's published "Purnima
    // dates" exactly (Delhi 2026 + Kolkata 2025, 25/25). Unlike Amavasya there is
    // no single primary-text Purnima day rule: the textbook generic-vrat rule is
    // MOONRISE and snana/dana is SUNRISE — neither matches Drik's list on boundary
    // days, whereas aparahna (the same window Amavasya/Raksha-Bandhan use) does.
    // So this is calibrated to Drik, the project's reference, not derived from a
    // single authority. Sunrise fallback covers a kshaya Purnima.
    matches: (p) => vyapiniWithSunriseFallback(p, 'aparahna', 15, 'earlier'),
  },
  {
    key: 'masik_shivaratri',
    displayName: 'Masik Shivaratri',
    displayNameHi: 'मासिक शिवरात्रि',
    // Krishna Chaturdashi at nishita (midnight) every month except Magha (that
    // one is the major Maha Shivaratri above).
    matches: (p) =>
      p.masa.amantaName !== 'Magha' && vyapiniWithSunriseFallback(p, 'nishita', 29, 'earlier'),
  },
];
