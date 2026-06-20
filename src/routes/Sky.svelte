<script lang="ts">
  // EXPERIMENTAL — "The Sky Right Now". A live geocentric ecliptic wheel plus a
  // physical Sun–Earth–Moon inset, showing where the panchanga comes from: the
  // Sun and Moon as two angles on the sidereal zodiac, the gap between them
  // (the tithi), and why that gap is the Moon's phase. Every value is computed
  // from the same engine the rest of the app uses.

  import { preferences } from '$lib/state/preferences.svelte';
  import {
    dateToJulian,
    sunLongitudeAtJD,
    moonLongitudeAtJD,
    sunMoonElongationAtJD,
    ayanamsa,
    norm360,
  } from '$lib/astro';
  import {
    rashiNameByIndex,
    nakshatraNameByIndex,
    tithiNameByIndex,
    yogaNameByIndex,
  } from '$lib/i18n';
  import { applyNumerals } from '$lib/format/numerals';

  const lang = $derived(preferences.language);
  const num = (s: string | number) => applyNumerals(String(s), preferences.numerals);
  const hi = (h: string, e: string) => (lang === 'hi' ? h : e);

  // ── Time model ────────────────────────────────────────────────────────────
  // `live` tracks the real now; otherwise advance simMs at `speed` (sim-ms per
  // real-ms): 3600 = 1 hr/s, 86400 = 1 day/s. The loop only runs when needed —
  // idle when paused, throttled to ~4 Hz when live (the real sky barely moves),
  // smooth 60 fps only for accelerated playback. It is torn down on unmount, so
  // there is zero cost once you leave the page.
  let simMs = $state(Date.now());
  let speed = $state(0);
  let live = $state(true);

  $effect(() => {
    if (!live && speed === 0) return; // paused on a fixed instant — no work
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const tick = (t: number) => {
      const dt = t - last;
      last = t;
      if (live) {
        acc += dt;
        if (acc >= 250) {
          simMs = Date.now();
          acc = 0;
        }
      } else {
        simMs += speed * dt;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  // {key, live, speed, hi, en} — labels resolved in the template so they react
  // to a language switch (an array of pre-rendered strings would not).
  const SPEEDS = [
    { key: 'pause', live: false, speed: 0, hi: 'रोकें', en: 'Pause' },
    { key: 'hour', live: false, speed: 3600, hi: '१ घंटा/से', en: '1 hr/s' },
    { key: 'day', live: false, speed: 86400, hi: '१ दिन/से', en: '1 day/s' },
    { key: 'week', live: false, speed: 604800, hi: '१ सप्ताह/से', en: '1 wk/s' },
  ];
  const activeSpeedKey = $derived(
    live ? 'now' : (SPEEDS.find((s) => s.speed === speed)?.key ?? 'pause'),
  );
  function setSpeed(s: { live: boolean; speed: number }) {
    live = s.live;
    speed = s.speed;
  }
  function goNow() {
    live = true;
    speed = 0;
    simMs = Date.now();
  }

  // ── Derived astronomy (the real engine) ────────────────────────────────────
  const simDate = $derived(new Date(simMs));
  const jd = $derived(dateToJulian(simDate));
  const ayan = $derived(ayanamsa(jd, preferences.ayanamsa));
  const sunSid = $derived(norm360(sunLongitudeAtJD(jd) - ayan));
  const moonSid = $derived(norm360(moonLongitudeAtJD(jd) - ayan));
  // Elongation from the engine's own source, so the tithi matches Today exactly.
  const elong = $derived(sunMoonElongationAtJD(jd));

  const NAK_ARC = 360 / 27; // 13°20′
  const tithiNum = $derived(Math.floor(elong / 12) + 1); // 1..30
  const tithiFrac = $derived((elong % 12) / 12); // 0..1 through the current tithi
  const paksha = $derived(elong < 180 ? hi('शुक्ल', 'Shukla') : hi('कृष्ण', 'Krishna'));
  const nakNum = $derived(Math.floor(moonSid / NAK_ARC) + 1); // 1..27
  const yogaNum = $derived(Math.floor(norm360(sunSid + moonSid) / NAK_ARC) + 1); // 1..27
  const sunRashi = $derived(Math.floor(sunSid / 30)); // 0..11
  const moonRashi = $derived(Math.floor(moonSid / 30));
  // Moon illuminated fraction = (1 − cos elongation)/2 — new at 0°, full at 180°.
  const illum = $derived((1 - Math.cos((elong * Math.PI) / 180)) / 2);

  const simLabel = $derived(
    new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: preferences.location?.timezone,
    }).format(simDate),
  );

  // ── Wheel geometry ─────────────────────────────────────────────────────────
  const SIZE = 360;
  const C = SIZE / 2;
  const R_OUT = 170;
  const R_IN = 132;
  const R_LABEL = 151;
  const R_MARK = 110; // Sun/Moon markers
  const R_ARC = 90; // elongation arc

  // Sidereal longitude (deg) → screen point. 0° at 3 o'clock, increasing
  // counterclockwise — the way the Sun and Moon actually move (eastward) seen
  // from the north of the ecliptic.
  function pt(deg: number, r: number): [number, number] {
    const a = (deg * Math.PI) / 180;
    return [C + r * Math.cos(a), C - r * Math.sin(a)];
  }
  const ptStr = (deg: number, r: number) => pt(deg, r).map((n) => n.toFixed(2)).join(' ');

  // Annular sector for one rashi [startDeg, endDeg], spanning < 180°.
  function sector(startDeg: number, endDeg: number): string {
    return [
      `M ${ptStr(startDeg, R_IN)}`,
      `L ${ptStr(startDeg, R_OUT)}`,
      `A ${R_OUT} ${R_OUT} 0 0 0 ${ptStr(endDeg, R_OUT)}`,
      `L ${ptStr(endDeg, R_IN)}`,
      `A ${R_IN} ${R_IN} 0 0 1 ${ptStr(startDeg, R_IN)}`,
      'Z',
    ].join(' ');
  }

  // The elongation arc from the Sun CCW to the Moon (spans `elong` degrees).
  const elongPath = $derived(
    `M ${ptStr(sunSid, R_ARC)} A ${R_ARC} ${R_ARC} 0 ${elong > 180 ? 1 : 0} 0 ${ptStr(moonSid, R_ARC)}`,
  );

  const RASHI_GLYPH = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
  const rashis = Array.from({ length: 12 }, (_, i) => i);
  const nakTicks = Array.from({ length: 27 }, (_, i) => i * NAK_ARC);
  // 8 sun rays as [x1,y1,x2,y2] around a unit centre, scaled at render.
  const rayAngles = Array.from({ length: 8 }, (_, i) => (i * 360) / 8);

  const sunPt = $derived(pt(sunSid, R_MARK));
  const moonPt = $derived(pt(moonSid, R_MARK));

  // ── Physical Sun–Earth–Moon inset ──────────────────────────────────────────
  // Sun fixed at the left; Earth at centre; the Moon orbits Earth, placed at
  // the elongation angle from the Sun–Earth line, with its sunward half lit.
  const OW = 360;
  const OH = 188;
  const EARTH = { x: 232, y: OH / 2 };
  const SUNX = 40;
  const ORB = 60; // Moon-orbit radius (schematic, not to scale)
  const moonOrb = $derived.by(() => {
    const a = ((180 + elong) * Math.PI) / 180; // 180° = toward the Sun (new)
    return { x: EARTH.x + ORB * Math.cos(a), y: EARTH.y - ORB * Math.sin(a) };
  });
  // The lit (sunward) half of the orbital Moon: the semicircle facing the Sun.
  function litHalf(cx: number, cy: number, r: number): string {
    // Sun is to the left, so the lit half is the left semicircle.
    return `M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} Z`;
  }
</script>

<section class="sky">
  <header class="sky__head">
    <h2>{hi('आकाश — अभी', 'The Sky — Right Now')} <span class="exp">{hi('प्रयोग', 'experimental')}</span></h2>
    <p class="desc">
      {hi(
        'पूरा पंचांग सिर्फ़ दो कोणों से बनता है — सूर्य और चन्द्र की राशि-स्थिति। उनके बीच का अंतर ही तिथि है।',
        'The whole panchanga comes from just two angles — where the Sun and Moon sit on the zodiac. The gap between them is the tithi.',
      )}
    </p>
  </header>

  <div class="sky__grid">
    <!-- The ecliptic wheel -->
    <svg class="wheel" viewBox="0 0 {SIZE} {SIZE}" role="img" aria-label={hi('आकाश चक्र', 'Ecliptic wheel')}>
      <defs>
        <radialGradient id="sun-grad" cx="40%" cy="38%" r="65%">
          <stop offset="0%" stop-color="#fff6cf" />
          <stop offset="55%" stop-color="#ffd23f" />
          <stop offset="100%" stop-color="#f5910b" />
        </radialGradient>
      </defs>

      <!-- rashi ring -->
      {#each rashis as i (i)}
        {@const active = i === sunRashi || i === moonRashi}
        <path d={sector(i * 30, (i + 1) * 30)} class="rashi {active ? 'rashi--active' : ''}" />
        {@const [lx, ly] = pt(i * 30 + 15, R_LABEL)}
        <text x={lx} y={ly - 4} class="rashi-glyph" dominant-baseline="middle" text-anchor="middle">{RASHI_GLYPH[i]}</text>
        <text x={lx} y={ly + 8} class="rashi-name" dominant-baseline="middle" text-anchor="middle">{rashiNameByIndex(i, lang)}</text>
      {/each}

      <!-- nakshatra ticks (27) -->
      {#each nakTicks as deg (deg)}
        <line x1={pt(deg, R_IN)[0]} y1={pt(deg, R_IN)[1]} x2={pt(deg, R_IN - 7)[0]} y2={pt(deg, R_IN - 7)[1]} class="nak-tick" />
      {/each}

      <!-- elongation arc (the tithi gap) -->
      <path d={elongPath} class="elong-arc" fill="none" />

      <!-- radii from Earth to Sun and Moon -->
      <line x1={C} y1={C} x2={sunPt[0]} y2={sunPt[1]} class="ray ray--sun" />
      <line x1={C} y1={C} x2={moonPt[0]} y2={moonPt[1]} class="ray ray--moon" />

      <!-- Earth at center -->
      <circle cx={C} cy={C} r="6.5" class="earth" />
      <text x={C} y={C + 19} class="center-label" text-anchor="middle">{hi('पृथ्वी', 'Earth')}</text>

      <!-- Moon marker -->
      <circle cx={moonPt[0]} cy={moonPt[1]} r="11" class="moon-mark" />
      <text x={moonPt[0]} y={moonPt[1]} class="glyph glyph--moon" text-anchor="middle" dominant-baseline="central">☾</text>

      <!-- Sun marker: bright disc + rays -->
      <g class="sun-marker">
        {#each rayAngles as a (a)}
          {@const cos = Math.cos((a * Math.PI) / 180)}
          {@const sin = Math.sin((a * Math.PI) / 180)}
          <line
            x1={sunPt[0] + cos * 13}
            y1={sunPt[1] - sin * 13}
            x2={sunPt[0] + cos * 19}
            y2={sunPt[1] - sin * 19}
            class="sun-ray"
          />
        {/each}
        <circle cx={sunPt[0]} cy={sunPt[1]} r="11" fill="url(#sun-grad)" stroke="#e07b00" stroke-width="0.75" />
      </g>
    </svg>

    <!-- live readout -->
    <div class="readout">
      <dl class="vals">
        <div class="val">
          <dt><span class="g g--sun">☉</span> {hi('सूर्य', 'Sun')} λ</dt>
          <dd>{num(sunSid.toFixed(2))}° · {rashiNameByIndex(sunRashi, lang)}</dd>
        </div>
        <div class="val">
          <dt><span class="g g--moon">☾</span> {hi('चन्द्र', 'Moon')} λ</dt>
          <dd>{num(moonSid.toFixed(2))}° · {rashiNameByIndex(moonRashi, lang)}</dd>
        </div>
        <div class="val val--hero">
          <dt>{hi('अंतर', 'Gap')} (λ☾ − λ☉) ÷ 12°</dt>
          <dd>
            {num(elong.toFixed(2))}° →
            <b>{hi('तिथि', 'Tithi')} {tithiNameByIndex(tithiNum, lang)}</b>
            <span class="muted">({paksha}, {num((tithiFrac * 100).toFixed(0))}%)</span>
          </dd>
        </div>
        <div class="val">
          <dt>{hi('नक्षत्र', 'Nakshatra')} (λ☾)</dt>
          <dd>{nakshatraNameByIndex(nakNum, lang)}</dd>
        </div>
        <div class="val">
          <dt>{hi('योग', 'Yoga')} (λ☉ + λ☾)</dt>
          <dd>{yogaNameByIndex(yogaNum, lang)}</dd>
        </div>
        <div class="val">
          <dt>{hi('चन्द्र कला', 'Moon phase')}</dt>
          <dd>{num((illum * 100).toFixed(0))}% {hi('प्रकाशित', 'lit')}</dd>
        </div>
      </dl>
    </div>
  </div>

  <!-- Physical Sun–Earth–Moon inset: why the gap is the phase -->
  <figure class="orbital">
    <svg viewBox="0 0 {OW} {OH}" role="img" aria-label={hi('सूर्य–पृथ्वी–चन्द्र', 'Sun, Earth and Moon')}>
      <defs>
        <radialGradient id="orb-sun" cx="42%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#fff6cf" />
          <stop offset="60%" stop-color="#ffd23f" />
          <stop offset="100%" stop-color="#f5910b" />
        </radialGradient>
      </defs>
      <!-- sunlight -->
      {#each [-26, 0, 26] as dy (dy)}
        <line x1={SUNX + 22} y1={EARTH.y + dy} x2={EARTH.x - 14} y2={EARTH.y + dy} class="sunlight" />
      {/each}
      <!-- Sun -->
      <circle cx={SUNX} cy={EARTH.y} r="22" fill="url(#orb-sun)" stroke="#e07b00" stroke-width="1" />
      <text x={SUNX} y={EARTH.y + 38} class="orb-label" text-anchor="middle">{hi('सूर्य', 'Sun')}</text>
      <!-- Moon orbit -->
      <circle cx={EARTH.x} cy={EARTH.y} r={ORB} class="orbit" />
      <!-- sight line Earth → Moon -->
      <line x1={EARTH.x} y1={EARTH.y} x2={moonOrb.x} y2={moonOrb.y} class="sight" />
      <!-- Earth -->
      <circle cx={EARTH.x} cy={EARTH.y} r="9" class="earth" />
      <text x={EARTH.x} y={EARTH.y + 24} class="orb-label" text-anchor="middle">{hi('पृथ्वी', 'Earth')}</text>
      <!-- Moon: dark disc + sunward (left) lit half -->
      <circle cx={moonOrb.x} cy={moonOrb.y} r="9" class="orb-moon-dark" />
      <path d={litHalf(moonOrb.x, moonOrb.y, 9)} class="orb-moon-lit" />
      <circle cx={moonOrb.x} cy={moonOrb.y} r="9" class="orb-moon-ring" />
    </svg>
    <figcaption>
      {hi(
        'चन्द्र का सूर्य-मुखी आधा भाग सदा प्रकाशित रहता है; पृथ्वी से हम उसे एक कोण पर देखते हैं — वही कोण (अंतर) कला बनाता है। अमावस्या पर चन्द्र सूर्य की ओर, पूर्णिमा पर विपरीत।',
        "The Moon's sunward half is always lit; from Earth we see it at an angle — that angle (the gap) is the phase. New moon when the Moon is toward the Sun, full when opposite.",
      )}
    </figcaption>
  </figure>

  <!-- time controls -->
  <div class="controls" role="group" aria-label={hi('समय नियंत्रण', 'Time controls')}>
    <span class="sim-time">{simLabel}</span>
    <div class="speeds">
      <button type="button" class:on={activeSpeedKey === 'now'} onclick={goNow}>● {hi('अभी', 'Now')}</button>
      {#each SPEEDS as s (s.key)}
        <button type="button" class:on={activeSpeedKey === s.key} onclick={() => setSpeed(s)}>
          {lang === 'hi' ? s.hi : s.en}
        </button>
      {/each}
    </div>
  </div>

  <p class="hint">
    {hi(
      'गति बढ़ाएँ और देखें — चन्द्र सूर्य से आगे बढ़ता है, अंतर 0° से 360° तक भरता है, और हर 12° पर एक नई तिथि।',
      'Speed it up and watch: the Moon pulls ahead of the Sun, the gap fills 0°→360°, and every 12° is a new tithi.',
    )}
    <a href="https://github.com/surendrajat/panchang/tree/main/docs/guide" target="_blank" rel="noopener">
      {hi('यह कैसे काम करता है →', 'How this works →')}
    </a>
  </p>
</section>

<style>
  .sky {
    max-width: 760px;
    margin: 0 auto;
  }
  .sky__head h2 {
    margin: 0;
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }
  .exp {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--paper);
    background: var(--gold, #b8860b);
    padding: 0.1rem 0.4rem;
    border-radius: var(--radius-pill, 999px);
  }
  .desc {
    color: var(--ink-soft);
    margin: 0.4rem 0 1rem;
  }
  .sky__grid {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem 1.5rem;
    align-items: center;
    justify-content: center;
  }
  .wheel {
    width: 360px;
    max-width: 100%;
    flex: 1 1 320px;
  }

  .rashi {
    fill: var(--paper-2);
    stroke: var(--line);
    stroke-width: 1;
  }
  .rashi:nth-child(odd) {
    fill: var(--paper-3);
  }
  .rashi--active {
    fill: color-mix(in srgb, var(--gold, #b8860b) 16%, var(--paper-2));
  }
  .rashi-glyph {
    font-size: 14px;
    fill: var(--red);
  }
  .rashi-name {
    font-size: 7.5px;
    fill: var(--ink-soft);
    font-weight: 600;
  }
  .nak-tick {
    stroke: var(--line);
    stroke-width: 1;
    opacity: 0.5;
  }
  .elong-arc {
    stroke: var(--red);
    stroke-width: 4;
    stroke-linecap: round;
    opacity: 0.85;
  }
  .ray {
    stroke-width: 1.5;
    opacity: 0.5;
  }
  .ray--sun {
    stroke: #f5910b;
  }
  .ray--moon {
    stroke: var(--ink-soft);
  }
  .earth {
    fill: #3a6ea5;
    stroke: var(--paper);
    stroke-width: 1.5;
  }
  .center-label,
  .orb-label {
    font-size: 9px;
    fill: var(--ink-faint, #999);
  }
  .sun-ray {
    stroke: #f5a623;
    stroke-width: 2;
    stroke-linecap: round;
  }
  .moon-mark {
    fill: var(--paper);
    stroke: var(--ink-soft);
    stroke-width: 1.5;
  }
  .glyph--moon {
    font-size: 13px;
    fill: var(--ink-soft);
  }

  .readout {
    flex: 1 1 260px;
    min-width: 240px;
  }
  .vals {
    margin: 0;
    display: grid;
    gap: 0.45rem;
  }
  .val {
    border-bottom: 1px solid var(--line);
    padding-bottom: 0.35rem;
  }
  .val dt {
    font-size: 0.75rem;
    color: var(--ink-soft);
  }
  .val dd {
    margin: 0.1rem 0 0;
    font-variant-numeric: tabular-nums;
  }
  .val--hero dd {
    font-size: 1.05rem;
  }
  .val--hero b {
    color: var(--red);
  }
  .g--sun {
    color: #d98008;
  }
  .muted {
    color: var(--ink-faint, #888);
    font-size: 0.85em;
  }

  .orbital {
    margin: 1.25rem 0 0;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1.25rem;
  }
  .orbital svg {
    width: 360px;
    max-width: 100%;
    flex: 1 1 300px;
  }
  .orbital figcaption {
    flex: 1 1 240px;
    color: var(--ink-soft);
    font-size: 0.82rem;
    line-height: 1.5;
  }
  .sunlight {
    stroke: #f5c54a;
    stroke-width: 1.5;
    stroke-dasharray: 2 4;
    opacity: 0.7;
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
    stroke: none;
  }
  .orb-moon-lit {
    fill: #f3e6c0;
  }
  .orb-moon-ring {
    fill: none;
    stroke: var(--ink-soft);
    stroke-width: 1;
  }

  .controls {
    margin: 1.25rem 0 0.5rem;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1rem;
    justify-content: space-between;
  }
  .sim-time {
    font-size: 0.85rem;
    color: var(--ink-soft);
    font-variant-numeric: tabular-nums;
  }
  .speeds {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  .speeds button {
    padding: 0.3rem 0.7rem;
    border: 1px solid var(--line);
    border-radius: var(--radius-pill, 999px);
    background: var(--paper-2);
    color: var(--ink);
    font: inherit;
    font-size: 0.8rem;
    cursor: pointer;
  }
  .speeds button.on {
    background: var(--red);
    color: var(--paper);
    border-color: var(--red);
  }
  .hint {
    color: var(--ink-soft);
    font-size: 0.85rem;
    line-height: 1.5;
  }
  .hint a {
    color: var(--red);
    white-space: nowrap;
  }
</style>
