// Generic bisection for finding when a monotonically-increasing angular
// quantity (modulo 360°) first reaches a target value.
//
// All four core panchanga quantities — tithi, nakshatra, yoga, karana —
// reduce to "find time t > t0 where angle(t) first crosses a multiple of
// some step". The underlying ecliptic longitudes increase monotonically
// over short windows (the Moon never reverses on the ecliptic at the
// scale of a day, and the Sun + Moon sum is even more monotone). We
// bisect to sub-second precision.

import { julianToDate } from '$lib/astro';

// Unwrap an angle that might have just rolled through 360° back to 0°.
// We compare against a recent reference value: if `angle` looks smaller
// than `reference` by more than `tolerance`, the angle has wrapped and we
// add 360°. The tolerance is generous (180°) so the heuristic is robust
// across a tithi-or-so window.
function unwrap(angle: number, reference: number): number {
  let a = angle;
  while (a < reference - 180) a += 360;
  return a;
}

// Find the first time `t` in `(startJD, startJD + maxDays]` such that
// the monotone angular function reaches `targetAngle`. The function must
// satisfy: angleFn(startJD) <= targetAngle when both are interpreted in
// the same unwrapped frame (i.e., after `unwrap()` with `startAngle` as
// reference). Returns the JD of the crossing.
export function bisectAngularCrossing(
  angleFn: (jd: number) => number,
  startJD: number,
  startAngle: number,
  targetAngle: number,
  maxDays: number,
): Date {
  // Unwrap target to be >= startAngle so the comparison is a plain
  // monotone "is value < target?".
  let target = targetAngle;
  while (target < startAngle) target += 360;

  let lo = startJD;
  let hi = startJD + maxDays;

  // Sanity: if the angle at hi (unwrapped) is still below target, we
  // can't bisect a non-bracket. Expand the bracket once.
  const hiAngle = unwrap(angleFn(hi), startAngle);
  if (hiAngle < target) {
    hi = startJD + maxDays * 2;
  }

  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const a = unwrap(angleFn(mid), startAngle);
    if (a < target) lo = mid;
    else hi = mid;
    if (hi - lo < 1e-7) break; // ~8.6 ms precision; well under 1 second
  }

  return julianToDate((lo + hi) / 2);
}
