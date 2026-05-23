import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';
import { computeMonth, findFestivals } from '$lib/panchanga';
import type { Location } from '$lib/panchanga';

const DELHI: Location = {
  name: 'New Delhi, India',
  latitude: 28.6139,
  longitude: 77.209,
  altitude: 216,
  timezone: 'Asia/Kolkata',
};

function timed<T>(fn: () => T): { value: T; ms: number } {
  const start = performance.now();
  const value = fn();
  return { value, ms: performance.now() - start };
}

describe('calculation performance guardrails', () => {
  it('computes a civil month within the interactive budget', () => {
    computeMonth(2026, 1, DELHI, { monthSystem: 'purnimanta' });

    const { value, ms } = timed(() => computeMonth(2026, 1, DELHI, { monthSystem: 'purnimanta' }));

    expect(value).toHaveLength(31);
    expect(ms, `computeMonth(2026-01 Delhi) took ${ms.toFixed(1)}ms`).toBeLessThan(2_500);
  });

  it('scans one festival year without pathological slowdown', () => {
    findFestivals(new Date(Date.UTC(2026, 0, 1)), new Date(Date.UTC(2026, 0, 31)), DELHI, {
      monthSystem: 'purnimanta',
    });

    const { value, ms } = timed(() =>
      findFestivals(new Date(Date.UTC(2026, 0, 1)), new Date(Date.UTC(2026, 11, 31)), DELHI, {
        monthSystem: 'purnimanta',
      }),
    );

    expect(value.length).toBeGreaterThan(0);
    expect(ms, `findFestivals(2026 Delhi) took ${ms.toFixed(1)}ms`).toBeLessThan(8_000);
  });
});
