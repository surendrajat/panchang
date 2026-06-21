<script module lang="ts">
  import type { GrahaKey } from '$lib/jyotish';
  // What a tap on the wheel selects — surfaced to the parent so a learn card can
  // describe it. The wheel itself stays presentational.
  export type WheelPick = {
    type: 'rashi' | 'sun' | 'moon' | 'earth' | 'graha' | 'nakshatra';
    i?: number;
    key?: GrahaKey;
  };
  // module-level id counter so each instance's gradient ids never collide when
  // several wheels share one page (the guide renders many).
  let _uid = 0;
</script>

<script lang="ts">
  // A configurable geocentric ecliptic wheel, extracted from routes/Sky.svelte so
  // the learning guide can show progressively-richer versions of the same
  // picture (signs only → +Moon → +nakshatra ring → +grahas). Earth at the
  // centre; angle around the ring = sidereal ecliptic longitude. Every position
  // is passed in from the real engine — this component only draws.
  import { rashiLabel, grahaLabel } from '$lib/labels';
  import { SIGN_GLYPH } from '$lib/jyotish/glyphs';
  import { norm360 } from '$lib/astro';
  import BodyIcon from '../BodyIcon.svelte';
  import EarthIcon from './EarthIcon.svelte';

  interface Show {
    signs?: boolean; // the 12 rashi sectors
    signNames?: boolean; // curved sign names
    signGlyphs?: boolean; // the zodiac glyph in each sector
    sun?: boolean;
    moon?: boolean;
    earth?: boolean; // Earth disc at the centre
    nakRing?: boolean; // 27 nakshatra ticks
    nakBand?: boolean; // highlight the Moon's current nakshatra
    elong?: boolean; // the Sun→Moon elongation arc
    angles?: boolean; // angle-measurement overlay (0° base + arc per body)
    grahas?: boolean; // the five planets + nodes (needs `grahas` prop)
  }

  let {
    sunLon, // sidereal longitude of the Sun, degrees
    moonLon, // sidereal longitude of the Moon, degrees
    ayan = 0, // ayanamsa, degrees — only used when tropical is on
    grahas = [], // sidereal graha longitudes, when show.grahas
    tropical = false, // rotate the sign ring by the ayanamsa
    size = 380,
    show = {},
    selected = null,
    onpick,
    label = 'Ecliptic wheel',
    earthLabel = 'Earth', // localized name shown on hover/focus of the centre Earth
    labelsShown = false, // show all body names at once (Sky's "Labels" toggle)
    events = [], // markers on the ring: { key, lon (sidereal °), label }
  }: {
    sunLon: number;
    moonLon: number;
    ayan?: number;
    grahas?: { key: GrahaKey; lon: number }[];
    tropical?: boolean;
    size?: number;
    show?: Show;
    selected?: WheelPick | null;
    onpick?: (pick: WheelPick) => void;
    label?: string;
    earthLabel?: string;
    labelsShown?: boolean;
    events?: { key: string; lon: number; label: string }[];
  } = $props();

  _uid += 1;
  const uid = `ew${_uid}`;

  // sensible defaults, overridden by whatever the caller passes
  const f = $derived<Required<Show>>({
    signs: true,
    signNames: true,
    signGlyphs: true,
    sun: true,
    moon: true,
    earth: false,
    nakRing: false,
    nakBand: false,
    elong: false,
    angles: false,
    grahas: false,
    ...show,
  });

  // ── Geometry (base values tuned at size 380, scaled for any size) ───────────
  const k = $derived(size / 380);
  const C = $derived(size / 2);
  const R_OUT = $derived(184 * k);
  const R_IN = $derived(138 * k);
  const R_NAME = $derived(170 * k);
  // With a curved name above it the glyph tucks inside at 149; with no name the
  // glyph should sit at the band's centre (≈ midway between R_IN and R_OUT).
  const R_ICON = $derived((f.signNames ? 149 : 161) * k);
  const R_BODY = $derived(116 * k);
  const R_ARC = $derived(54 * k);
  const NAK_ARC = 360 / 27;

  // Each graha gets its own radius so the inner planets don't pile onto the Sun;
  // the radius is purely visual (only the angle carries meaning).
  const GRAHA_RADIUS: Record<GrahaKey, number> = {
    sun: 116,
    moon: 116,
    ketu: 58,
    mercury: 65,
    venus: 72,
    rahu: 79,
    mars: 86,
    saturn: 93,
    jupiter: 100,
  };

  function pt(deg: number, r: number): [number, number] {
    const a = (deg * Math.PI) / 180;
    return [C + r * Math.cos(a), C - r * Math.sin(a)];
  }
  const ptStr = (deg: number, r: number) =>
    pt(deg, r)
      .map((n) => n.toFixed(2))
      .join(' ');
  function sector(s: number, e: number): string {
    return `M ${ptStr(s, R_IN)} L ${ptStr(s, R_OUT)} A ${R_OUT} ${R_OUT} 0 0 0 ${ptStr(e, R_OUT)} L ${ptStr(e, R_IN)} A ${R_IN} ${R_IN} 0 0 1 ${ptStr(s, R_IN)} Z`;
  }
  // upright curved sign name (flipped on the bottom half so it never reads upside-down)
  function namePath(i: number): string {
    const m = i * 30 + 15;
    const sp = 13;
    const up = Math.sin((m * Math.PI) / 180) >= 0;
    return up
      ? `M ${ptStr(m + sp, R_NAME)} A ${R_NAME} ${R_NAME} 0 0 1 ${ptStr(m - sp, R_NAME)}`
      : `M ${ptStr(m - sp, R_NAME)} A ${R_NAME} ${R_NAME} 0 0 0 ${ptStr(m + sp, R_NAME)}`;
  }

  const ringShift = $derived(tropical ? ayan : 0);
  const displaySign = (sidLon: number) => Math.floor(norm360(sidLon + ringShift) / 30);
  const signName = (i: number) => rashiLabel(i);

  const elong = $derived(norm360(moonLon - sunLon));
  const sunRashi = $derived(displaySign(sunLon));
  const moonRashi = $derived(displaySign(moonLon));
  const nakNum = $derived(Math.floor(moonLon / NAK_ARC) + 1);

  const rashis = Array.from({ length: 12 }, (_, i) => i);
  const nakTicks = $derived(Array.from({ length: 27 }, (_, i) => i * NAK_ARC));
  const rayAngles = Array.from({ length: 12 }, (_, i) => (i * 360) / 12);

  const sunPt = $derived(pt(sunLon, R_BODY));
  const moonPt = $derived(pt(moonLon, R_BODY));
  const elongPath = $derived(
    `M ${ptStr(sunLon, R_ARC)} A ${R_ARC} ${R_ARC} 0 ${elong > 180 ? 1 : 0} 0 ${ptStr(moonLon, R_ARC)}`,
  );
  const angleArc = (deg: number, r: number) =>
    `M ${ptStr(0, r)} A ${r} ${r} 0 ${deg > 180 ? 1 : 0} 0 ${ptStr(deg, r)}`;
  const nakBandPath = $derived.by(() => {
    const a = (nakNum - 1) * NAK_ARC;
    const b = nakNum * NAK_ARC;
    const w = 7 * k;
    return `M ${ptStr(a, R_IN)} A ${R_IN} ${R_IN} 0 0 0 ${ptStr(b, R_IN)} L ${ptStr(b, R_IN - w)} A ${R_IN - w} ${R_IN - w} 0 0 1 ${ptStr(a, R_IN - w)} Z`;
  });

  // fixed Moon craters (offsets within the disc — a look, not a phase)
  const craters = [
    [-3, -2, 2.4],
    [3, 1.5, 1.7],
    [0.5, 4, 1.3],
    [-4.5, 3, 1],
  ];

  const grahaLayout = $derived(
    f.grahas ? grahas.map((g) => ({ ...g, r: GRAHA_RADIUS[g.key] * k })) : [],
  );

  const interactive = $derived(typeof onpick === 'function');
  function pick(p: WheelPick) {
    onpick?.(p);
  }
  function keyPick(e: KeyboardEvent, p: WheelPick) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pick(p);
    }
  }
</script>

<svg
  class="wheel"
  class:labels-shown={labelsShown}
  viewBox="0 0 {size} {size}"
  role="img"
  aria-label={label}
  style="--bsize:{9 * k}px"
>
  <defs>
    <radialGradient id="{uid}-sun" cx="38%" cy="36%" r="68%">
      <stop offset="0%" stop-color="#fff8d8" />
      <stop offset="48%" stop-color="#ffce3a" />
      <stop offset="100%" stop-color="#f08a00" />
    </radialGradient>
    <radialGradient id="{uid}-sunglow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffcf4d" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#ffcf4d" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="{uid}-moon" cx="38%" cy="36%" r="70%">
      <stop offset="0%" stop-color="#f2efe6" />
      <stop offset="100%" stop-color="#d9d2c2" />
    </radialGradient>
  </defs>

  <!-- zodiac ring (rotates by the ayanamsa in tropical mode) -->
  {#if f.signs}
    <g transform="rotate({ringShift} {C} {C})">
      {#each rashis as i (i)}
        {@const isSun = i === sunRashi}
        {@const isMoon = i === moonRashi}
        {@const [ix, iy] = pt(i * 30 + 15, R_ICON)}
        <g class="sign" class:names-off={!f.signNames}>
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <path
            d={sector(i * 30, (i + 1) * 30)}
            class="rashi"
            class:rashi--alt={i % 2 === 1}
            class:rashi--sun={isSun && f.sun}
            class:rashi--moon={isMoon && !(isSun && f.sun) && f.moon}
            class:rashi--selected={selected?.type === 'rashi' && selected.i === i}
            class:interactive
            role={interactive ? 'button' : undefined}
            tabindex={interactive ? 0 : undefined}
            aria-label={interactive ? signName(i) : undefined}
            onclick={interactive ? () => pick({ type: 'rashi', i }) : undefined}
            onkeydown={interactive ? (e) => keyPick(e, { type: 'rashi', i }) : undefined}
          />
          {#if f.signGlyphs}
            <text
              class="rashi-glyph zsym"
              x={ix}
              y={iy}
              text-anchor="middle"
              dominant-baseline="central"
              pointer-events="none">{SIGN_GLYPH[i]}</text
            >
          {/if}
          <!-- name: always on when signNames; otherwise revealed on hover/focus -->
          <defs><path id="{uid}-rn{i}" d={namePath(i)} fill="none" /></defs>
          <text class="rashi-name" class:reveal={!f.signNames}
            ><textPath href="#{uid}-rn{i}" startOffset="50%" text-anchor="middle"
              >{signName(i)}</textPath
            ></text
          >
        </g>
      {/each}
    </g>
  {/if}

  <!-- Nakshatra ticks live in the SIDEREAL frame (outside the rotate group): a
       nakshatra is fixed to the stars, so it never rotates with the tropical ring. -->
  {#if f.nakRing}
    {#each nakTicks as deg (deg)}
      <line
        x1={pt(deg, R_IN)[0]}
        y1={pt(deg, R_IN)[1]}
        x2={pt(deg, R_IN - 5 * k)[0]}
        y2={pt(deg, R_IN - 5 * k)[1]}
        class="nak-tick"
      />
    {/each}
  {/if}

  {#if f.nakBand}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <path
      d={nakBandPath}
      class="nak-current"
      role={interactive ? 'button' : undefined}
      tabindex={interactive ? 0 : undefined}
      aria-label={interactive ? 'Moon nakshatra' : undefined}
      onclick={interactive ? () => pick({ type: 'nakshatra' }) : undefined}
      onkeydown={interactive ? (e) => keyPick(e, { type: 'nakshatra' }) : undefined}
    />
  {/if}

  {#if f.elong}
    <path d={elongPath} class="elong-arc" fill="none" />
  {/if}
  {#if f.sun}
    <line x1={C} y1={C} x2={sunPt[0]} y2={sunPt[1]} class="ray ray--sun" />
  {/if}
  {#if f.moon}
    <line x1={C} y1={C} x2={moonPt[0]} y2={moonPt[1]} class="ray ray--moon" />
  {/if}

  {#if f.angles}
    {@const b = pt(0, 48 * k)}
    <line x1={C} y1={C} x2={b[0]} y2={b[1]} class="angle-base" />
    <path d={angleArc(sunLon, 30 * k)} class="angle-arc angle-arc--sun" fill="none" />
    <path d={angleArc(moonLon, 40 * k)} class="angle-arc angle-arc--moon" fill="none" />
  {/if}

  {#if f.grahas}
    {#each grahaLayout as g (g.key)}
      {@const [gx, gy] = pt(g.lon, g.r)}
      {@const sel = selected?.type === 'graha' && selected.key === g.key}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <g
        class="body"
        class:interactive
        role={interactive ? 'button' : undefined}
        tabindex={interactive ? 0 : undefined}
        aria-label={interactive ? grahaLabel(g.key) : undefined}
        onclick={interactive ? () => pick({ type: 'graha', key: g.key }) : undefined}
        onkeydown={interactive ? (e) => keyPick(e, { type: 'graha', key: g.key }) : undefined}
      >
        {#if sel}<circle cx={gx} cy={gy} r={13 * k} class="sel-glow" />{/if}
        <circle cx={gx} cy={gy} r={12 * k} class="hit" />
        <BodyIcon
          kind={g.key}
          cx={gx}
          cy={gy}
          r={(g.key === 'rahu' || g.key === 'ketu' ? 6 : 9) * k}
        />
        <text x={gx} y={gy - 14 * k} class="body-name" text-anchor="middle"
          >{grahaLabel(g.key)}</text
        >
      </g>
    {/each}
  {/if}

  {#if f.earth}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <g
      class="body"
      class:interactive
      role={interactive ? 'button' : undefined}
      tabindex={interactive ? 0 : undefined}
      aria-label={interactive ? earthLabel : undefined}
      onclick={interactive ? () => pick({ type: 'earth' }) : undefined}
      onkeydown={interactive ? (e) => keyPick(e, { type: 'earth' }) : undefined}
    >
      {#if selected?.type === 'earth'}<circle cx={C} cy={C} r={17 * k} class="sel-glow" />{/if}
      <EarthIcon cx={C} cy={C} r={13 * k} />
      <!-- transparent target: EarthIcon is pointer-events:none, so without this
           the centre Earth can't be hovered/clicked -->
      <circle cx={C} cy={C} r={14 * k} class="hit" />
      <text x={C} y={C - 18 * k} class="body-name" text-anchor="middle">{earthLabel}</text>
    </g>
  {/if}

  {#if f.moon}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <g
      class="body"
      class:interactive
      role={interactive ? 'button' : undefined}
      tabindex={interactive ? 0 : undefined}
      aria-label={interactive ? grahaLabel('moon') : undefined}
      onclick={interactive ? () => pick({ type: 'moon' }) : undefined}
      onkeydown={interactive ? (e) => keyPick(e, { type: 'moon' }) : undefined}
    >
      {#if selected?.type === 'moon'}<circle
          cx={moonPt[0]}
          cy={moonPt[1]}
          r={15 * k}
          class="sel-glow"
        />{/if}
      <circle
        cx={moonPt[0]}
        cy={moonPt[1]}
        r={12 * k}
        fill="url(#{uid}-moon)"
        stroke="var(--ink-soft)"
        stroke-width="1"
      />
      {#each craters as [dx, dy, r] (`${dx},${dy}`)}
        <circle cx={moonPt[0] + dx * k} cy={moonPt[1] + dy * k} r={r * k} class="crater" />
      {/each}
      <text x={moonPt[0]} y={moonPt[1] - 16 * k} class="body-name" text-anchor="middle"
        >{grahaLabel('moon')}</text
      >
    </g>
  {/if}

  {#if f.sun}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <g
      class="body"
      class:interactive
      role={interactive ? 'button' : undefined}
      tabindex={interactive ? 0 : undefined}
      aria-label={interactive ? grahaLabel('sun') : undefined}
      onclick={interactive ? () => pick({ type: 'sun' }) : undefined}
      onkeydown={interactive ? (e) => keyPick(e, { type: 'sun' }) : undefined}
    >
      {#if selected?.type === 'sun'}<circle
          cx={sunPt[0]}
          cy={sunPt[1]}
          r={17 * k}
          class="sel-glow"
        />{/if}
      <circle cx={sunPt[0]} cy={sunPt[1]} r={13 * k} fill="url(#{uid}-sunglow)" />
      {#each rayAngles as a (a)}
        {@const cos = Math.cos((a * Math.PI) / 180)}
        {@const sin = Math.sin((a * Math.PI) / 180)}
        <line
          x1={sunPt[0] + cos * 11 * k}
          y1={sunPt[1] - sin * 11 * k}
          x2={sunPt[0] + cos * 15 * k}
          y2={sunPt[1] - sin * 15 * k}
          class="sun-ray"
        />
      {/each}
      <circle
        cx={sunPt[0]}
        cy={sunPt[1]}
        r={10.5 * k}
        fill="url(#{uid}-sun)"
        stroke="#e07b00"
        stroke-width="0.75"
      />
      <text x={sunPt[0]} y={sunPt[1] - 17 * k} class="body-name" text-anchor="middle"
        >{grahaLabel('sun')}</text
      >
    </g>
  {/if}

  <!-- upcoming-event markers on the ring (hover/labels reveals the name) -->
  {#each events as ev (ev.key)}
    {@const [mx, my] = pt(ev.lon, R_IN - 5 * k)}
    {@const [lx, ly] = pt(ev.lon, R_IN - 14 * k)}
    <g class="ev">
      <circle cx={mx} cy={my} r={3.3 * k} class="event-mark event-mark--{ev.key}" />
      <text x={lx} y={ly} class="event-label" text-anchor="middle">{ev.label}</text>
    </g>
  {/each}
</svg>

<style>
  .wheel {
    width: 100%;
    display: block;
  }
  .rashi {
    fill: var(--paper-2);
    stroke: var(--line);
    stroke-width: 1;
    transition: fill 0.15s;
  }
  .rashi--alt {
    fill: var(--paper-3);
  }
  .rashi.interactive {
    cursor: pointer;
  }
  .rashi.interactive:hover {
    fill: color-mix(in srgb, var(--gold, #b8860b) 14%, var(--paper-2));
  }
  .rashi--sun {
    fill: color-mix(in srgb, #f0a000 36%, var(--paper));
    stroke: #e07b00;
  }
  .rashi--moon {
    fill: color-mix(in srgb, #6f9fd0 34%, var(--paper));
    stroke: #4a79a8;
  }
  .rashi--selected {
    fill: color-mix(in srgb, var(--gold, #b8860b) 30%, var(--paper-2));
    stroke: var(--gold, #b8860b);
    stroke-width: 1.5;
  }
  .wheel :focus {
    outline: none;
  }
  .wheel :focus-visible {
    outline: 2.5px solid var(--gold, #b8860b);
    outline-offset: 1px;
    border-radius: 3px;
  }
  .rashi-name {
    font-size: 11.5px;
    fill: var(--ink-soft);
    font-weight: 600;
    letter-spacing: 0.02em;
    pointer-events: none;
  }
  /* glyph-only wheels: the name is hidden, revealed on hover/focus of the sign */
  .rashi-name.reveal {
    opacity: 0;
    transition: opacity 0.14s ease;
  }
  .sign:hover .rashi-name.reveal,
  .sign:focus-within .rashi-name.reveal {
    opacity: 1;
  }
  /* hover affordance for the (non-interactive) glyph-only signs */
  .sign.names-off:hover .rashi:not(.rashi--sun):not(.rashi--moon):not(.rashi--selected) {
    fill: color-mix(in srgb, var(--gold, #b8860b) 13%, var(--paper-2));
  }
  .sign.names-off:hover .rashi--alt:not(.rashi--sun):not(.rashi--moon):not(.rashi--selected) {
    fill: color-mix(in srgb, var(--gold, #b8860b) 13%, var(--paper-3));
  }
  .zsym {
    font-family: 'Panchang Symbols', 'Apple Symbols', 'Segoe UI Symbol', serif;
  }
  .rashi-glyph {
    font-size: 15px;
    fill: var(--ink-soft);
  }
  .body.interactive {
    cursor: pointer;
  }
  .body-name {
    font-size: 9px;
    font-weight: 700;
    fill: var(--ink);
    paint-order: stroke;
    stroke: var(--paper);
    stroke-width: 2.5px;
    stroke-linejoin: round;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.14s ease;
  }
  .body:hover .body-name,
  .body:focus-visible .body-name {
    opacity: 1;
    fill: var(--red);
  }
  .sel-glow {
    fill: var(--gold, #e0a000);
    opacity: 0.3;
  }
  /* Sky's "Labels" toggle: reveal every body name at once */
  .wheel.labels-shown .body-name {
    opacity: 0.92;
  }
  /* upcoming-event markers (Sky) */
  .event-mark {
    stroke: var(--paper);
    stroke-width: 0.8;
  }
  .event-mark--purnima {
    fill: #e0a82e;
  }
  .event-mark--amavasya {
    fill: var(--ink-soft);
  }
  .event-mark--ekadashi {
    fill: #5a7fa8;
  }
  .event-mark--sankranti {
    fill: var(--red);
  }
  .event-label {
    font-size: 10px;
    font-weight: 600;
    fill: var(--ink);
    paint-order: stroke;
    stroke: var(--paper);
    stroke-width: 2.5px;
    stroke-linejoin: round;
    opacity: 0;
    transition: opacity 0.12s;
    pointer-events: none;
  }
  .ev:hover .event-label,
  .wheel.labels-shown .event-label {
    opacity: 1;
  }
  .nak-tick {
    stroke: var(--line);
    stroke-width: 1;
    opacity: 0.5;
    pointer-events: none;
  }
  .hit {
    fill: transparent;
    pointer-events: all;
    cursor: pointer;
  }
  .nak-current {
    fill: color-mix(in srgb, var(--indigo) 22%, transparent);
    stroke: var(--indigo);
    stroke-width: 0.75;
    opacity: 0.8;
  }
  .nak-current[role='button'] {
    cursor: pointer;
  }
  .nak-current[role='button']:hover,
  .nak-current[role='button']:focus-visible {
    fill: color-mix(in srgb, var(--indigo) 34%, transparent);
    outline: none;
  }
  .elong-arc {
    stroke: var(--red);
    stroke-width: 4;
    stroke-linecap: round;
    opacity: 0.9;
    pointer-events: none;
  }
  .ray {
    stroke-width: 1;
    opacity: 0.22;
    pointer-events: none;
  }
  .ray--sun {
    stroke: #f0a000;
  }
  .ray--moon {
    stroke: var(--ink-soft);
  }
  .angle-base {
    stroke: var(--ink-faint, #aaa);
    stroke-width: 1;
    stroke-dasharray: 1.5 3;
    pointer-events: none;
  }
  .angle-arc {
    stroke-width: 1.5;
    stroke-dasharray: 1.5 3;
    stroke-linecap: round;
    pointer-events: none;
  }
  .angle-arc--sun {
    stroke: #e0951a;
  }
  .angle-arc--moon {
    stroke: #5a7fa8;
  }
  .sun-ray {
    stroke: #f5a623;
    stroke-width: 1.6;
    stroke-linecap: round;
  }
  .crater {
    fill: #cfc7b4;
    opacity: 0.8;
  }
</style>
