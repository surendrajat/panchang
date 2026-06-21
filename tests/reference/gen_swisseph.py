#!/usr/bin/env python3
"""Canonical Swiss-Ephemeris reference generator for the panchang test suite.

Swiss Ephemeris (pyswisseph) is the independent gold standard — astro.com,
Jagannatha Hora and ProKerala all build on it. EVERY hardcoded Swiss-Eph value
in tests/ (ayanamsa, grahas, nodes, lagna, sunrise, panchanga end-times) is
produced here, so it can be regenerated and audited. This is a verification
tool, NOT a runtime dependency of the app.

Setup & run:
    python3 -m venv /tmp/swetest && /tmp/swetest/bin/pip install pyswisseph
    /tmp/swetest/bin/python tests/reference/gen_swisseph.py

We pin Lahiri (SIDM_LAHIRI) and Moshier theory (FLG_MOSEPH, no data files) so
results are reproducible anywhere. The app uses the SAME Lahiri value (see
src/lib/astro/ayanamsa.ts) and an INDEPENDENT ephemeris (astronomy-engine); the
tests assert the two converge. If a printed value here disagrees with a test,
the app changed — investigate before updating the test.
"""
import swisseph as swe
from datetime import datetime, timedelta

swe.set_sid_mode(swe.SIDM_LAHIRI)
SID = swe.FLG_SIDEREAL | swe.FLG_MOSEPH
TROP = swe.FLG_MOSEPH
NAK = 360.0 / 27.0

def jd_iso(iso):
    d = datetime.fromisoformat(iso.replace('Z', '+00:00')).utctimetuple()
    return swe.julday(d.tm_year, d.tm_mon, d.tm_mday,
                      d.tm_hour + d.tm_min/60 + d.tm_sec/3600, swe.GREG_CAL)

def jd_to_iso(jd):
    y, mo, d, h = swe.revjul(jd, swe.GREG_CAL)
    hh = int(h); mi = int((h-hh)*60); s = int(round(((h-hh)*60 - mi)*60))
    if s == 60: s = 0; mi += 1
    if mi == 60: mi = 0; hh += 1
    return f"{y:04d}-{mo:02d}-{d:02d}T{hh:02d}:{mi:02d}:{s:02d}Z"

def lon(jd, body, flags): return swe.calc_ut(jd, body, flags)[0][0]

# ── 1. ayanamsa (tests/unit/ayanamsa.test.ts golden values) ────────────────
def section_ayanamsa():
    print("\n# ayanamsa.test.ts — Lahiri golden values (decimal degrees)")
    for iso in ['1900-01-01T00:00:00Z', '1950-01-01T00:00:00Z', '2000-01-01T00:00:00Z',
                '2025-01-01T00:00:00Z', '2050-01-01T00:00:00Z', '2100-01-01T00:00:00Z']:
        print(f"  {iso}: {swe.get_ayanamsa_ut(jd_iso(iso)):.5f}")

# ── 2. grahas + mean nodes (kundli-vs-swisseph.test.ts SWE corpus) ─────────
GRAHA_EPOCHS = ['1925-03-10T08:15:00Z', '1947-08-14T18:30:00Z', '1965-11-20T14:30:00Z',
                '1980-01-01T12:00:00Z', '1990-08-15T05:00:00Z', '2000-01-01T00:00:00Z',
                '2020-12-21T18:00:00Z', '2040-06-15T06:00:00Z']
BODIES = [swe.SUN, swe.MARS, swe.MERCURY, swe.JUPITER, swe.VENUS, swe.SATURN]
def section_grahas():
    print("\n# kundli-vs-swisseph.test.ts — sidereal Lahiri [sun, moon, mars, mercury, jupiter, venus, saturn, rahu(mean), ketu]")
    for iso in GRAHA_EPOCHS:
        jd = jd_iso(iso)
        s = lon(jd, swe.SUN, SID); m = lon(jd, swe.MOON, SID)
        rest = [lon(jd, b, SID) for b in [swe.MARS, swe.MERCURY, swe.JUPITER, swe.VENUS, swe.SATURN]]
        rahu = lon(jd, swe.MEAN_NODE, SID); ketu = (rahu + 180) % 360
        nums = ', '.join(f"{v:.4f}" for v in [s, m] + rest + [rahu, ketu])
        print(f"  ['{iso}', {nums}],")

# ── 3. true node (kundli-vs-swisseph.test.ts SWE_TRUE) ─────────────────────
def section_true_node():
    print("\n# kundli-vs-swisseph.test.ts — true Rahu (SE_TRUE_NODE), sidereal Lahiri")
    for iso in GRAHA_EPOCHS:
        print(f"  ['{iso}', {lon(jd_iso(iso), swe.TRUE_NODE, SID):.4f}],")

# ── 4. lagna (kundli-vs-drik.test.ts SWISS) ────────────────────────────────
LAGNA_CASES = [  # label, lat, lon, iso(UTC)
    ('Delhi 00:30', 28.6356, 77.2244, '1990-08-14T19:00:00Z'),
    ('Delhi 06:30', 28.6356, 77.2244, '1990-08-15T01:00:00Z'),
    ('Delhi 12:00', 28.6356, 77.2244, '1990-08-15T06:30:00Z'),
    ('Delhi 17:00', 28.6356, 77.2244, '1990-08-15T11:30:00Z'),
    ('Delhi 21:06', 28.6356, 77.2244, '1990-08-15T15:36:58Z'),
    ('Kolkata 06:30', 22.5625, 88.3628, '1990-08-15T01:00:00Z'),
    ('NewYork 06:30', 40.7142, -74.0058, '1990-08-15T10:30:00Z'),
]
def section_lagna():
    print("\n# kundli-vs-drik.test.ts — sidereal Lahiri ascendant (swe.houses_ex, Placidus)")
    for label, lat, lo, iso in LAGNA_CASES:
        asc = swe.houses_ex(jd_iso(iso), lat, lo, b'A', swe.FLG_SIDEREAL)[1][0]
        print(f"  ['{label}', {asc:.4f}],")

# ── 5/6. sunrise + panchanga end-times (panchanga-vs-swisseph.test.ts) ─────
def seg_index(angle, step): return int(angle // step) % int(round(360 / step))
def tithi_angle(jd): return (lon(jd, swe.MOON, TROP) - lon(jd, swe.SUN, TROP)) % 360
def nak_angle(jd): return lon(jd, swe.MOON, SID) % 360
def yoga_angle(jd): return (lon(jd, swe.SUN, SID) + lon(jd, swe.MOON, SID)) % 360
def find_end(angle_fn, jd0, step):
    i0 = seg_index(angle_fn(jd0), step); jd = jd0; prev = jd0
    while jd < jd0 + 2.0:
        prev, jd = jd, jd + 1 / 1440.0
        if seg_index(angle_fn(jd), step) != i0:
            lo, hi = prev, jd
            for _ in range(46):
                mid = (lo + hi) / 2
                if seg_index(angle_fn(mid), step) != i0: hi = mid
                else: lo = mid
            return hi
    return None
def sunrise(y, mo, d, lat, lo_, alt, tz):
    mid = datetime(y, mo, d) - timedelta(hours=tz)
    j0 = swe.julday(mid.year, mid.month, mid.day, mid.hour + mid.minute / 60, swe.GREG_CAL)
    return swe.rise_trans(j0, swe.SUN, rsmi=swe.CALC_RISE, geopos=(lo_, lat, alt), atpress=0, attemp=0)[1][0]
PANCHANGA_CASES = [  # label, lat, lon, alt, tz, Y, M, D
    ('Delhi 2026-06-21', 28.6356, 77.2244, 216, 5.5, 2026, 6, 21),
    ('Bengaluru 2025-03-15', 12.9716, 77.5946, 920, 5.5, 2025, 3, 15),
    ('Kolkata 2024-11-01', 22.5726, 88.3639, 6, 5.5, 2024, 11, 1),
    ('NewYork 2025-07-04', 40.7142, -74.0064, 10, -4.0, 2025, 7, 4),
]
def section_panchanga():
    print("\n# panchanga-vs-swisseph.test.ts — sunrise, then tithi/nak/yoga as idx/end(UTC)")
    for label, lat, lo_, alt, tz, y, mo, d in PANCHANGA_CASES:
        sr = sunrise(y, mo, d, lat, lo_, alt, tz)
        ti, te = seg_index(tithi_angle(sr), 12.0) + 1, jd_to_iso(find_end(tithi_angle, sr, 12.0))
        ni, ne = seg_index(nak_angle(sr), NAK) + 1, jd_to_iso(find_end(nak_angle, sr, NAK))
        yi, ye = seg_index(yoga_angle(sr), NAK) + 1, jd_to_iso(find_end(yoga_angle, sr, NAK))
        print(f"  {label}: sunrise {jd_to_iso(sr)}  tithi {ti}/{te}  nak {ni}/{ne}  yoga {yi}/{ye}")

if __name__ == '__main__':
    section_ayanamsa()
    section_grahas()
    section_true_node()
    section_lagna()
    section_panchanga()
