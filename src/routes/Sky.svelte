<script lang="ts">
  // EXPERIMENTAL — "The Sky Right Now". A live geocentric ecliptic wheel that
  // shows where the panchanga comes from: the Sun and Moon as two angles
  // (ecliptic longitudes) on the sidereal zodiac, and the gap between them —
  // which IS the tithi. Everything is computed from the same engine the rest
  // of the app uses; a speed control lets you watch the Moon lap the Sun and
  // the tithis tick over.

  import { preferences } from '$lib/state/preferences.svelte';
  import {
    dateToJulian,
    sunLongitudeAtJD,
    moonLongitudeAtJD,
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
  import MoonPhase from '../components/MoonPhase.svelte';

  const lang = $derived(preferences.language);
  const num = (s: string | number) => applyNumerals(String(s), preferences.numerals);
  const hi = (h: string, e: string) => (lang === 'hi' ? h : e);

  // ── Time model ────────────────────────────────────────────────────────────
  // `live` snaps to the real now each frame; otherwise we advance simMs at
  // `speed` (sim-ms per real-ms): 3600 = 1 hr/s, 86400 = 1 day/s.
  let simMs = $state(Date.now());
  let speed = $state(0);
  let live = $state(true);

  $effect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = t - last;
      last = t;
      if (live) simMs = Date.now();
      else if (speed > 0) simMs += speed * dt;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  const SPEEDS = [
    { key: 'pause', label: hi('रोकें', 'Pause'), live: false, speed: 0 },
    { key: 'hour', label: hi('1 घंटा/से', '1 hr/s'), live: false, speed: 3600 },
    { key: 'day', label: hi('1 दिन/से', '1 day/s'), live: false, speed: 86400 },
    { key: 'week', label: hi('1 सप्ताह/से', '1 wk/s'), live: false, speed: 604800 },
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
  const sunTrop = $derived(sunLongitudeAtJD(jd));
  const moonTrop = $derived(moonLongitudeAtJD(jd));
  const ayan = $derived(ayanamsa(jd, preferences.ayanamsa));
  const sunSid = $derived(norm360(sunTrop - ayan));
  const moonSid = $derived(norm360(moonTrop - ayan));
  // The elongation is ayanamsa-invariant (it cancels): this IS the tithi clock.
  const elong = $derived(norm360(moonTrop - sunTrop));

  const NAK_ARC = 360 / 27; // 13°20′
  const tithiNum = $derived(Math.floor(elong / 12) + 1); // 1..30
  const tithiFrac = $derived((elong % 12) / 12); // 0..1 through the current tithi
  const paksha = $derived(elong < 180 ? hi('शुक्ल', 'Shukla') : hi('कृष्ण', 'Krishna'));
  const nakNum = $derived(Math.floor(moonSid / NAK_ARC) + 1); // 1..27
  const yogaSum = $derived(norm360(sunSid + moonSid));
  const yogaNum = $derived(Math.floor(yogaSum / NAK_ARC) + 1); // 1..27
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
  const R_IN = 134;
  const R_LABEL = 152;
  const R_MARK = 112; // Sun/Moon markers
  const R_ARC = 92; // elongation arc

  // Sidereal longitude (deg) → screen point. 0° at 3 o'clock, increasing
  // counterclockwise — the way the Sun and Moon actually move (eastward) when
  // you look down on the ecliptic from the north.
  function pt(deg: number, r: number): [number, number] {
    const a = (deg * Math.PI) / 180;
    return [C + r * Math.cos(a), C - r * Math.sin(a)];
  }
  function ptStr(deg: number, r: number): string {
    const [x, y] = pt(deg, r);
    return `${x.toFixed(2)} ${y.toFixed(2)}`;
  }

  // Annular sector for one rashi [startDeg, endDeg], spanning < 180°.
  function sector(startDeg: number, endDeg: number): string {
    return [
      `M ${ptStr(startDeg, R_IN)}`,
      `L ${ptStr(startDeg, R_OUT)}`,
      `A ${R_OUT} ${R_OUT} 0 0 0 ${ptStr(endDeg, R_OUT)}`, // outer arc, CCW
      `L ${ptStr(endDeg, R_IN)}`,
      `A ${R_IN} ${R_IN} 0 0 1 ${ptStr(startDeg, R_IN)}`, // inner arc, back CW
      'Z',
    ].join(' ');
  }

  // The elongation arc from the Sun CCW to the Moon (spans `elong` degrees).
  const elongPath = $derived(
    `M ${ptStr(sunSid, R_ARC)} A ${R_ARC} ${R_ARC} 0 ${elong > 180 ? 1 : 0} 0 ${ptStr(moonSid, R_ARC)}`,
  );

  const rashis = Array.from({ length: 12 }, (_, i) => i);
  const nakTicks = Array.from({ length: 27 }, (_, i) => i * NAK_ARC);

  // Single-binding $derived (NOT destructured — a destructured $derived captures
  // once and would freeze the markers while the readout animates).
  const sunPt = $derived(pt(sunSid, R_MARK));
  const moonPt = $derived(pt(moonSid, R_MARK));
  const eqPt = $derived(pt(norm360(-ayan), R_OUT + 8)); // tropical 0° (equinox)
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
      <!-- rashi ring -->
      {#each rashis as i (i)}
        {@const active = i === sunRashi || i === moonRashi}
        <path d={sector(i * 30, (i + 1) * 30)} class="rashi {active ? 'rashi--active' : ''}" />
        {@const [lx, ly] = pt(i * 30 + 15, R_LABEL)}
        <text x={lx} y={ly} class="rashi-label" dominant-baseline="middle" text-anchor="middle">
          {rashiNameByIndex(i, lang)}
        </text>
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

      <!-- tropical 0° (vernal equinox) tick — shows the ayanamsa offset -->
      <circle cx={eqPt[0]} cy={eqPt[1]} r="2.5" class="equinox" />

      <!-- Earth at center -->
      <circle cx={C} cy={C} r="7" class="earth" />
      <text x={C} y={C + 20} class="earth-label" text-anchor="middle">{hi('पृथ्वी', 'Earth')}</text>

      <!-- Sun marker -->
      <circle cx={sunPt[0]} cy={sunPt[1]} r="12" class="sun" />
      <text x={sunPt[0]} y={sunPt[1]} class="glyph" text-anchor="middle" dominant-baseline="central">☉</text>

      <!-- Moon marker -->
      <circle cx={moonPt[0]} cy={moonPt[1]} r="11" class="moon-mark" />
      <text x={moonPt[0]} y={moonPt[1]} class="glyph glyph--moon" text-anchor="middle" dominant-baseline="central">☾</text>
    </svg>

    <!-- live readout -->
    <div class="readout">
      <div class="phase">
        <MoonPhase illumination={illum} phaseAngle={elong} phaseName={paksha} size={72} />
        <span class="phase__pct">{num((illum * 100).toFixed(0))}%</span>
      </div>

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
      </dl>
    </div>
  </div>

  <!-- time controls -->
  <div class="controls" role="group" aria-label={hi('समय नियंत्रण', 'Time controls')}>
    <span class="sim-time">{num(simLabel)}</span>
    <div class="speeds">
      <button type="button" class:on={activeSpeedKey === 'now'} onclick={goNow}>● {hi('अभी', 'Now')}</button>
      {#each SPEEDS as s (s.key)}
        <button type="button" class:on={activeSpeedKey === s.key} onclick={() => setSpeed(s)}>{s.label}</button>
      {/each}
    </div>
  </div>

  <p class="hint">
    {hi(
      'गति बढ़ाएँ और देखें — चन्द्र सूर्य से आगे बढ़ता है, अंतर 0° से 360° तक भरता है, और हर 12° पर एक नई तिथि। 180° पर पूर्णिमा, 0° पर अमावस्या।',
      'Speed it up and watch: the Moon pulls ahead of the Sun, the gap fills 0°→360°, and every 12° is a new tithi. Full moon at 180°, new moon at 0°.',
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
    gap: 1.25rem;
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
    fill: color-mix(in srgb, var(--gold, #b8860b) 18%, var(--paper-2));
  }
  .rashi-label {
    font-size: 9px;
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
    opacity: 0.55;
  }
  .ray--sun {
    stroke: var(--gold, #b8860b);
  }
  .ray--moon {
    stroke: var(--ink-soft);
  }
  .equinox {
    fill: none;
    stroke: var(--ink-faint, #999);
    stroke-width: 1.5;
  }
  .earth {
    fill: #3a6ea5;
    stroke: var(--paper);
    stroke-width: 1.5;
  }
  .earth-label,
  .sim-time {
    font-size: 9px;
    fill: var(--ink-faint, #999);
  }
  .sun {
    fill: var(--gold, #e0a008);
    stroke: var(--paper);
    stroke-width: 1.5;
  }
  .moon-mark {
    fill: var(--paper);
    stroke: var(--ink-soft);
    stroke-width: 1.5;
  }
  .glyph {
    font-size: 13px;
    fill: var(--ink);
  }
  .glyph--moon {
    fill: var(--ink-soft);
  }

  .readout {
    flex: 1 1 280px;
    min-width: 260px;
  }
  .phase {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 0.75rem;
  }
  .phase__pct {
    font-variant-numeric: tabular-nums;
    color: var(--ink-soft);
  }
  .vals {
    margin: 0;
    display: grid;
    gap: 0.5rem;
  }
  .val {
    border-bottom: 1px solid var(--line);
    padding-bottom: 0.4rem;
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
  .g {
    font-size: 0.9em;
  }
  .g--sun {
    color: var(--gold, #b8860b);
  }
  .muted {
    color: var(--ink-faint, #888);
    font-size: 0.85em;
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
