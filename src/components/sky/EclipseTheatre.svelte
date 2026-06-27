<script lang="ts">
  // Why eclipses happen — and why they're rare. The Moon laps the Sun every month
  // (elongation 0→360), but its orbit is tilted ~5°, so at most new moons it rides
  // ABOVE or BELOW the Sun and there's no eclipse. Only when a new/full Moon lands
  // on the ecliptic — i.e. exactly at a node, Rāhu (ascending) or Ketu (descending)
  // — does the shadow connect. This view plots the Moon's elongation (x) against its
  // ecliptic latitude (y), so you can watch it bob across the line and see the rare
  // crossings line up with real eclipses.
  import {
    dateToJulian,
    sunLongitudeAtJD,
    moonLongitudeAtJD,
    moonLatitudeAtJD,
    norm360,
    upcomingEclipses,
    type EclipseEvent,
  } from '$lib/astro';
  import { applyNumerals } from '$lib/format/numerals';

  let {
    lang = 'en',
    numerals = 'latin',
  }: { lang?: 'en' | 'hi'; numerals?: 'latin' | 'devanagari' } = $props();
  const hi = (h: string, e: string) => (lang === 'hi' ? h : e);
  const num = (s: string | number) => applyNumerals(String(s), numerals);

  const DAY = 86_400_000;

  // Real upcoming eclipses — start the scrubber on the next one for instant payoff.
  const eclipses: EclipseEvent[] = upcomingEclipses(new Date(), 6);
  let playing = $state(false);
  // dayOffset (days from the first upcoming eclipse) is the single source of truth;
  // the shown moment `t` derives from it. Scrub, Play, and the list all move it.
  const base = eclipses[0]?.peak.getTime() ?? Date.now();
  const maxDay = Math.ceil(((eclipses.at(-1)?.peak.getTime() ?? base) - base) / DAY) + 15;
  let dayOffset = $state(0);
  const t = $derived(new Date(base + dayOffset * DAY));

  const elongAt = (ms: number) => {
    const jd = dateToJulian(new Date(ms));
    return norm360(moonLongitudeAtJD(jd) - sunLongitudeAtJD(jd)); // 0 = new, 180 = full
  };

  const geo = $derived.by(() => {
    const jd = dateToJulian(t);
    return {
      elong: norm360(moonLongitudeAtJD(jd) - sunLongitudeAtJD(jd)),
      lat: moonLatitudeAtJD(jd),
    };
  });

  // The Moon's path over the surrounding ~lunar month (one full bob + sweep).
  const trail = $derived.by(() => {
    const N = 44;
    const span = 30 * DAY;
    const pts: { e: number; lat: number; k: number }[] = [];
    for (let i = 0; i <= N; i++) {
      const ms = t.getTime() - span / 2 + (i / N) * span;
      const jd = dateToJulian(new Date(ms));
      pts.push({ e: elongAt(ms), lat: moonLatitudeAtJD(jd), k: i / N });
    }
    return pts;
  });

  // ── SVG geometry ──
  const W = 480,
    H = 230,
    M = 30;
  const midY = 120;
  const LATMAX = 6; // ° shown top-to-bottom (real max ~5.3°)
  // new moon (elong 0) at centre, full moon at the edges; Moon sweeps right + wraps.
  const X = (elong: number) => M + (((elong + 180) % 360) / 360) * (W - 2 * M);
  const Y = (lat: number) => midY - (lat / LATMAX) * (midY - M);

  const moonX = $derived(X(geo.elong));
  const moonY = $derived(Y(geo.lat));

  const isNew = $derived(geo.elong < 6 || geo.elong > 354);
  const isFull = $derived(Math.abs(geo.elong - 180) < 6);
  // a real eclipse is on now if the Moon is within ~1° of the ecliptic at syzygy
  const eclipseNow = $derived.by(() => {
    if (Math.abs(geo.lat) > 1.1) return null;
    if (isNew) return 'solar';
    if (isFull) return 'lunar';
    return null;
  });

  // ── time controls ──
  function jumpTo(e: EclipseEvent) {
    playing = false;
    dayOffset = Math.round((e.peak.getTime() - base) / DAY);
  }

  $effect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = now - last;
      last = now;
      // ~5 days per second
      dayOffset = Math.min(maxDay, dayOffset + (dt / 1000) * 5);
      if (dayOffset >= maxDay) playing = false;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
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
  const KIND_HI: Record<string, string> = {
    total: 'पूर्ण',
    partial: 'आंशिक',
    annular: 'वलयाकार',
    penumbral: 'उपछाया',
  };
  const kindLabel = (e: EclipseEvent) => (lang === 'hi' ? KIND_HI[e.kind] : e.kind);
  const typeLabel = (e: EclipseEvent) =>
    e.type === 'solar' ? hi('सूर्य ग्रहण', 'Solar') : hi('चन्द्र ग्रहण', 'Lunar');
  const nodeLabel = (n: 'rahu' | 'ketu') =>
    n === 'rahu' ? hi('राहु', 'Rāhu') : hi('केतु', 'Ketu');
</script>

<div class="eclipse">
  <svg
    class="diagram"
    viewBox="0 0 {W} {H}"
    role="img"
    aria-label={hi('ग्रहण ज्यामिति', 'Eclipse geometry')}
  >
    <!-- the ecliptic: the Sun's path, latitude 0 -->
    <line x1={M} y1={midY} x2={W - M} y2={midY} class="ecliptic" />
    <text x={W - M} y={midY - 5} class="axis" text-anchor="end"
      >{hi('क्रांतिवृत्त', 'ecliptic')}</text
    >

    <!-- full-moon (edges) = Earth's shadow → lunar eclipse zone -->
    <circle cx={M} cy={midY} r="9" class="shadow" />
    <circle cx={W - M} cy={midY} r="9" class="shadow" />
    <text x={M} y={H - 8} class="zone" text-anchor="middle">{hi('पूर्णिमा', 'full')}</text>
    <text x={W - M} y={H - 8} class="zone" text-anchor="middle">{hi('पूर्णिमा', 'full')}</text>

    <!-- new-moon (centre) = the Sun → solar eclipse zone -->
    <circle cx={W / 2} cy={midY} r="13" class="sun" />
    <text x={W / 2} y={H - 8} class="zone" text-anchor="middle">{hi('अमावस्या', 'new')}</text>

    <!-- the Moon's path over a month: dots fading from old → now -->
    {#each trail as p (p.k)}
      <circle cx={X(p.e)} cy={Y(p.lat)} r="1.7" class="trail" style="opacity:{0.12 + 0.5 * p.k}" />
    {/each}
    <!-- nodes: where the path crosses the ecliptic -->
    <text x={W / 2 - 70} y={midY - 8} class="node">☊ {nodeLabel('rahu')}</text>
    <text x={W / 2 + 70} y={midY + 16} class="node">☋ {nodeLabel('ketu')}</text>

    <!-- the Moon, now -->
    {#if eclipseNow}
      <circle cx={moonX} cy={moonY} r="22" class="flash flash--{eclipseNow}" />
    {/if}
    <circle cx={moonX} cy={moonY} r="7" class="moon" />

    <!-- latitude callout -->
    <text x={M} y={M - 8} class="axis">+5°</text>
    <text x={M} y={H - M + 14} class="axis">−5°</text>
  </svg>

  <p class="caption">
    {#if eclipseNow === 'solar'}
      <strong>{hi('सूर्य ग्रहण', 'Solar eclipse')}</strong> —
      {hi(
        'अमावस्या एक नोड पर — चन्द्रमा सूर्य को ढक लेता है।',
        'new Moon at a node — the Moon covers the Sun.',
      )}
    {:else if eclipseNow === 'lunar'}
      <strong>{hi('चन्द्र ग्रहण', 'Lunar eclipse')}</strong> —
      {hi(
        'पूर्णिमा एक नोड पर — चन्द्रमा पृथ्वी की छाया में।',
        'full Moon at a node — the Moon enters Earth’s shadow.',
      )}
    {:else if isNew}
      {hi('अमावस्या, पर चन्द्रमा क्रांतिवृत्त से', 'New Moon — but it rides')}
      <strong>{num(geo.lat.toFixed(1))}°</strong>
      {hi(
        'दूर — सूर्य के ऊपर/नीचे से गुज़रता है। कोई ग्रहण नहीं।',
        'off the ecliptic, so it slips past the Sun. No eclipse.',
      )}
    {:else}
      {hi('चन्द्रमा का अक्षांश', 'The Moon is')}
      <strong>{num(geo.lat.toFixed(1))}°</strong>
      {hi(
        '— नोड पर ही ग्रहण संभव है।',
        'off the ecliptic. Eclipses can only happen at a node (lat ≈ 0).',
      )}
    {/if}
  </p>

  <div class="controls">
    <button type="button" class="play" onclick={() => (playing = !playing)}>
      {playing ? hi('⏸ रोकें', '⏸ Pause') : hi('▶ चलाएँ', '▶ Play')}
    </button>
    <input
      class="scrub"
      type="range"
      min="-30"
      max={maxDay}
      bind:value={dayOffset}
      aria-label={hi('समय', 'Time')}
    />
    <span class="when">{fmtDate(t)}</span>
  </div>

  <div class="list">
    <div class="list-lab">{hi('आगामी ग्रहण', 'Upcoming eclipses')}</div>
    {#each eclipses as e (e.peak.getTime())}
      <button
        type="button"
        class="ev ev--{e.type}"
        class:on={Math.abs(t.getTime() - e.peak.getTime()) < DAY}
        onclick={() => jumpTo(e)}
      >
        <span class="ev-icon" aria-hidden="true">{e.type === 'solar' ? '☀' : '🌑'}</span>
        <span class="ev-main">
          <span class="ev-kind">{kindLabel(e)} {typeLabel(e)}</span>
          <span class="ev-date">{fmtDate(e.peak)}</span>
        </span>
        <span class="ev-node">{e.node === 'rahu' ? '☊' : '☋'} {nodeLabel(e.node)}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .eclipse {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .diagram {
    width: 100%;
    display: block;
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: var(--radius, 12px);
  }
  .ecliptic {
    stroke: var(--ink-soft);
    stroke-width: 1;
    stroke-dasharray: 4 4;
  }
  .axis {
    font-size: 9px;
    fill: var(--ink-faint, #999);
  }
  .zone {
    font-size: 9.5px;
    fill: var(--ink-soft);
  }
  .sun {
    fill: #f5a623;
    stroke: #e07b00;
    stroke-width: 0.75;
  }
  .shadow {
    fill: var(--paper-3);
    stroke: var(--ink-soft);
    stroke-width: 1;
    stroke-dasharray: 2 2;
  }
  .trail {
    fill: var(--ink-soft);
  }
  .node {
    font-size: 10px;
    fill: var(--red);
    font-weight: 600;
  }
  .moon {
    fill: #f1ecdd;
    stroke: var(--ink);
    stroke-width: 1;
  }
  .flash {
    animation: pulse 1.1s ease-in-out infinite;
  }
  .flash--solar {
    fill: #f5a623;
    opacity: 0.35;
  }
  .flash--lunar {
    fill: var(--red);
    opacity: 0.3;
  }
  @keyframes pulse {
    0%,
    100% {
      opacity: 0.18;
    }
    50% {
      opacity: 0.42;
    }
  }
  .caption {
    font-size: 0.85rem;
    color: var(--ink-soft);
    margin: 0;
    min-height: 2.4em;
    line-height: 1.4;
  }
  .controls {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  .play {
    flex: none;
    padding: 0.32rem 0.7rem;
    border: 1px solid var(--line);
    border-radius: var(--radius-pill, 999px);
    background: var(--paper);
    color: var(--ink);
    font: inherit;
    font-size: 0.8rem;
    cursor: pointer;
  }
  .scrub {
    flex: 1;
    accent-color: var(--red);
  }
  .when {
    flex: none;
    font-size: 0.78rem;
    color: var(--ink-soft);
    font-variant-numeric: tabular-nums;
    min-width: 6.5rem;
    text-align: right;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .list-lab {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-faint, #999);
    margin-bottom: 2px;
  }
  .ev {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: var(--paper);
    color: var(--ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .ev.on {
    border-color: var(--red);
    box-shadow: 0 0 0 1px var(--red);
  }
  .ev-icon {
    font-size: 1rem;
    flex: none;
  }
  .ev-main {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .ev-kind {
    font-size: 0.86rem;
    text-transform: capitalize;
  }
  .ev-date {
    font-size: 0.74rem;
    color: var(--ink-soft);
  }
  .ev-node {
    flex: none;
    font-size: 0.8rem;
    color: var(--red);
    font-weight: 600;
  }
</style>
