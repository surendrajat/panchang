<script lang="ts">
  // SVG moon-phase render — letterpress-style with a radial-gradient lit
  // limb. Construction matches design/panchanga-ui-mockup.html:
  //   - lit limb on the right when waxing, left when waning
  //   - terminator is a half-ellipse with semi-minor axis |cos(angle)|·R
  //   - crescent vs. gibbous flips the terminator's sweep flag

  interface Props {
    illumination: number; // 0..1
    phaseAngle: number; // 0..360
    phaseName: string;
    size?: number;
  }
  let { illumination, phaseAngle, phaseName, size = 96 }: Props = $props();

  const R = $derived((size - 8) / 2);
  const cx = $derived(size / 2);
  const cy = $derived(size / 2);
  const waxing = $derived(phaseAngle < 180);
  // For path geometry we want a 0..1 "lit fraction" measured from
  // illumination, but the terminator ellipse's semi-minor axis tracks
  // cos(illum * π) — matching the mockup's `rx = R * cos(illum * π)`.
  const rx = $derived(Math.abs(R * Math.cos(illumination * Math.PI)));
  const gibbous = $derived(illumination > 0.5);
  const limbSweep = $derived(waxing ? 1 : 0);
  const termSweep = $derived(waxing ? (gibbous ? 1 : 0) : gibbous ? 0 : 1);

  const litPath = $derived.by(() => {
    const top = `${cx} ${cy - R}`;
    const bot = `${cx} ${cy + R}`;
    return `M ${top} A ${R} ${R} 0 0 ${limbSweep} ${bot} A ${rx} ${R} 0 0 ${termSweep} ${top} Z`;
  });

  const gradientId = `moon-lit-${Math.random().toString(36).slice(2, 8)}`;
</script>

<figure class="moon">
  <svg
    class="moon-svg"
    width={size}
    height={size}
    viewBox="0 0 {size} {size}"
    role="img"
    aria-label="{phaseName}, {(illumination * 100).toFixed(0)}% illuminated"
  >
    <defs>
      <radialGradient id={gradientId} cx="38%" cy="34%" r="75%">
        <stop offset="0%" stop-color="var(--moon-hi)" />
        <stop offset="70%" stop-color="var(--moon-mid)" />
        <stop offset="100%" stop-color="var(--moon-low)" />
      </radialGradient>
    </defs>
    <circle {cx} {cy} r={R} fill="var(--moon-dark)" stroke="var(--line)" stroke-width="1" />
    <path d={litPath} fill="url(#{gradientId})" />
    <circle {cx} {cy} r={R} fill="none" stroke="var(--line)" stroke-width="1" />
  </svg>
</figure>

<style>
  .moon {
    --moon-hi: #fbf4df;
    --moon-mid: #efe2bf;
    --moon-low: #d8c79b;
    --moon-dark: var(--paper-3);
    display: inline-flex;
    margin: 0;
  }
  :global(:root[data-theme='dark']) .moon,
  :global(:root:not([data-theme])) .moon {
    /* Dark/auto-dark: invert the lit colors slightly to read on dark
       paper. Lit limb stays warm cream. */
    --moon-hi: #fbf4df;
    --moon-mid: #efe2bf;
    --moon-low: #c4b487;
  }
  :global(:root[data-theme='light']) .moon {
    --moon-hi: #fbf4df;
    --moon-mid: #efe2bf;
    --moon-low: #d8c79b;
  }
  .moon-svg {
    filter: drop-shadow(0 4px 10px var(--shadow));
  }
</style>
