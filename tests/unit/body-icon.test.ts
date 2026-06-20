// @vitest-environment happy-dom
// Smoke test for the planet glyphs on the sky wheel.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import BodyIcon from '$components/BodyIcon.svelte';

afterEach(cleanup);

describe('BodyIcon', () => {
  it('renders Saturn with its ring (extra ring paths beyond the globe)', () => {
    const { container } = render(BodyIcon, { props: { kind: 'saturn', cx: 50, cy: 50, r: 9 } });
    expect(container.querySelector('g.bi')).toBeTruthy();
    // a filled globe plus ring strokes
    expect(container.querySelectorAll('circle').length).toBeGreaterThanOrEqual(1);
    expect(container.querySelectorAll('path').length).toBeGreaterThan(0);
  });

  it('gives each instance unique gradient ids so they do not collide', () => {
    const a = render(BodyIcon, { props: { kind: 'mars', cx: 0, cy: 0, r: 9 } });
    const b = render(BodyIcon, { props: { kind: 'venus', cx: 0, cy: 0, r: 9 } });
    const idA = a.container.querySelector('radialGradient')?.id;
    const idB = b.container.querySelector('radialGradient')?.id;
    expect(idA).toBeTruthy();
    expect(idB).toBeTruthy();
    expect(idA).not.toBe(idB);
  });
});
