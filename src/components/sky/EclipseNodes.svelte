<script lang="ts">
  // What Rāhu and Ketu ACTUALLY are. They are not objects you could photograph —
  // they're the two points where the Moon's tilted orbit crosses the ecliptic (the
  // flat plane of the Sun's path). The Moon climbs north through one (Rāhu, the
  // ascending node) and dips south through the other (Ketu, the descending node).
  // An eclipse needs a new or full Moon to land right on one. (Tilt exaggerated so
  // the crossing is visible — the real tilt is ~5°.)
  import EarthIcon from './EarthIcon.svelte';
  let { lang = 'en' }: { lang?: 'en' | 'hi' } = $props();
  const hi = (h: string, e: string) => (lang === 'hi' ? h : e);

  const W = 440;
  const H = 248;
  const cx = 220;
  const cy = 122;
  const R = 172; // orbit radius on screen
  const eclRy = 32; // ecliptic plane, seen nearly edge-on
  const orbRy = 80; // Moon's orbit (tilt exaggerated for clarity)

  // the Moon glides around its orbit; reduced-motion parks it mid-climb
  let theta = $state(Math.PI * 0.5);
  $effect(() => {
    const reduce =
      typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      theta = Math.PI * 0.5;
      return;
    }
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      theta = (theta + ((now - last) / 1000) * 0.55) % (Math.PI * 2);
      last = now;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });
  const moonX = $derived(cx + R * Math.cos(theta));
  const moonY = $derived(cy - orbRy * Math.sin(theta));
  const moonEclY = $derived(cy - eclRy * Math.sin(theta)); // ecliptic point below the Moon
  const atNode = $derived(Math.abs(Math.sin(theta)) < 0.06);
  const ascending = $derived(Math.cos(theta) > 0); // heading toward Rāhu (right) side

  const status = $derived.by(() => {
    if (atNode)
      return ascending
        ? hi('एक नोड पर — राहु (आरोही)', 'crossing a node — Rāhu (ascending)')
        : hi('एक नोड पर — केतु (अवरोही)', 'crossing a node — Ketu (descending)');
    return Math.sin(theta) > 0
      ? hi('चन्द्रमा क्रांतिवृत्त के उत्तर', 'Moon is north of the ecliptic')
      : hi('चन्द्रमा क्रांतिवृत्त के दक्षिण', 'Moon is south of the ecliptic');
  });
</script>

<div class="nodes">
  <svg
    viewBox="0 0 {W} {H}"
    role="img"
    aria-label={hi('राहु और केतु — चन्द्र-नोड', 'Rāhu and Ketu — the lunar nodes')}
  >
    <defs>
      <radialGradient id="nd-space" cx="50%" cy="46%" r="64%">
        <stop offset="0%" stop-color="#1b1f36" />
        <stop offset="100%" stop-color="#0b0c18" />
      </radialGradient>
      <radialGradient id="nd-ecl" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffd66b" stop-opacity="0.22" />
        <stop offset="100%" stop-color="#ffd66b" stop-opacity="0.05" />
      </radialGradient>
      <radialGradient id="nd-moon" cx="38%" cy="34%" r="72%">
        <stop offset="0%" stop-color="#fbf4df" />
        <stop offset="100%" stop-color="#cdba8e" />
      </radialGradient>
      <radialGradient id="nd-node" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ff8a63" stop-opacity="0.9" />
        <stop offset="100%" stop-color="#ff8a63" stop-opacity="0" />
      </radialGradient>
    </defs>

    <rect x="0" y="0" width={W} height={H} fill="url(#nd-space)" />
    {#each [[40, 30], [120, 24], [330, 30], [410, 60], [70, 210], [200, 222], [360, 206], [415, 150]] as [sx, sy] (sx)}
      <circle cx={sx} cy={sy} r="0.8" fill="#fff" opacity="0.4" />
    {/each}

    <!-- the Moon's orbit BEHIND the ecliptic plane (south half), dim -->
    <path d="M {cx + R} {cy} A {R} {orbRy} 0 0 1 {cx - R} {cy}" class="orbit orbit--back" />

    <!-- the ecliptic: the flat plane of the Sun's path -->
    <ellipse
      {cx}
      {cy}
      rx={R}
      ry={eclRy}
      fill="url(#nd-ecl)"
      stroke="#caa64a"
      stroke-width="1"
      stroke-opacity="0.6"
    />
    <text x={cx - R + 6} y={cy - eclRy - 6} class="lab lab--ecl"
      >{hi('क्रांतिवृत्त (सूर्य-मार्ग)', 'ecliptic — the Sun’s path')}</text
    >

    <!-- line of nodes (the two planes meet along this line) -->
    <line x1={cx - R} y1={cy} x2={cx + R} y2={cy} class="nodeline" />

    <!-- Earth -->
    <EarthIcon {cx} {cy} r={15} />

    <!-- the Moon's orbit IN FRONT (north half), bright -->
    <path d="M {cx + R} {cy} A {R} {orbRy} 0 0 0 {cx - R} {cy}" class="orbit orbit--front" />
    <text x={cx} y={cy - orbRy - 6} class="lab lab--orb" text-anchor="middle"
      >{hi('चन्द्र-कक्षा (~5° झुकी)', 'Moon’s orbit (tilted ~5°)')}</text
    >

    <!-- the two nodes: where the orbit crosses the ecliptic -->
    {#each [{ x: cx + R, key: 'rahu', g: '☊', up: true }, { x: cx - R, key: 'ketu', g: '☋', up: false }] as n (n.key)}
      <circle cx={n.x} {cy} r="13" fill="url(#nd-node)" />
      <circle cx={n.x} {cy} r="3.4" class="node-dot" />
      <text x={n.x} y={n.up ? cy - 16 : cy + 26} class="node-lab" text-anchor="middle"
        >{n.g}
        {n.key === 'rahu' ? hi('राहु', 'Rāhu') : hi('केतु', 'Ketu')}</text
      >
      <text x={n.x} y={n.up ? cy - 28 : cy + 38} class="node-sub" text-anchor="middle"
        >{n.key === 'rahu' ? hi('↑ आरोही', '↑ ascending') : hi('↓ अवरोही', '↓ descending')}</text
      >
    {/each}

    <!-- how far the Moon currently sits off the ecliptic -->
    <line x1={moonX} y1={moonY} x2={moonX} y2={moonEclY} class="droplat" />
    <circle cx={moonX} cy={moonEclY} r="1.6" fill="#caa64a" />
    <circle cx={moonX} cy={moonY} r="7" fill="url(#nd-moon)" stroke="#0c0d1a" stroke-width="0.75" />
    <text x={moonX} y={moonY - 11} class="lab lab--moon" text-anchor="middle"
      >{hi('चन्द्र', 'Moon')}</text
    >
  </svg>

  <p class="status">{status}</p>
</div>

<style>
  .nodes {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  svg {
    width: 100%;
    display: block;
    border: 1px solid var(--line);
    border-radius: var(--radius, 12px);
  }
  .orbit {
    fill: none;
  }
  .orbit--front {
    stroke: #b9a7e8;
    stroke-width: 2;
  }
  .orbit--back {
    stroke: #6a5f8f;
    stroke-width: 1.5;
    stroke-dasharray: 4 4;
  }
  .nodeline {
    stroke: #7e84a4;
    stroke-width: 1;
    stroke-dasharray: 3 4;
  }
  .droplat {
    stroke: #caa64a;
    stroke-width: 1;
    stroke-dasharray: 2 2;
    opacity: 0.7;
  }
  .lab {
    font-size: 9.5px;
  }
  .lab--ecl {
    fill: #d9c074;
  }
  .lab--orb {
    fill: #c3b4ec;
  }
  .lab--moon {
    fill: #e7e2d2;
  }
  .node-dot {
    fill: #ff8a63;
  }
  .node-lab {
    font-size: 11px;
    fill: #ff8a63;
    font-weight: 700;
  }
  .node-sub {
    font-size: 8.5px;
    fill: #b88;
  }
  .status {
    margin: 0;
    font-size: 0.85rem;
    color: var(--ink-soft);
    text-align: center;
    min-height: 1.4em;
  }
</style>
