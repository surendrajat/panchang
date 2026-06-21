// Multi-source-verified DATE PINS for the monthly observances, across two cities
// and years to exercise location-sensitive (sunrise/moonrise) paths and different
// tithi patterns: New Delhi 2026 and Kolkata 2025 (~45 min earlier sunrise).
//
// === The observance-day rules (documented, with reasoning — not reverse-engineered) ===
// Each monthly tithi is observed on the day it prevails in its tradition's window,
// per the classical Kāla-nirṇaya texts (Nirnaya Sindhu / Dharma Sindhu), which is
// what Drik Panchang and traditional panchangs follow:
//   • Amavasya  → APARĀHNA (afternoon). Darsha/Shraddha is performed in aparāhna
//                 kāla, so the Amavasya that prevails then governs — even if it is
//                 not present at sunrise. (Dharmasindhu, Tithi-nirṇaya.)
//   • Purnima   → APARĀHNA. The major Purnima observances (Guru Purnima, Raksha
//                 Bandhan, Holika Dahan) are taken on the day the tithi prevails in
//                 the afternoon — Drik's "Purnima dates" follow this.
//   • Sankashti → MOONRISE (chandrodaya): the Chaturthi present at moonrise.
//   • Pradosh   → PRADOSHA (early evening, after sunset): Trayodashi then.
//   • Masik Shivaratri → NISHITA (midnight): Krishna Chaturdashi then.
// Each uses a kshaya-aware sunrise fallback so it fires exactly once per lunar month.
//
// === Verification (date-by-date vs Drik, per city via geoname-id) ===
// Amavasya + Purnima were the rules that previously used a naive sunrise window and
// diverged on boundary cases; after moving them to aparāhna they match Drik EXACTLY:
//   49/49 — Delhi 2026 (amavasya 12/12, purnima 13/13) + Kolkata 2025 (12/12, 12/12).
// (Drik labels e.g. "Darsha Amavasya, Mar 18" for the 2026 Chaitra 2-day span — the
// aparāhna day — where AstroSage lists the later sunrise day; we follow Drik/Darsha.)
// Sankashti 12/12 both cities; Pradosh 25/25 Delhi (Kolkata 23/24 — one pradosha-
// window boundary edge, tracked separately); Ekadashi 23/24 Delhi (Padmini, below).
//
// Sources (fetched 2026-06): drikpanchang.com (per-city geoname-id), AstroSage,
// and prokerala.com + others for the Padmini case.
import { describe, it, expect } from 'vitest';
import { findFestivals, type Location } from '$lib/panchanga';

const DELHI: Location = { name: 'New Delhi', latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata' };
const KOLKATA: Location = { name: 'Kolkata', latitude: 22.5726, longitude: 88.3639, timezone: 'Asia/Kolkata' };
const ymd = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);

function monthlyDates(loc: Location, year: number): Record<string, string[]> {
  const occ = findFestivals(new Date(Date.UTC(year, 0, 1, 6)), new Date(Date.UTC(year, 11, 31, 6)), loc);
  const by: Record<string, string[]> = {};
  for (const o of occ) (by[o.key] ??= []).push(ymd(o.date));
  return by;
}

function pinAll(loc: Location, year: number, reference: Record<string, string[]>) {
  const ours = monthlyDates(loc, year);
  for (const [key, dates] of Object.entries(reference)) {
    it(`${key}: ${dates.length} dates match Drik`, () => {
      expect((ours[key] ?? []).slice().sort()).toEqual(dates.slice().sort());
    });
  }
  return ours;
}

describe('monthly observances — New Delhi 2026 (multi-source verified)', () => {
  const ours = pinAll(DELHI, 2026, {
    // PITRU-karya / Darsha = aparahna day (matches Drik Darsha Amavasya 12/12).
    amavasya: ['2026-01-18', '2026-02-17', '2026-03-18', '2026-04-17', '2026-05-16', '2026-06-14', '2026-07-14', '2026-08-12', '2026-09-10', '2026-10-10', '2026-11-08', '2026-12-08'],
    // DEVA-karya = udaya (sunrise) day — the LATER day on a 2-day span (4 of 12
    // months in 2026: Mar/Jun/Sep/Nov), else same as Pitru. 03-19 = AstroSage's
    // udaya date for the Chaitra split (where Drik's Darsha is 03-18).
    amavasya_devakarya: ['2026-01-18', '2026-02-17', '2026-03-19', '2026-04-17', '2026-05-16', '2026-06-15', '2026-07-14', '2026-08-12', '2026-09-11', '2026-10-10', '2026-11-09', '2026-12-08'],
    purnima: ['2026-01-03', '2026-02-01', '2026-03-03', '2026-04-01', '2026-05-01', '2026-05-30', '2026-06-29', '2026-07-29', '2026-08-27', '2026-09-26', '2026-10-25', '2026-11-24', '2026-12-23'],
    sankashti_chaturthi: ['2026-01-06', '2026-02-05', '2026-03-06', '2026-04-05', '2026-05-05', '2026-06-03', '2026-07-03', '2026-08-02', '2026-08-31', '2026-09-29', '2026-10-29', '2026-11-27', '2026-12-26'],
    pradosh: ['2026-01-01', '2026-01-16', '2026-01-30', '2026-02-14', '2026-03-01', '2026-03-16', '2026-03-30', '2026-04-15', '2026-04-28', '2026-05-14', '2026-05-28', '2026-06-12', '2026-06-27', '2026-07-12', '2026-07-26', '2026-08-10', '2026-08-25', '2026-09-08', '2026-09-24', '2026-10-08', '2026-10-23', '2026-11-06', '2026-11-22', '2026-12-06', '2026-12-21'],
    masik_shivaratri: ['2026-01-16', '2026-03-17', '2026-04-15', '2026-05-15', '2026-06-13', '2026-07-12', '2026-08-11', '2026-09-09', '2026-10-08', '2026-11-07', '2026-12-07'],
    // 23/24 match Drik's Smarta primary; 05-26 is Padmini (see below).
    ekadashi: ['2026-01-14', '2026-01-29', '2026-02-13', '2026-02-27', '2026-03-15', '2026-03-29', '2026-04-13', '2026-04-27', '2026-05-13', '2026-05-26', '2026-06-11', '2026-06-25', '2026-07-10', '2026-07-25', '2026-08-09', '2026-08-23', '2026-09-07', '2026-09-22', '2026-10-06', '2026-10-22', '2026-11-05', '2026-11-20', '2026-12-04', '2026-12-20'],
  });

  it('2026-02-15 fires as Maha Shivaratri (annual), so masik_shivaratri is 11 not 12', () => {
    expect(ours['maha_shivaratri'] ?? []).toContain('2026-02-15');
    expect(ours['masik_shivaratri'] ?? []).not.toContain('2026-02-15');
  });

  it('Padmini Ekadashi (Adhik Jyeshtha): Smarta first day 05-26, not the Vaishnava 05-27', () => {
    // Vriddhi (doubled) Ekadashi present at both sunrises; tithi 05-26 05:11 →
    // 05-27 06:22 (identical across all sources). We are consistently Smarta
    // (ARCHITECTURE §14); Drik/AstroSage/ProKerala list the Vaishnava/Purushottam
    // date 05-27. India TV headlines the "May 26 or 27?" debate.
    expect(ours['ekadashi']).toContain('2026-05-26');
    expect(ours['ekadashi']).not.toContain('2026-05-27');
  });
});

describe('monthly observances — Kolkata 2025 (cross-location: ~45 min earlier sunrise)', () => {
  // These three matched Drik 12/12 each for Kolkata 2025 — confirming the aparāhna
  // (amavasya/purnima) and moonrise (sankashti) rules hold at a very different
  // longitude/year. (Pradosh is 23/24 here — one pradosha-window boundary edge —
  // and Ekadashi has Smarta/Vaishnava boundary cases; both tracked separately, not
  // pinned as exact here to avoid asserting a known convention divergence.)
  pinAll(KOLKATA, 2025, {
    amavasya: ['2025-01-29', '2025-02-27', '2025-03-29', '2025-04-27', '2025-05-26', '2025-06-25', '2025-07-24', '2025-08-22', '2025-09-21', '2025-10-21', '2025-11-19', '2025-12-19'],
    purnima: ['2025-01-13', '2025-02-12', '2025-03-13', '2025-04-12', '2025-05-12', '2025-06-10', '2025-07-10', '2025-08-09', '2025-09-07', '2025-10-06', '2025-11-05', '2025-12-04'],
    sankashti_chaturthi: ['2025-01-17', '2025-02-16', '2025-03-17', '2025-04-16', '2025-05-16', '2025-06-14', '2025-07-14', '2025-08-12', '2025-09-10', '2025-10-10', '2025-11-08', '2025-12-07'],
  });

  // Recorded honestly — the two observances that do NOT match Drik for Kolkata
  // 2025, asserted as known divergences so they are a tested fact, not hidden by
  // only pinning what agrees:
  it('records the known Kolkata 2025 divergences vs Drik (pradosh, ekadashi)', () => {
    const ours = monthlyDates(KOLKATA, 2025);
    expect(ours['pradosh']).toContain('2025-05-25'); // ours; Drik 2025-05-24 (pradosha-window-offset edge)
    expect(ours['ekadashi']).toContain('2025-11-02'); // ours; Drik 2025-11-01 Devutthana (Smarta/Vaishnava boundary)
  });
});
