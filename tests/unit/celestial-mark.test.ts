// @vitest-environment happy-dom
// Smoke test for the shared Sun/Moon mark — also proves the component-test
// harness (svelte plugin + happy-dom + @testing-library/svelte) is wired up.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import CelestialMark from '$components/CelestialMark.svelte';

afterEach(cleanup);

describe('CelestialMark', () => {
  it('renders the sun as a disc with eight rays at the given size', () => {
    const { container } = render(CelestialMark, { props: { body: 'sun', size: 16 } });
    const svg = container.querySelector('svg.cmark');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('width')).toBe('16');
    expect(container.querySelector('circle')).toBeTruthy();
    expect(container.querySelectorAll('line')).toHaveLength(8);
  });

  it('renders the moon as a single crescent path (no rays)', () => {
    const { container } = render(CelestialMark, { props: { body: 'moon', size: 14 } });
    expect(container.querySelector('path')).toBeTruthy();
    expect(container.querySelectorAll('line')).toHaveLength(0);
  });
});
