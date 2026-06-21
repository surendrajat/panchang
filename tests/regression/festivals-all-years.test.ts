// A festival's tithi occurs every year, so it must resolve to a date every
// year — a festival cannot vanish. That is a FACT, not a convention, and it is
// the one festival property we can assert without reverse-engineering anyone's
// edge-case rules. This guards the kshaya-recovery rule (a skipped tithi is
// observed on the day it occurs — classical/Smarta) across the full 1950-2100
// range on a representative sample.
//
// Known exception — 1983 is the Pausha-Magha KSHAYA MASA, a "lost month" where
// two lunar months merge. It is the ONLY kshaya masa in 1950-2100 (next: 2124,
// 2284). Its Magha festivals (Maha Shivaratri, Vasant Panchami) are not placed,
// because the kshaya-masa observance convention is itself disputed between
// authorities. We document it rather than fake a date.
//
// NOTE on exactness: this asserts only PRESENCE. For normal years the dates
// match Drik Panchang (see festivals-multi-year). In rare short-tithi years the
// fallback uses the general sunrise rule, which can differ from Drik's
// festival-specific vyapini handling by ±1 day — see METHODOLOGY.md.
import { describe, it, expect } from 'vitest';
import { findFestivals } from '$lib/panchanga';
import { DELHI } from '../helpers';

const ANNUAL = [
  'makara_sankranti', 'maha_shivaratri', 'holika_dahan', 'holi', 'vasant_panchami',
  'ugadi', 'rama_navami', 'hanuman_jayanti', 'akshaya_tritiya', 'buddha_purnima',
  'guru_purnima', 'nag_panchami', 'raksha_bandhan', 'krishna_janmashtami',
  'ganesh_chaturthi', 'navaratri_start', 'vijayadashami', 'karva_chauth',
  'dhanteras', 'diwali', 'govardhan_puja', 'bhai_dooj', 'kartik_purnima',
];

// Representative sample across the range (every ~6 years) plus the short-tithi
// edge years that first exposed the kshaya bug.
const YEARS = [
  1950, 1956, 1962, 1968, 1974, 1975, 1980, 1986, 1992, 1998, 2000, 2004, 2010,
  2016, 2022, 2026, 2028, 2034, 2040, 2046, 2050, 2058, 2070, 2082, 2094, 2100,
];

const MONTH_SYSTEMS = ['purnimanta', 'amanta'] as const;

const present = (year: number, monthSystem: (typeof MONTH_SYSTEMS)[number]): Map<string, number> => {
  const occ = findFestivals(
    new Date(Date.UTC(year, 0, 1)),
    new Date(Date.UTC(year, 11, 31)),
    DELHI,
    { monthSystem },
  );
  const counts = new Map<string, number>();
  for (const o of occ) counts.set(o.key, (counts.get(o.key) ?? 0) + 1);
  return counts;
};

describe('every annual festival resolves to EXACTLY ONE date, 1950-2100 (sampled)', () => {
  for (const year of YEARS) {
    it(`${year}: all ${ANNUAL.length} annual festivals fire exactly once (both month systems)`, () => {
      // Not missing (count 0) and not duplicated (count > 1) — a vriddhi
      // (doubled) tithi must resolve to one day, a kshaya (skipped) one too.
      // Festival rules key on the system-invariant amantaName, so the result
      // must be identical under purnimanta and amanta display.
      for (const ms of MONTH_SYSTEMS) {
        const counts = present(year, ms);
        const wrong = ANNUAL.map((k) => [k, counts.get(k) ?? 0] as const).filter(([, c]) => c !== 1);
        expect(wrong, `${year} (${ms}): ${wrong.map(([k, c]) => `${k}×${c}`).join(', ')}`).toEqual([]);
      }
    });
  }

  it('1983 kshaya masa: ONLY the two Magha festivals are absent (documented)', () => {
    const counts = present(1983, 'purnimanta');
    const absent = ANNUAL.filter((k) => !counts.has(k));
    expect(absent.sort()).toEqual(['maha_shivaratri', 'vasant_panchami']);
  });
});
