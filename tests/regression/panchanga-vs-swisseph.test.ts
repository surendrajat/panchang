// Independent verification of the CORE panchanga (sunrise + the tithi /
// nakshatra / yoga current at sunrise, and when they end) against Swiss
// Ephemeris — NOT drikpanchang.com. The rest of the suite pins these to Drik
// fixtures at ±2 min; this pins them to the gold-standard library (pyswisseph
// 2.10, SIDM_LAHIRI, Moshier theory) at much tighter tolerances, so the core
// timings are proven accurate in their own right.
//
// All reference values are produced by tests/reference/gen_swisseph.py (see
// tests/reference/README.md) — regenerate, never hand-edit. The app uses the
// same Lahiri ayanamsa and an INDEPENDENT ephemeris (astronomy-engine); the
// agreement below (indices exact; end times within seconds) is the evidence
// the two independent computations converge.
import { describe, it, expect } from 'vitest';
import { computePanchanga, type Location } from '$lib/panchanga';

const L = (name: string, latitude: number, longitude: number, altitude: number, timezone: string): Location => ({
  name,
  latitude,
  longitude,
  altitude,
  timezone,
});

interface Ref {
  label: string;
  loc: Location;
  noon: string; // a local-noon instant fixing the civil day
  sunrise: string;
  tithi: [number, string]; // [index 1..30, endTime UTC]
  nakshatra: [number, string]; // [index 1..27, endTime UTC]
  yoga: [number, string]; // [index 1..27, endTime UTC]
}

const REFS: Ref[] = [
  {
    label: 'Delhi 2026-06-21',
    loc: L('Delhi', 28.6356, 77.2244, 216, 'Asia/Kolkata'),
    noon: '2026-06-21T12:00:00+05:30',
    sunrise: '2026-06-20T23:53:39Z',
    tithi: [7, '2026-06-21T09:51:08Z'],
    nakshatra: [11, '2026-06-21T04:01:34Z'],
    yoga: [16, '2026-06-21T05:51:32Z'],
  },
  {
    label: 'Bengaluru 2025-03-15',
    loc: L('Bengaluru', 12.9716, 77.5946, 920, 'Asia/Kolkata'),
    noon: '2025-03-15T12:00:00+05:30',
    sunrise: '2025-03-15T00:57:11Z',
    tithi: [16, '2025-03-15T09:03:41Z'],
    nakshatra: [12, '2025-03-15T03:24:19Z'],
    yoga: [10, '2025-03-15T08:29:55Z'],
  },
  {
    label: 'Kolkata 2024-11-01',
    loc: L('Kolkata', 22.5726, 88.3639, 6, 'Asia/Kolkata'),
    noon: '2024-11-01T12:00:00+05:30',
    sunrise: '2024-11-01T00:10:53Z',
    tithi: [30, '2024-11-01T12:47:08Z'],
    nakshatra: [15, '2024-11-01T22:01:02Z'],
    yoga: [2, '2024-11-01T05:10:43Z'],
  },
  {
    label: 'New York 2025-07-04',
    loc: L('New York', 40.7142, -74.0064, 10, 'America/New_York'),
    noon: '2025-07-04T12:00:00-04:00',
    sunrise: '2025-07-04T09:30:09Z',
    tithi: [9, '2025-07-04T11:02:19Z'],
    nakshatra: [14, '2025-07-04T11:20:10Z'],
    yoga: [20, '2025-07-04T14:05:33Z'],
  },
];

const secs = (a: Date, iso: string) => Math.abs(a.getTime() - new Date(iso).getTime()) / 1000;

// End-time floor is the astronomy-engine (CalcMoon) vs Swiss-Eph (Moshier) Moon
// theory difference (~0.3–0.4′) divided by the angle's rate. All five limbs now
// share one APPARENT basis (SunPosition + EclipticGeoMoon), so measured maxima are
// tithi ~7 s, nakshatra 16 s, yoga 27 s. Tolerances are ~2× that — tight enough to
// catch real drift, including a regression of tithi/karana back to the geometric
// MoonPhase() elongation, which would re-add ~40 s of solar aberration and trip this.
const TOL = { sunrise: 30, tithi: 15, nakshatra: 45, yoga: 60 };

describe('panchanga vs Swiss Ephemeris', () => {
  for (const r of REFS) {
    describe(r.label, () => {
      const p = computePanchanga(new Date(r.noon), r.loc);

      it(`sunrise within ${TOL.sunrise} s`, () => {
        expect(secs(p.sunrise!, r.sunrise)).toBeLessThan(TOL.sunrise);
      });

      it('tithi index exact, end within tolerance', () => {
        expect(p.tithi.index).toBe(r.tithi[0]);
        expect(secs(p.tithi.endTime, r.tithi[1])).toBeLessThan(TOL.tithi);
      });

      it('nakshatra index exact, end within tolerance', () => {
        expect(p.nakshatra.index).toBe(r.nakshatra[0]);
        expect(secs(p.nakshatra.endTime, r.nakshatra[1])).toBeLessThan(TOL.nakshatra);
      });

      it('yoga index exact, end within tolerance', () => {
        expect(p.yoga.index).toBe(r.yoga[0]);
        expect(secs(p.yoga.endTime, r.yoga[1])).toBeLessThan(TOL.yoga);
      });
    });
  }
});
