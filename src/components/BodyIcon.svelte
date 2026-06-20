<script module lang="ts">
  // unique-id counter so each instance's gradient/clip ids don't collide
  let _uid = 0;
</script>

<script lang="ts">
  // A small, realistic rendering of a planet — gradient globe plus the feature
  // that makes it recognisable (Jupiter's bands + red spot, Saturn's ring,
  // Mars' rust + cap, Mercury's craters, a node's shadow). Renders an SVG <g>
  // to sit inside a parent <svg>; used for the grahas on the sky wheel.
  import type { GrahaKey } from '$lib/jyotish';
  let { kind, cx = 0, cy = 0, r = 9 }: { kind: GrahaKey; cx?: number; cy?: number; r?: number } = $props();

  const id = `bi${(_uid += 1)}`;
  const GRAD: Record<GrahaKey, [string, string, string]> = {
    sun: ['#fff0c0', '#ffce3a', '#f08a00'],
    moon: ['#f4f1e8', '#d9d2c2', '#bdb49e'],
    mars: ['#f0a070', '#cf5a30', '#7c2a12'],
    mercury: ['#cfc6b6', '#9a9080', '#615850'],
    venus: ['#fbf0c8', '#ecd690', '#c2a052'],
    jupiter: ['#f0ddbb', '#cd9c63', '#9a6836'],
    saturn: ['#f4e8bc', '#dcc184', '#ab8a52'],
    rahu: ['#544e72', '#2b2640', '#14101f'],
    ketu: ['#6c584d', '#3a2c26', '#1a1210'],
  };
  const g = $derived(GRAD[kind]);
</script>

<g class="bi">
  <defs>
    <radialGradient id="{id}g" cx="36%" cy="32%" r="74%">
      <stop offset="0%" stop-color={g[0]} />
      <stop offset="55%" stop-color={g[1]} />
      <stop offset="100%" stop-color={g[2]} />
    </radialGradient>
    <clipPath id="{id}c"><circle {cx} {cy} r={r} /></clipPath>
  </defs>

  <!-- Saturn's ring sits behind the globe, then the globe, then a front arc -->
  {#if kind === 'saturn'}
    <ellipse {cx} {cy} rx={r * 1.9} ry={r * 0.6} fill="none" stroke="#c9a85e" stroke-width={Math.max(1, r * 0.2)} transform="rotate(-20 {cx} {cy})" />
  {/if}

  <circle {cx} {cy} r={r} fill="url(#{id}g)" stroke="rgba(40,20,0,0.22)" stroke-width="0.6" />

  <g clip-path="url(#{id}c)">
    {#if kind === 'mars'}
      <ellipse cx={cx - r * 0.15} cy={cy + r * 0.28} rx={r * 0.5} ry={r * 0.24} fill="#7a2a12" opacity="0.42" />
      <ellipse cx={cx + r * 0.4} cy={cy - r * 0.1} rx={r * 0.22} ry={r * 0.14} fill="#7a2a12" opacity="0.32" />
      <ellipse cx={cx + r * 0.2} cy={cy - r * 0.62} rx={r * 0.4} ry={r * 0.22} fill="#f3e7d8" opacity="0.75" />
    {:else if kind === 'mercury'}
      <circle cx={cx - r * 0.28} cy={cy - r * 0.16} r={r * 0.2} fill="#5e564c" opacity="0.55" />
      <circle cx={cx + r * 0.3} cy={cy + r * 0.24} r={r * 0.15} fill="#5e564c" opacity="0.5" />
      <circle cx={cx + r * 0.08} cy={cy - r * 0.4} r={r * 0.1} fill="#5e564c" opacity="0.45" />
      <circle cx={cx - r * 0.4} cy={cy + r * 0.32} r={r * 0.08} fill="#5e564c" opacity="0.45" />
    {:else if kind === 'venus'}
      <ellipse {cx} cy={cy - r * 0.25} rx={r} ry={r * 0.18} fill="#fff6d8" opacity="0.4" />
      <ellipse {cx} cy={cy + r * 0.35} rx={r} ry={r * 0.2} fill="#b88c44" opacity="0.28" />
    {:else if kind === 'jupiter'}
      <ellipse {cx} cy={cy - r * 0.45} rx={r} ry={r * 0.14} fill="#9a6836" opacity="0.5" />
      <ellipse {cx} cy={cy - r * 0.08} rx={r} ry={r * 0.17} fill="#a8743e" opacity="0.45" />
      <ellipse {cx} cy={cy + r * 0.32} rx={r} ry={r * 0.15} fill="#8c5e30" opacity="0.5" />
      <ellipse {cx} cy={cy + r * 0.66} rx={r} ry={r * 0.12} fill="#9a6836" opacity="0.45" />
      <ellipse cx={cx + r * 0.32} cy={cy + r * 0.12} rx={r * 0.24} ry={r * 0.14} fill="#c8503a" opacity="0.85" />
    {:else if kind === 'rahu' || kind === 'ketu'}
      <path d="M{cx - r * 0.55} {cy - r} a{r} {r} 0 0 0 0 {r * 2}Z" fill="#ffffff" opacity="0.05" />
    {/if}
  </g>

  {#if kind === 'saturn'}
    <!-- front half of the ring, over the globe -->
    <path d="M{cx - r * 1.79} {cy + r * 0.5} A {r * 1.9} {r * 0.6} -20 0 0 {cx + r * 1.79} {cy - r * 0.5}" fill="none" stroke="#d8b870" stroke-width={Math.max(0.8, r * 0.14)} transform="rotate(-20 {cx} {cy})" opacity="0" />
  {/if}
  {#if kind === 'rahu'}
    <circle {cx} {cy} r={r * 1.2} fill="none" stroke="#9a8fce" stroke-width="0.8" stroke-dasharray="1.5 2" opacity="0.7" />
  {/if}
  {#if kind === 'ketu'}
    <path d="M{cx + r * 0.7} {cy - r * 0.7} q{r * 1.5} -{r * 0.3} {r * 2.3} {r * 0.6}" fill="none" stroke="#c9a05a" stroke-width={Math.max(0.8, r * 0.14)} stroke-linecap="round" opacity="0.6" />
  {/if}
</g>

<style>
  .bi {
    pointer-events: none;
  }
</style>
