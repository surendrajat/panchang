// @vitest-environment happy-dom
//
// Render smoke tests for the three routes that had NO coverage — Settings, Sky,
// Learn. The compute suite is exhaustive; these lock the presentation layer at the
// "mounts and renders without throwing" level (the class of regression — a broken
// control, a crash on mount — the compute tests can't see). Interaction is covered
// by the Playwright e2e suite; this stays fast (happy-dom, no browser).
//
// happy-dom doesn't implement IntersectionObserver, which SkyClock + ConceptIntro
// construct on mount — stub it so the mount doesn't throw.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import { preferences } from '$lib/state/preferences.svelte';
import type { Location } from '$lib/panchanga';
import Settings from '../../src/routes/Settings.svelte';
import Sky from '../../src/routes/Sky.svelte';
import Learn from '../../src/routes/Learn.svelte';

const DELHI: Location = {
  name: 'New Delhi',
  latitude: 28.6139,
  longitude: 77.209,
  timezone: 'Asia/Kolkata',
};

beforeEach(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  );
  preferences.location = DELHI;
  preferences.language = 'en';
  preferences.hydrated = true;
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Settings route', () => {
  it('mounts with the preference controls, incl. the trimmed ayanamsa list', () => {
    const { container } = render(Settings);
    expect(container.querySelectorAll('select').length).toBeGreaterThanOrEqual(8);
    const text = container.textContent ?? '';
    expect(text).toContain('Lahiri'); // ayanamsa option present
    expect(text).not.toContain('Yukteshwar'); // removed option is gone
  });
});

describe('Sky route', () => {
  it('mounts the sky view without throwing and draws the dome', () => {
    const { container } = render(Sky);
    expect((container.textContent ?? '').length).toBeGreaterThan(0);
    expect(container.querySelector('svg')).toBeTruthy(); // all-sky dome is SVG
  });
});

describe('Learn route', () => {
  it('mounts the learn guide without throwing', () => {
    const { container } = render(Learn);
    expect((container.textContent ?? '').length).toBeGreaterThan(100);
  });
});
