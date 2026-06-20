<script module lang="ts">
  // unique-id counter so each instance's gradient/clip ids don't collide
  let _uid = 0;
</script>

<script lang="ts">
  // A small but realistic rendering of a planet: a lit gradient sphere (with
  // limb darkening for 3D), plus the feature that makes it recognisable —
  // Saturn's tilted ring, Jupiter's bands + Great Red Spot, Mars' rust + polar
  // cap, Mercury's craters, Venus' cloud, a node's shadow. Renders an SVG <g>
  // to sit inside a parent <svg>; used for the grahas on the sky wheel.
  import type { GrahaKey } from '$lib/jyotish';
  let { kind, cx = 0, cy = 0, r = 9 }: { kind: GrahaKey; cx?: number; cy?: number; r?: number } = $props();

  const id = `bi${(_uid += 1)}`;
  // [highlight, mid, shadow] — sphere shaded light (top-left) to dark (rim)
  const GRAD: Record<GrahaKey, [string, string, string]> = {
    sun: ['#fff3c4', '#ffc83a', '#ee8a00'],
    moon: ['#f8f5ee', '#d7d0c0', '#a59c8a'],
    mars: ['#f0a574', '#c8542c', '#6e2410'],
    mercury: ['#cabfac', '#928777', '#534b42'],
    venus: ['#fcf3cf', '#e7cb84', '#b08e42'],
    jupiter: ['#efe0c4', '#cb9c64', '#86592f'],
    saturn: ['#f5ead0', '#dcc488', '#9c7f47'],
    rahu: ['#5e5780', '#2d2745', '#0e0a17'],
    ketu: ['#715d50', '#3c2d25', '#150e0b'],
  };
  const g = $derived(GRAD[kind]);
</script>

<g class="bi">
  <defs>
    <radialGradient id="{id}g" cx="35%" cy="30%" r="80%">
      <stop offset="0%" stop-color={g[0]} />
      <stop offset="52%" stop-color={g[1]} />
      <stop offset="100%" stop-color={g[2]} />
    </radialGradient>
    <radialGradient id="{id}s" cx="38%" cy="32%" r="72%">
      <stop offset="58%" stop-color="#000" stop-opacity="0" />
      <stop offset="100%" stop-color="#000" stop-opacity="0.34" />
    </radialGradient>
    <clipPath id="{id}c"><circle {cx} {cy} r={r} /></clipPath>
  </defs>

  <!-- Saturn ring: back half drawn behind the globe -->
  {#if kind === 'saturn'}
    <path d="M{cx - r * 2} {cy} A {r * 2} {r * 0.66} 0 0 1 {cx + r * 2} {cy}" fill="none" stroke="#caa85e" stroke-width={Math.max(1, r * 0.22)} transform="rotate(-18 {cx} {cy})" opacity="0.9" />
  {/if}

  <circle {cx} {cy} r={r} fill="url(#{id}g)" />

  <g clip-path="url(#{id}c)">
    {#if kind === 'mars'}
      <ellipse cx={cx - r * 0.12} cy={cy + r * 0.3} rx={r * 0.52} ry={r * 0.26} fill="#6e2410" opacity="0.4" />
      <ellipse cx={cx + r * 0.42} cy={cy - r * 0.05} rx={r * 0.2} ry={r * 0.13} fill="#6e2410" opacity="0.3" />
      <ellipse {cx} cy={cy - r * 0.78} rx={r * 0.5} ry={r * 0.26} fill="#fbf4ea" opacity="0.85" />
    {:else if kind === 'mercury'}
      <circle cx={cx - r * 0.3} cy={cy - r * 0.14} r={r * 0.22} fill="#4f463c" opacity="0.5" />
      <circle cx={cx + r * 0.32} cy={cy + r * 0.26} r={r * 0.16} fill="#4f463c" opacity="0.45" />
      <circle cx={cx + r * 0.06} cy={cy - r * 0.42} r={r * 0.11} fill="#4f463c" opacity="0.4" />
      <circle cx={cx - r * 0.42} cy={cy + r * 0.34} r={r * 0.09} fill="#4f463c" opacity="0.4" />
    {:else if kind === 'venus'}
      <ellipse {cx} cy={cy - r * 0.3} rx={r} ry={r * 0.2} fill="#fff7da" opacity="0.42" />
      <ellipse {cx} cy={cy + r * 0.4} rx={r} ry={r * 0.22} fill="#b3873a" opacity="0.26" />
    {:else if kind === 'jupiter'}
      <ellipse {cx} cy={cy - r * 0.5} rx={r} ry={r * 0.13} fill="#8a5e30" opacity="0.5" />
      <ellipse {cx} cy={cy - r * 0.16} rx={r} ry={r * 0.16} fill="#a06a38" opacity="0.5" />
      <ellipse {cx} cy={cy + r * 0.22} rx={r} ry={r * 0.14} fill="#7e5228" opacity="0.55" />
      <ellipse {cx} cy={cy + r * 0.56} rx={r} ry={r * 0.12} fill="#9a6634" opacity="0.5" />
      <ellipse cx={cx + r * 0.36} cy={cy + r * 0.2} rx={r * 0.22} ry={r * 0.15} fill="#bf4a32" opacity="0.9" />
    {:else if kind === 'rahu' || kind === 'ketu'}
      <ellipse cx={cx - r * 0.3} cy={cy - r * 0.3} rx={r * 0.45} ry={r * 0.55} fill="#fff" opacity="0.06" />
    {/if}
    <circle {cx} {cy} r={r} fill="url(#{id}s)" />
  </g>

  <circle {cx} {cy} r={r} fill="none" stroke="rgba(30,16,4,0.28)" stroke-width="0.6" />

  <!-- Saturn ring: front half over the globe + a thin gap line -->
  {#if kind === 'saturn'}
    <path d="M{cx - r * 2} {cy} A {r * 2} {r * 0.66} 0 0 0 {cx + r * 2} {cy}" fill="none" stroke="#e4cd8e" stroke-width={Math.max(1, r * 0.22)} transform="rotate(-18 {cx} {cy})" />
    <path d="M{cx - r * 2} {cy} A {r * 2} {r * 0.66} 0 0 0 {cx + r * 2} {cy}" fill="none" stroke="#9c7f47" stroke-width="0.5" transform="rotate(-18 {cx} {cy})" opacity="0.7" />
  {/if}
  {#if kind === 'rahu'}
    <circle {cx} {cy} r={r * 1.16} fill="none" stroke="#a99ce0" stroke-width="0.9" stroke-dasharray="1.6 2" opacity="0.7" />
  {/if}
  {#if kind === 'ketu'}
    <path d="M{cx + r * 0.6} {cy - r * 0.6} q{r * 1.5} -{r * 0.2} {r * 2.4} {r * 0.8}" fill="none" stroke="#cda35d" stroke-width={Math.max(0.8, r * 0.16)} stroke-linecap="round" opacity="0.6" />
    <path d="M{cx + r * 0.5} {cy - r * 0.1} q{r * 1.4} {r * 0.1} {r * 2.2} {r * 1.1}" fill="none" stroke="#cda35d" stroke-width={Math.max(0.6, r * 0.1)} stroke-linecap="round" opacity="0.4" />
  {/if}
</g>

<style>
  .bi {
    pointer-events: none;
  }
</style>
