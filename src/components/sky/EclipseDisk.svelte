<script lang="ts">
  // What the eclipse actually looks like. The Sun/Moon (or Earth's shadow + Moon)
  // are drawn at their REAL apparent sizes and the separation that matches the
  // real obscuration at peak; scrub from first to last contact. Annular shows the
  // ring (Moon too far to cover the Sun), total shows the corona, a lunar eclipse
  // reddens as the Moon slides into the umbra.
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

  // ── SVG ──
  const W = 320;
  const H = 230;
  const cx = W / 2;
  const cy = 108;
  const isSolar = $derived(g.type === 'solar');
  const outerR = $derived(isSolar ? g.sunR : g.penumbraR);
  const scale = $derived((Math.min(W, H) * 0.8) / (2 * (outerR + g.moonR))); // px/°
  const px = (deg: number) => deg * scale;
  // Moon centre: scrub moves it along the chord; the perpendicular gap is the peak min sep
  const moonX = $derived(cx + (tau / g.windowMin) * (outerR + g.moonR) * scale);
  const moonY = $derived(cy + g.minSepDeg * scale);

  const totalNow = $derived(isSolar && g.kind === EclipseKind.Total && coverage > 0.999);
  const skyDark = $derived(isSolar ? coverage * 0.92 : 0.86); // lunar is always night
  const mix = (a: number[], b: number[], t: number) =>
    `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * t)).join(',')})`;
  const sky = $derived(mix([224, 216, 197], [17, 16, 30], skyDark));

  // play: first → last contact in ~7 s
  $effect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = now - last;
      last = now;
      tau = Math.min(g.windowMin, tau + (dt / 1000) * ((2 * g.windowMin) / 7));
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
        <stop offset="55%" stop-color="#ffe680" />
        <stop offset="100%" stop-color="#ff9d1c" />
      </radialGradient>
      <radialGradient id="ed-corona" cx="50%" cy="50%" r="50%">
        <stop offset="36%" stop-color="#fff" stop-opacity="0" />
        <stop offset="48%" stop-color="#fff7e0" stop-opacity="0.85" />
        <stop offset="100%" stop-color="#fff7e0" stop-opacity="0" />
      </radialGradient>
      <clipPath id="ed-umbra"><circle {cx} {cy} r={px(g.umbraR)} /></clipPath>
      <clipPath id="ed-penumbra"><circle {cx} {cy} r={px(g.penumbraR)} /></clipPath>
    </defs>

    <rect x="0" y="0" width={W} height={H} fill={sky} />

    {#if isSolar}
      {#if totalNow}
        <circle cx={moonX} cy={moonY} r={px(g.moonR) * 2.7} fill="url(#ed-corona)" />
      {/if}
      <circle {cx} {cy} r={px(g.sunR)} fill="url(#ed-sun)" />
      <circle cx={moonX} cy={moonY} r={px(g.moonR)} class="moon-dark" />
    {:else}
      <circle {cx} {cy} r={px(g.penumbraR)} class="penumbra" />
      <circle {cx} {cy} r={px(g.umbraR)} class="umbra" />
      <circle cx={moonX} cy={moonY} r={px(g.moonR)} class="moon-bright" />
      <circle
        cx={moonX}
        cy={moonY}
        r={px(g.moonR)}
        class="moon-pen"
        clip-path="url(#ed-penumbra)"
      />
      <circle cx={moonX} cy={moonY} r={px(g.moonR)} class="moon-umb" clip-path="url(#ed-umbra)" />
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
  .moon-dark {
    fill: #14121c;
  }
  .penumbra {
    fill: #2a2740;
  }
  .umbra {
    fill: #1c1526;
  }
  .moon-bright {
    fill: #efe9da;
  }
  .moon-pen {
    fill: #000;
    opacity: 0.22;
  }
  .moon-umb {
    fill: #7e2a1c;
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
