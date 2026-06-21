<script lang="ts">
  // The physical Sun–Earth–Moon side view, extracted from routes/Sky.svelte. The
  // Sun is effectively at infinity, so its light arrives parallel and the Moon's
  // sunward half is always the lit half; from Earth we see that half at an angle
  // (the elongation) — which is exactly the Moon's phase. Labels are always shown
  // here because it's a teaching diagram.
  import { grahaLabel } from '$lib/labels';
  import EarthIcon from './EarthIcon.svelte';

  let {
    elong, // Sun→Moon elongation in degrees (0..360)
    earthLabel = 'Earth',
    labelMode = 'always', // 'always' (guide) | 'hover' (Sky: reveal on hover/tap)
  }: { elong: number; earthLabel?: string; labelMode?: 'always' | 'hover' } = $props();

  const OW = 360;
  const OH = 190;
  const EARTH = { x: 232, y: OH / 2 };
  const SUNX = 52;
  const ORB = 62;
  const rayAngles = Array.from({ length: 12 }, (_, i) => (i * 360) / 12);

  const moonOrb = $derived.by(() => {
    const a = ((180 + elong) * Math.PI) / 180;
    return { x: EARTH.x + ORB * Math.cos(a), y: EARTH.y - ORB * Math.sin(a) };
  });
  // the Sun-facing (left) half of the Moon disc, always lit
  const litHalf = (cx: number, cy: number, r: number) =>
    `M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} Z`;
</script>

<svg
  class="orb"
  class:hoverlabels={labelMode === 'hover'}
  viewBox="0 0 {OW} {OH}"
  role="img"
  aria-label="Sun, Earth and Moon — why the Moon shows a phase"
>
  <defs>
    <radialGradient id="orb-sun" cx="38%" cy="36%" r="68%">
      <stop offset="0%" stop-color="#fff8d8" />
      <stop offset="48%" stop-color="#ffce3a" />
      <stop offset="100%" stop-color="#f08a00" />
    </radialGradient>
    <radialGradient id="orb-sunglow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffcf4d" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#ffcf4d" stop-opacity="0" />
    </radialGradient>
  </defs>

  <!-- parallel sunlight reaching the Earth–Moon system -->
  {#each [-20, 0, 20] as dy (dy)}
    <line x1={SUNX + 26} y1={EARTH.y + dy} x2={EARTH.x - 16} y2={EARTH.y + dy} class="sunlight" />
  {/each}

  <!-- Sun -->
  <circle cx={SUNX} cy={EARTH.y} r="26" fill="url(#orb-sunglow)" />
  {#each rayAngles as a (a)}
    {@const cos = Math.cos((a * Math.PI) / 180)}
    {@const sin = Math.sin((a * Math.PI) / 180)}
    <line
      x1={SUNX + cos * 21}
      y1={EARTH.y - sin * 21}
      x2={SUNX + cos * 28}
      y2={EARTH.y - sin * 28}
      class="sun-ray"
    />
  {/each}
  <circle cx={SUNX} cy={EARTH.y} r="18" fill="url(#orb-sun)" stroke="#e07b00" stroke-width="0.75" />
  <text x={SUNX} y={EARTH.y + 40} class="orb-label" text-anchor="middle">{grahaLabel('sun')}</text>

  <!-- Moon's orbit + line of sight from Earth -->
  <circle cx={EARTH.x} cy={EARTH.y} r={ORB} class="orbit" />
  <line x1={EARTH.x} y1={EARTH.y} x2={moonOrb.x} y2={moonOrb.y} class="sight" />

  <!-- Earth -->
  <EarthIcon cx={EARTH.x} cy={EARTH.y} r={12} />
  <text x={EARTH.x} y={EARTH.y + 28} class="orb-label" text-anchor="middle">{earthLabel}</text>

  <!-- Moon: dark disc + always-lit sunward half -->
  <circle cx={moonOrb.x} cy={moonOrb.y} r="9" class="orb-moon-dark" />
  <path d={litHalf(moonOrb.x, moonOrb.y, 9)} class="orb-moon-lit" />
  <circle cx={moonOrb.x} cy={moonOrb.y} r="9" class="orb-moon-ring" />
  <text x={moonOrb.x} y={moonOrb.y + 21} class="orb-label" text-anchor="middle"
    >{grahaLabel('moon')}</text
  >
</svg>

<style>
  .orb {
    width: 100%;
    display: block;
  }
  .sunlight {
    stroke: #f5c54a;
    stroke-width: 1.5;
    stroke-dasharray: 2 4;
    opacity: 0.6;
  }
  .sun-ray {
    stroke: #f5a623;
    stroke-width: 1.6;
    stroke-linecap: round;
  }
  .orbit {
    fill: none;
    stroke: var(--line);
    stroke-dasharray: 3 3;
  }
  .sight {
    stroke: var(--ink-faint, #aaa);
    stroke-width: 1;
    stroke-dasharray: 2 3;
  }
  .orb-moon-dark {
    fill: var(--paper-3);
  }
  .orb-moon-lit {
    fill: #f1ecdd;
  }
  .orb-moon-ring {
    fill: none;
    stroke: var(--ink-soft);
    stroke-width: 1;
  }
  .orb-label {
    font-size: 9.5px;
    fill: var(--ink-soft);
    opacity: 0.85;
  }
  /* Sky uses hover/tap-to-reveal labels; the guide keeps them always on */
  .orb.hoverlabels {
    cursor: pointer;
  }
  .orb.hoverlabels .orb-label {
    opacity: 0;
    transition: opacity 0.14s ease;
  }
  .orb.hoverlabels:hover .orb-label {
    opacity: 1;
  }
  /* touch devices can't hover — show the labels rather than hide them forever */
  @media (hover: none) {
    .orb.hoverlabels .orb-label {
      opacity: 0.85;
    }
  }
</style>
