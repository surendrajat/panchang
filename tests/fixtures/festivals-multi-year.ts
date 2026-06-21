// Multi-year festival fixture. Authoritative dates for the Delhi /
// Indian-standard-time observance. Most are published by Drik Panchang
// (drikpanchang.com); convention split years use the app's documented
// Smarta default. Used by tests/regression/festivals-multi-year.test.ts.
//
// Two tiers:
//
//   `strict`: festivals where the current rule consistently
//             agrees with Drik across the year window. A mismatch
//             here is a hard regression failure.
//
//   `tiebreaker`: festivals whose expected date is decided by an
//             additional rule (Pradosha / Madhyahna / Nishita /
//             Aparahna / Chandrodaya / Bhadra / Sankranti cutoff).
//             Most are now implemented; this bucket stays soft while
//             convention-sensitive variants are still being expanded.
//
// Sources: drikpanchang.com year-list pages and per-festival archive
// entries unless a fixture note says otherwise. Dates are YYYY-MM-DD
// in Asia/Kolkata civil time.

export interface FestivalFixture {
  key: string;
  /** Map of year → expected date for the documented default convention. */
  expected: Record<number, string>;
  /** Strict fixtures must match exactly; tiebreaker fixtures use a baseline floor. */
  auditTier?: 'strict' | 'tiebreaker';
  /** Describes the implemented/expected rule for tiebreaker-dependent dates. */
  ruleNote?: string;
  /** Real unresolved mismatch or convention problem, if any. */
  knownIssue?: string;
}

export const FESTIVAL_FIXTURES: FestivalFixture[] = [
  // ──────────────────────────────────────────────────────────────────
  //  STRICT — sunrise rule matches Drik across the window.
  // ──────────────────────────────────────────────────────────────────

  // Rama Navami is MADHYAHNA-vyapini (Rama born at midday), not the plain sunrise
  // rule — see pan-india.ts. On boundary years the sunrise output coincides with
  // the VAISHNAVA date; these are the Smarta dates (= Drik primary + Govt-of-India
  // gazetted list). 2013/2017/2019/2026/2028 were previously pinned to the wrong
  // (sunrise/Vaishnava) day — verified vs Drik New Delhi: 2013-04-19, 2017-04-04,
  // 2026-03-26 (and Govt 2026 = Mar 26).
  {
    key: 'rama_navami',
    expected: {
      2015: '2015-03-28',
      2016: '2016-04-15',
      2017: '2017-04-04',
      2019: '2019-04-13',
      2020: '2020-04-02',
      2021: '2021-04-21',
      2022: '2022-04-10',
      2023: '2023-03-30',
      2024: '2024-04-17',
      2025: '2025-04-06',
      2026: '2026-03-26',
      2027: '2027-04-15',
      2028: '2028-04-03',
    },
  },
  {
    key: 'hanuman_jayanti',
    expected: {
      2015: '2015-04-04',
      2016: '2016-04-22',
      2017: '2017-04-11',
      2018: '2018-03-31',
      2019: '2019-04-19',
      2020: '2020-04-08',
      2021: '2021-04-27',
      2022: '2022-04-16',
      2023: '2023-04-06',
      2024: '2024-04-23',
      2025: '2025-04-12',
      2026: '2026-04-02',
    },
  },
  {
    key: 'buddha_purnima',
    expected: {
      2015: '2015-05-04',
      2016: '2016-05-21',
      2017: '2017-05-10',
      2018: '2018-04-30',
      2019: '2019-05-18',
      2020: '2020-05-07',
      2021: '2021-05-26',
      2022: '2022-05-16',
      2023: '2023-05-05',
      2024: '2024-05-23',
      2025: '2025-05-12',
      2026: '2026-05-01',
    },
  },
  {
    key: 'guru_purnima',
    expected: {
      2015: '2015-07-31',
      2016: '2016-07-19',
      2017: '2017-07-09',
      2018: '2018-07-27',
      2019: '2019-07-16',
      2020: '2020-07-05',
      2021: '2021-07-24',
      2022: '2022-07-13',
      2023: '2023-07-03',
      2024: '2024-07-21',
      2025: '2025-07-10',
      2026: '2026-07-29',
    },
  },
  {
    key: 'navaratri_start',
    expected: {
      2015: '2015-10-13',
      2016: '2016-10-01',
      2017: '2017-09-21',
      2018: '2018-10-10',
      2019: '2019-09-29',
      2020: '2020-10-17',
      2021: '2021-10-07',
      2022: '2022-09-26',
      2023: '2023-10-15',
      2024: '2024-10-03',
      2025: '2025-09-22',
      2026: '2026-10-11',
    },
  },
  {
    key: 'govardhan_puja',
    expected: {
      2015: '2015-11-12',
      2016: '2016-10-31',
      2017: '2017-10-20',
      2018: '2018-11-08',
      2020: '2020-11-15',
      2021: '2021-11-05',
      2022: '2022-10-26',
      2023: '2023-11-14',
      2024: '2024-11-02',
      2025: '2025-10-22',
    },
  },

  // ──────────────────────────────────────────────────────────────────
  //  TIEBREAKER-DEPENDENT — sunrise rule diverges on specific years.
  // ──────────────────────────────────────────────────────────────────

  {
    key: 'makara_sankranti',
    auditTier: 'tiebreaker',
    ruleNote:
      'Implemented: bisection-found sidereal Makara transit with sunset cutoff; if transit is after sunset, observance shifts to next civil day.',
    expected: {
      // Verified against drikpanchang.com Indian calendar (geoname
      // 1273294 = New Delhi). Earlier transcription had 2015 and
      // 2027 as Jan 14 — both years actually have transit after
      // sunset Jan 14 IST, so Drik observes on Jan 15. Corrected
      // after direct cross-check 2026-05.
      2015: '2015-01-15',
      2016: '2016-01-15',
      2017: '2017-01-14',
      2018: '2018-01-14',
      2019: '2019-01-15',
      2020: '2020-01-15',
      2021: '2021-01-14',
      2022: '2022-01-14',
      2023: '2023-01-15',
      2024: '2024-01-15',
      2025: '2025-01-14',
      2026: '2026-01-14',
      2027: '2027-01-15',
    },
  },
  {
    key: 'vasant_panchami',
    auditTier: 'tiebreaker',
    ruleNote:
      'Rule: Purvahna-vyapini Panchami (forenoon) — Drik takes the day Panchami pervades sunrise..midday. Now implemented (was the sunrise approximation); verified vs Drik New Delhi 2024-2028, incl the 2028 boundary (Jan 31, not the sunrise Feb 1).',
    expected: {
      2015: '2015-01-24',
      2017: '2017-02-01',
      2018: '2018-01-22',
      2019: '2019-02-10',
      2020: '2020-01-30',
      2021: '2021-02-16',
      2022: '2022-02-05',
      2023: '2023-01-26',
      2024: '2024-02-14',
      2026: '2026-01-23',
      2027: '2027-02-11',
      2028: '2028-01-31', // purvahna/Drik (was the sunrise approximation 2028-02-01)
    },
  },
  {
    key: 'akshaya_tritiya',
    auditTier: 'tiebreaker',
    ruleNote:
      'Rule: PURVAHNA-vyapini Tritiya (Nirnaya Sindhu "पूर्वाह्णव्यापिनी ग्राह्या"), forenoon span-overlap with the later-day-wins-iff-its-forenoon->6-ghatika tie-break — NOT madhyahna, NOT sunrise. Now implemented; 2026 corrected 04-20 (old sunrise) -> 04-19 (authoritative/Drik).',
    expected: {
      2015: '2015-04-21',
      2016: '2016-05-09',
      2018: '2018-04-18',
      2019: '2019-05-07',
      2020: '2020-04-26',
      2022: '2022-05-03',
      2024: '2024-05-10',
      2025: '2025-04-30',
      2026: '2026-04-19', // purvahna/authoritative (was the sunrise approximation 04-20)
    },
  },
  {
    key: 'nag_panchami',
    auditTier: 'tiebreaker',
    ruleNote:
      'Rule note: Drik uses Madhyahna-vyapini Panchami of Shravana; pinned years currently match.',
    expected: {
      2016: '2016-08-07',
      2018: '2018-08-15',
      2019: '2019-08-05',
      2020: '2020-07-25',
      2021: '2021-08-13',
      2022: '2022-08-02',
      2023: '2023-08-21',
      2024: '2024-08-09',
      2025: '2025-07-29',
      2026: '2026-08-17',
    },
  },
  {
    key: 'raksha_bandhan',
    auditTier: 'tiebreaker',
    ruleNote:
      'Implemented: Aparahna-vyapini Purnima with Bhadra cutoff and sunrise fallback for short-tithi years.',
    expected: {
      2015: '2015-08-29',
      2016: '2016-08-18',
      2017: '2017-08-07',
      2018: '2018-08-26',
      2019: '2019-08-15',
      2020: '2020-08-03',
      2021: '2021-08-22',
      2022: '2022-08-11',
      2023: '2023-08-30',
      2024: '2024-08-19',
      2025: '2025-08-09',
      2026: '2026-08-28',
    },
  },
  {
    key: 'ganesh_chaturthi',
    auditTier: 'tiebreaker',
    ruleNote: 'Implemented: Madhyahna-vyapini Chaturthi.',
    expected: {
      2015: '2015-09-17',
      2016: '2016-09-05',
      2017: '2017-08-25',
      2018: '2018-09-13',
      2019: '2019-09-02',
      2020: '2020-08-22',
      2021: '2021-09-10',
      2022: '2022-08-31',
      2023: '2023-09-19',
      2024: '2024-09-07',
      2025: '2025-08-27',
      2026: '2026-09-14',
    },
  },
  {
    key: 'vijayadashami',
    auditTier: 'tiebreaker',
    ruleNote:
      'Implemented: Aparahna-vyapini Dashami with Shravana-nakshatra preference and sunrise fallback.',
    expected: {
      2015: '2015-10-22',
      2016: '2016-10-11',
      2017: '2017-09-30',
      2018: '2018-10-19',
      2019: '2019-10-08',
      2020: '2020-10-25',
      2021: '2021-10-15',
      2022: '2022-10-05',
      2023: '2023-10-24',
      2024: '2024-10-12',
      2025: '2025-10-02',
      2026: '2026-10-20',
    },
  },
  {
    key: 'kartik_purnima',
    auditTier: 'tiebreaker',
    ruleNote:
      'Rule note: pinned years match the sunrise Purnima rule; some traditions use Pradosha/Krittika refinements.',
    expected: {
      2016: '2016-11-14',
      2017: '2017-11-04',
      2018: '2018-11-23',
      2019: '2019-11-12',
      2020: '2020-11-30',
      2021: '2021-11-19',
      2022: '2022-11-08',
      2023: '2023-11-27',
      2024: '2024-11-15',
      2025: '2025-11-05',
      2026: '2026-11-24',
    },
  },

  // ── Tiebreaker family (Pradosha/Nishita/Chandrodaya) — already
  // documented; included so the test surface stays comprehensive.

  {
    key: 'diwali',
    auditTier: 'tiebreaker',
    ruleNote: 'Implemented: Pradosha-vyapini Amavasya.',
    expected: {
      2015: '2015-11-11',
      2016: '2016-10-30',
      2017: '2017-10-19',
      2018: '2018-11-07',
      2019: '2019-10-27',
      2020: '2020-11-14',
      2021: '2021-11-04',
      2022: '2022-10-24',
      2023: '2023-11-12',
      2024: '2024-10-31',
      // 2025 corrected after direct cross-check against
      // drikpanchang.com (Oct 20, Monday). Amavasya Oct 20 15:46
      // IST to Oct 21 17:55 IST — only Oct 20 has Amavasya at
      // Pradosha.
      2025: '2025-10-20',
      2026: '2026-11-08',
    },
  },
  {
    key: 'holika_dahan',
    auditTier: 'tiebreaker',
    ruleNote:
      'Implemented for main fixtures: Pradosha-vyapini Phalguna Purnima with Prahar-4 Bhadra cutoff.',
    knownIssue:
      '2012 and 2013 are known extended-year Holika/Holi edge cases where the Prahar-4 cutoff incorrectly shifts by 1 day (Drik: 2012=Mar 7, 2013=Mar 26; app gives Mar 8 and Mar 27). Both years have Bhadra extending past Prahar 4 but ending ~25-28 min before Brahma Muhurta — a 3-minute discriminating margin below ephemeris precision.',
    expected: {
      2015: '2015-03-05',
      2016: '2016-03-23',
      2017: '2017-03-12',
      2019: '2019-03-20',
      2020: '2020-03-09',
      2021: '2021-03-28',
      2022: '2022-03-17',
      2023: '2023-03-07',
      2024: '2024-03-24',
      2025: '2025-03-13',
      2026: '2026-03-03',
    },
  },
  {
    key: 'holi',
    auditTier: 'tiebreaker',
    ruleNote: 'Implemented: day after computed Holika Dahan.',
    expected: {
      2015: '2015-03-06',
      2016: '2016-03-24',
      2017: '2017-03-13',
      2018: '2018-03-02',
      2019: '2019-03-21',
      2020: '2020-03-10',
      2021: '2021-03-29',
      2022: '2022-03-18',
      2023: '2023-03-08',
      2024: '2024-03-25',
      2025: '2025-03-14',
      2026: '2026-03-04',
    },
  },
  {
    key: 'maha_shivaratri',
    auditTier: 'tiebreaker',
    ruleNote: 'Implemented for pinned years: Nishita-vyapini Chaturdashi.',
    expected: {
      2015: '2015-02-17',
      2016: '2016-03-07',
      2017: '2017-02-24',
      2018: '2018-02-13',
      2019: '2019-03-04',
      2020: '2020-02-21',
      2021: '2021-03-11',
      2022: '2022-03-01',
      2023: '2023-02-18',
      2024: '2024-03-08',
      2025: '2025-02-26',
      2026: '2026-02-15',
    },
  },
  {
    key: 'krishna_janmashtami',
    auditTier: 'tiebreaker',
    ruleNote:
      'Default: Smarta Ashtami-at-Nishita with sunrise fallback — a legitimate convention (used by e.g. the Samvat panchang and the Bangladesh govt holiday). GENUINELY CONTESTED ~1 year in 3 (when Ashtami & Rohini do not coincide): Drik adds the Rohini/Jayanti shift, giving a different date (2027 Aug 25, 2029 Sep 1 vs our Aug 24, Aug 31). We intentionally keep the simpler Ashtami-Nishita rule, not Rohini; verified multi-source 2026-06. Further Vaishnava/ISKCON dates also not pinned here.',
    expected: {
      2015: '2015-09-05',
      // Split year: Smarta references publish Aug 24; Vaishnava/ISKCON
      // references publish Aug 25. The app default is Smarta.
      2016: '2016-08-24',
      2017: '2017-08-14',
      2018: '2018-09-02',
      2019: '2019-08-23',
      2020: '2020-08-11',
      2021: '2021-08-30',
      2022: '2022-08-18',
      2023: '2023-09-06',
      2024: '2024-08-26',
      2025: '2025-08-15',
      2026: '2026-09-04',
    },
  },
  {
    key: 'karva_chauth',
    auditTier: 'tiebreaker',
    ruleNote: 'Implemented: Chandrodaya-vyapini Krishna Chaturthi with sunrise fallback.',
    expected: {
      2015: '2015-10-30',
      2016: '2016-10-19',
      2017: '2017-10-08',
      2018: '2018-10-27',
      2019: '2019-10-17',
      2020: '2020-11-04',
      2021: '2021-10-24',
      2022: '2022-10-13',
      2023: '2023-11-01',
      2024: '2024-10-20',
      2025: '2025-10-10',
      2026: '2026-10-29',
    },
  },
];
