<script lang="ts">
  // What the eclipse actually looks like. The Sun/Moon (or Earth's shadow + Moon)
  // are drawn at their REAL apparent sizes and the separation that matches the
  // real obscuration at peak; scrub from first to last contact. Annular shows the
  // ring (Moon too far to cover the Sun), total shows the corona + chromosphere
  // with stars coming out, a lunar eclipse reddens (with the ozone-blue rim) as the
  // Moon slides into the umbra.
  import {
    upcomingEclipses,
    eclipseGeometry,
    eclipseCoverageAt,
    EclipseKind,
    type EclipseEvent,
  } from '$lib/astro';
  import { applyNumerals } from '$lib/format/numerals';

  let {
    lang = 'en',
    numerals = 'latin',
  }: { lang?: 'en' | 'hi'; numerals?: 'latin' | 'devanagari' } = $props();
  const hi = (h: string, e: string) => (lang === 'hi' ? h : e);
  const num = (s: string | number) => applyNumerals(String(s), numerals);

  const eclipses: EclipseEvent[] = upcomingEclipses(new Date(), 6);
  let sel = $state(0);
  const eclipse = $derived(eclipses[sel]);
  const g = $derived(eclipseGeometry(eclipse));
  let tau = $state(0); // minutes from peak
  let playing = $state(false);
  $effect(() => {
    void eclipse; // reset the scrub when a different eclipse is chosen
    tau = 0;
    playing = false;
  });

  const coverage = $derived(eclipseCoverageAt(g, tau)); // 0..1 of the obscured disc
  const smooth = (x: number, a: number, b: number) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  // deterministic hash → [0,1), so the starfield/corona are stable across renders
  const rnd = (i: number, s: number) => {
    const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
    return v - Math.floor(v);
  };

  // ── SVG ──
  const W = 320;
  const H = 240;
  const cx = W / 2;
  const cy = 112;
  const isSolar = $derived(g.type === 'solar');
  // Solar: the Sun sits at (cx,cy) and the Moon (~same apparent size) slides across
  // it. Lunar: the Moon is the subject — drawn large at centre — and Earth's much
  // bigger shadow sweeps over it (the iconic blood-moon framing).
  const RM = Math.min(W, H) * 0.25; // lunar Moon radius target (px)
  const scale = $derived(
    isSolar ? (Math.min(W, H) * 0.78) / (2 * (g.sunR + g.moonR)) : RM / g.moonR,
  );
  const px = (deg: number) => deg * scale;
  const moonX = $derived(isSolar ? cx + (tau / g.windowMin) * (g.sunR + g.moonR) * scale : cx);
  const moonY = $derived(isSolar ? cy + g.minSepDeg * scale : cy);
  // lunar only: Earth's shadow centre, offset from the Moon by the scrub + the min sep
  const shadowX = $derived(cx - (tau / g.windowMin) * (g.penumbraR + g.moonR) * scale);
  const shadowY = $derived(cy - g.minSepDeg * scale);

  const isTotal = $derived(g.kind === EclipseKind.Total);
  const skyDark = $derived(isSolar ? coverage * 0.94 : 0.9); // lunar is always night
  const mix = (a: number[], b: number[], t: number) =>
    `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * t)).join(',')})`;
  const sky = $derived(mix([226, 218, 199], [9, 10, 22], skyDark));

  // corona / chromosphere / diamond ring only make sense for a TOTAL solar eclipse
  const coronaOp = $derived(isSolar && isTotal ? smooth(coverage, 0.86, 0.99) : 0);
  const diamondOp = $derived(
    isSolar && isTotal ? smooth(coverage, 0.9, 0.985) * (1 - smooth(coverage, 0.992, 1)) : 0,
  );
  const starOp = $derived(isSolar ? smooth(coverage, 0.95, 1) : 0.85);
  // the exposed-Sun side (for the diamond bead), opposite the Moon's offset
  const diamond = $derived.by(() => {
    const dx = cx - moonX;
    const dy = cy - moonY;
    const m = Math.hypot(dx, dy) || 1;
    return { x: cx + (dx / m) * px(g.sunR), y: cy + (dy / m) * px(g.sunR) };
  });

  const STARS = Array.from({ length: 46 }, (_, i) => ({
    x: rnd(i, 1) * W,
    y: rnd(i, 2) * H,
    r: 0.35 + rnd(i, 3) * 0.7,
  }));
  const STREAMERS = Array.from({ length: 40 }, (_, i) => ({
    a: (i / 40) * Math.PI * 2 + rnd(i, 5) * 0.16,
    len: 1.35 + rnd(i, 6) * 1.7,
    w: 0.5 + rnd(i, 7) * 1.1,
  }));
  // a few maria so the lunar disc reads as the Moon, not a flat coin
  const CRATERS: [number, number, number][] = [
    [-0.32, -0.3, 0.15],
    [0.3, 0.18, 0.11],
    [0.08, 0.44, 0.085],
    [-0.46, 0.26, 0.07],
    [0.42, -0.3, 0.075],
    [-0.05, -0.02, 0.055],
    [0.5, 0.4, 0.05],
  ];

  // play: first → last contact in ~8 s
  $effect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = now - last;
      last = now;
      tau = Math.min(g.windowMin, tau + (dt / 1000) * ((2 * g.windowMin) / 8));
      if (tau >= g.windowMin) playing = false;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });
  function play() {
    if (tau >= g.windowMin) tau = -g.windowMin;
    playing = !playing;
  }

  function clk(min: number): string {
    const s = min < 0 ? '−' : '+';
    const a = Math.abs(Math.round(min));
    return `${s}${num(Math.floor(a / 60))}:${num(String(a % 60).padStart(2, '0'))}`;
  }
  const KIND_HI: Record<string, string> = {
    total: 'पूर्ण',
    partial: 'आंशिक',
    annular: 'वलयाकार',
    penumbral: 'उपछाया',
  };
  const kindWord = $derived(lang === 'hi' ? KIND_HI[g.kind] : g.kind);
  const caption = $derived.by(() => {
    if (isSolar && g.kind === EclipseKind.Total)
      return hi(
        'पूर्ण — चन्द्रमा सूर्य को पूरा ढक लेता है; किरीट (corona) दिखता है।',
        'Total — the Moon fully covers the Sun; the corona appears.',
      );
    if (isSolar && g.kind === EclipseKind.Annular)
      return hi(
        'वलयाकार — चन्द्रमा बहुत दूर है, सूर्य का छल्ला बचा रहता है।',
        'Annular — the Moon is too far to cover the Sun; a ring of fire remains.',
      );
    if (isSolar)
      return hi(
        'आंशिक — चन्द्रमा सूर्य का एक हिस्सा ढकता है।',
        'Partial — the Moon bites the Sun.',
      );
    if (g.kind === EclipseKind.Total)
      return hi(
        'पूर्ण — चन्द्रमा पूरी तरह पृथ्वी की छाया में, ताम्र-लाल।',
        'Total — the Moon slides fully into Earth’s umbra and glows red.',
      );
    if (g.kind === EclipseKind.Partial)
      return hi(
        'आंशिक — चन्द्रमा का एक भाग छाया में।',
        'Partial — part of the Moon enters the umbra.',
      );
    return hi('उपछाया — हल्की छाया, मंद धुंधलापन।', 'Penumbral — only a faint shading.');
  });

  function fmtDate(d: Date): string {
    return num(
      new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        numberingSystem: 'latn',
      }).format(d),
    );
  }
  const typeWord = $derived(isSolar ? hi('सूर्य', 'Solar') : hi('चन्द्र', 'Lunar'));
  const nodeWord = $derived(eclipse.node === 'rahu' ? hi('राहु', 'Rāhu') : hi('केतु', 'Ketu'));
</script>

<div class="disk">
  <div class="picker">
    <button
      type="button"
      class="step"
      onclick={() => (sel = (sel - 1 + eclipses.length) % eclipses.length)}
      aria-label={hi('पिछला', 'Previous')}>◀</button
    >
    <span class="picker-lab"
      >{kindWord}
      {typeWord} · {fmtDate(eclipse.peak)} · {eclipse.node === 'rahu' ? '☊' : '☋'}
      {nodeWord}</span
    >
    <button
      type="button"
      class="step"
      onclick={() => (sel = (sel + 1) % eclipses.length)}
      aria-label={hi('अगला', 'Next')}>▶</button
    >
  </div>

  <svg viewBox="0 0 {W} {H}" role="img" aria-label={hi('ग्रहण की झाँकी', 'Eclipse view')}>
    <defs>
      <radialGradient id="ed-sun" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fff7da" />
        <stop offset="62%" stop-color="#ffe070" />
        <stop offset="90%" stop-color="#ffb52e" />
        <stop offset="100%" stop-color="#f0860a" />
      </radialGradient>
      <radialGradient id="ed-corona" cx="50%" cy="50%" r="50%">
        <stop offset="30%" stop-color="#fff" stop-opacity="0" />
        <stop offset="42%" stop-color="#fff6e2" stop-opacity="0.55" />
        <stop offset="62%" stop-color="#fde6c8" stop-opacity="0.22" />
        <stop offset="100%" stop-color="#fde6c8" stop-opacity="0" />
      </radialGradient>
      <radialGradient
        id="ed-umbra-fill"
        gradientUnits="userSpaceOnUse"
        cx={shadowX}
        cy={shadowY}
        r={px(g.umbraR)}
      >
        <stop offset="0%" stop-color="#2a0b06" />
        <stop offset="70%" stop-color="#6e2412" />
        <stop offset="100%" stop-color="#a8431f" />
      </radialGradient>
      <radialGradient
        id="ed-umbra-shadow"
        gradientUnits="userSpaceOnUse"
        cx={shadowX}
        cy={shadowY}
        r={px(g.umbraR)}
      >
        <stop offset="0%" stop-color="#1d100b" />
        <stop offset="100%" stop-color="#2c1813" />
      </radialGradient>
      <radialGradient id="ed-moonlit" cx="38%" cy="34%" r="72%">
        <stop offset="0%" stop-color="#fbf4df" />
        <stop offset="70%" stop-color="#e9dcbb" />
        <stop offset="100%" stop-color="#cdba8e" />
      </radialGradient>
      <radialGradient id="ed-moondark" cx="40%" cy="36%" r="70%">
        <stop offset="0%" stop-color="#23202c" />
        <stop offset="100%" stop-color="#0e0c14" />
      </radialGradient>
      <filter id="ed-soft" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="2.1" />
      </filter>
      <clipPath id="ed-umbra"><circle cx={shadowX} cy={shadowY} r={px(g.umbraR)} /></clipPath>
      <clipPath id="ed-penumbra"><circle cx={shadowX} cy={shadowY} r={px(g.penumbraR)} /></clipPath>
      <clipPath id="ed-moon"><circle cx={moonX} cy={moonY} r={px(g.moonR)} /></clipPath>
    </defs>

    <rect x="0" y="0" width={W} height={H} fill={sky} />
    {#if starOp > 0.01}
      <g fill="#fff" opacity={starOp}>
        {#each STARS as s, i (i)}
          <circle cx={s.x} cy={s.y} r={s.r} opacity={0.4 + rnd(i, 9) * 0.6} />
        {/each}
      </g>
    {/if}

    {#if isSolar}
      <!-- corona behind, then the Sun, then the occulting Moon -->
      {#if coronaOp > 0.01}
        <g opacity={coronaOp} filter="url(#ed-soft)">
          <circle {cx} {cy} r={px(g.sunR) * 2.9} fill="url(#ed-corona)" />
          <g stroke="#fff6e6" stroke-linecap="round">
            {#each STREAMERS as st, i (i)}
              <line
                x1={cx + Math.cos(st.a) * px(g.sunR) * 1.02}
                y1={cy + Math.sin(st.a) * px(g.sunR) * 1.02}
                x2={cx + Math.cos(st.a) * px(g.sunR) * st.len}
                y2={cy + Math.sin(st.a) * px(g.sunR) * st.len}
                stroke-width={st.w}
                opacity={0.16 + rnd(i, 8) * 0.22}
              />
            {/each}
          </g>
        </g>
        <!-- chromosphere: thin red ring at the limb -->
        <circle
          {cx}
          {cy}
          r={px(g.sunR) * 1.04}
          fill="none"
          stroke="#ff5a3c"
          stroke-width="1.4"
          opacity={coronaOp}
        />
      {/if}
      <circle {cx} {cy} r={px(g.sunR)} fill="url(#ed-sun)" />
      <circle cx={moonX} cy={moonY} r={px(g.moonR)} fill="url(#ed-moondark)" />
      {#if diamondOp > 0.01}
        <circle
          cx={diamond.x}
          cy={diamond.y}
          r="5.5"
          fill="#fff7df"
          opacity={diamondOp}
          filter="url(#ed-soft)"
        />
        <circle cx={diamond.x} cy={diamond.y} r="2.2" fill="#fff" opacity={diamondOp} />
      {/if}
    {:else}
      <!-- Earth's shadow (dark) sweeps over the Moon; only the Moon reddens inside the umbra -->
      <circle cx={shadowX} cy={shadowY} r={px(g.penumbraR)} fill="#191527" opacity="0.4" />
      <circle cx={shadowX} cy={shadowY} r={px(g.umbraR)} fill="url(#ed-umbra-shadow)" />
      <!-- bright Moon + maria -->
      <circle cx={moonX} cy={moonY} r={px(g.moonR)} fill="url(#ed-moonlit)" />
      <g clip-path="url(#ed-moon)">
        {#each CRATERS as [dxp, dyp, cr] (`${dxp},${dyp}`)}
          <ellipse
            cx={moonX + dxp * px(g.moonR)}
            cy={moonY + dyp * px(g.moonR)}
            rx={cr * px(g.moonR)}
            ry={cr * px(g.moonR) * 0.82}
            fill="rgba(120,100,62,0.18)"
          />
        {/each}
      </g>
      <!-- the part inside the penumbra dims a little -->
      <circle
        cx={moonX}
        cy={moonY}
        r={px(g.moonR)}
        clip-path="url(#ed-penumbra)"
        fill="#000"
        opacity="0.18"
      />
      <!-- the part inside the umbra glows red (over the same craters) -->
      <g clip-path="url(#ed-umbra)">
        <circle cx={moonX} cy={moonY} r={px(g.moonR)} fill="url(#ed-umbra-fill)" />
        <g clip-path="url(#ed-moon)">
          {#each CRATERS as [dxp, dyp, cr] (`u${dxp},${dyp}`)}
            <ellipse
              cx={moonX + dxp * px(g.moonR)}
              cy={moonY + dyp * px(g.moonR)}
              rx={cr * px(g.moonR)}
              ry={cr * px(g.moonR) * 0.82}
              fill="rgba(0,0,0,0.22)"
            />
          {/each}
        </g>
      </g>
      <!-- ozone-blue rim where the umbra edge crosses the Moon -->
      <g clip-path="url(#ed-moon)">
        <circle
          cx={shadowX}
          cy={shadowY}
          r={px(g.umbraR)}
          fill="none"
          stroke="#5a90c8"
          stroke-width="2.4"
          opacity="0.55"
        />
      </g>
      <circle
        cx={moonX}
        cy={moonY}
        r={px(g.moonR)}
        fill="none"
        stroke="rgba(0,0,0,0.25)"
        stroke-width="0.75"
      />
    {/if}
  </svg>

  <p class="cap"><strong>{kindWord}</strong> · {caption}</p>

  <div class="controls">
    <button type="button" class="play" onclick={play}>
      {playing ? hi('⏸', '⏸') : hi('▶', '▶')}
    </button>
    <input
      class="scrub"
      type="range"
      min={-g.windowMin}
      max={g.windowMin}
      step="1"
      bind:value={tau}
      aria-label={hi('समय', 'Time from peak')}
    />
    <span class="clk">{clk(tau)}</span>
  </div>
</div>

<style>
  .disk {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .picker {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
  .picker .step {
    flex: none;
    width: 1.7rem;
    height: 1.7rem;
    border: 1px solid var(--line);
    border-radius: 50%;
    background: var(--paper);
    color: var(--ink);
    cursor: pointer;
    font-size: 0.7rem;
  }
  .picker-lab {
    font-size: 0.82rem;
    color: var(--ink);
    text-align: center;
    text-transform: capitalize;
  }
  svg {
    width: 100%;
    display: block;
    border-radius: var(--radius, 12px);
    border: 1px solid var(--line);
  }
  .cap {
    font-size: 0.85rem;
    color: var(--ink-soft);
    margin: 0;
    min-height: 2.4em;
    line-height: 1.4;
  }
  .cap strong {
    text-transform: capitalize;
    color: var(--ink);
  }
  .controls {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  .play {
    flex: none;
    width: 2rem;
    height: 2rem;
    border: 1px solid var(--line);
    border-radius: 50%;
    background: var(--paper);
    color: var(--ink);
    font-size: 0.8rem;
    cursor: pointer;
  }
  .scrub {
    flex: 1;
    accent-color: var(--red);
  }
  .clk {
    flex: none;
    font-size: 0.78rem;
    color: var(--ink-soft);
    font-variant-numeric: tabular-nums;
    min-width: 3.2rem;
    text-align: right;
  }
</style>
