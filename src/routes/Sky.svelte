<script lang="ts">
  // EXPERIMENTAL — "The Sky Right Now". A live geocentric ecliptic wheel plus a
  // physical Sun–Earth–Moon inset, showing where the panchanga comes from: the
  // Sun and Moon as two angles on the sidereal zodiac, the gap between them
  // (the tithi), and why that gap is the Moon's phase. Optionally the other
  // grahas. Every value is computed from the same engine the rest of the app
  // uses; the tithi matches the Today page exactly.

  import { preferences } from '$lib/state/preferences.svelte';
  import {
    dateToJulian,
    sunLongitudeAtJD,
    moonLongitudeAtJD,
    sunMoonElongationAtJD,
    ayanamsa,
    norm360,
  } from '$lib/astro';
  import { grahaSiderealLongitude } from '$lib/jyotish';
  import type { GrahaKey } from '$lib/jyotish';
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
  // real-ms). The loop only runs when needed — idle when paused, throttled to
  // ~4 Hz when live (the real sky barely moves), smooth 60 fps only for
  // accelerated playback, and torn down on unmount: zero cost off-page.
  let simMs = $state(Date.now());
  let speed = $state(0);
  let live = $state(true);
  let showGrahas = $state(false);

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

  // Labels resolved in the template (and digits via num()) so they react to a
  // language / numeral-preference switch.
  const SPEEDS = [
    { key: 'pause', live: false, speed: 0, n: '', hi: 'रोकें', en: 'Pause' },
    { key: 'hour', live: false, speed: 3600, n: '1', hi: 'घं/से', en: 'hr/s' },
    { key: 'day', live: false, speed: 86400, n: '1', hi: 'दिन/से', en: 'day/s' },
    { key: 'week', live: false, speed: 604800, n: '1', hi: 'सप्ताह/से', en: 'wk/s' },
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
  const tithiFrac = $derived((elong % 12) / 12);
  const paksha = $derived(elong < 180 ? hi('शुक्ल', 'Shukla') : hi('कृष्ण', 'Krishna'));
  const nakNum = $derived(Math.floor(moonSid / NAK_ARC) + 1);
  const yogaNum = $derived(Math.floor(norm360(sunSid + moonSid) / NAK_ARC) + 1);
  const sunRashi = $derived(Math.floor(sunSid / 30));
  const moonRashi = $derived(Math.floor(moonSid / 30));
  const illum = $derived((1 - Math.cos((elong * Math.PI) / 180)) / 2);

  // The other grahas (only computed when shown).
  const GRAHA_META: { key: GrahaKey; hi: string; en: string }[] = [
    { key: 'mars', hi: 'मं', en: 'Ma' },
    { key: 'mercury', hi: 'बु', en: 'Me' },
    { key: 'jupiter', hi: 'गु', en: 'Ju' },
    { key: 'venus', hi: 'शु', en: 'Ve' },
    { key: 'saturn', hi: 'श', en: 'Sa' },
    { key: 'rahu', hi: 'रा', en: 'Ra' },
    { key: 'ketu', hi: 'के', en: 'Ke' },
  ];
  const grahaPositions = $derived.by(() =>
    showGrahas
      ? GRAHA_META.map((g) => ({
          ...g,
          lon: grahaSiderealLongitude(g.key, jd, preferences.ayanamsa, preferences.nodeType),
        }))
      : [],
  );

  // Date + time, numeral-preference-aware (Latin digits from Intl, then num())
  // and honouring the 12/24-hour setting.
  const simLabel = $derived.by(() => {
    const fmt = new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: preferences.timeFormat === '12h' ? 'numeric' : '2-digit',
      minute: '2-digit',
      hour12: preferences.timeFormat === '12h',
      numberingSystem: 'latn',
      timeZone: preferences.location?.timezone,
    });
    return num(fmt.format(simDate));
  });

  // ── Wheel geometry ─────────────────────────────────────────────────────────
  const SIZE = 380;
  const C = SIZE / 2;
  const R_OUT = 180;
  const R_IN = 142;
  const R_LABEL = 161;
  const R_BODY = 112; // Sun/Moon
  const R_GRAHA = 90; // other grahas
  const R_ARC = 70; // elongation arc

  // 0° at 3 o'clock, increasing counterclockwise — the way the Sun and Moon
  // actually move (eastward) seen from the north of the ecliptic.
  function pt(deg: number, r: number): [number, number] {
    const a = (deg * Math.PI) / 180;
    return [C + r * Math.cos(a), C - r * Math.sin(a)];
  }
  const ptStr = (deg: number, r: number) => pt(deg, r).map((n) => n.toFixed(2)).join(' ');

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

  const elongPath = $derived(
    `M ${ptStr(sunSid, R_ARC)} A ${R_ARC} ${R_ARC} 0 ${elong > 180 ? 1 : 0} 0 ${ptStr(moonSid, R_ARC)}`,
  );

  const RASHI_GLYPH = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
  const rashis = Array.from({ length: 12 }, (_, i) => i);
  const nakTicks = Array.from({ length: 27 }, (_, i) => i * NAK_ARC);
  const rayAngles = Array.from({ length: 8 }, (_, i) => (i * 360) / 8);

  const sunPt = $derived(pt(sunSid, R_BODY));
  const moonPt = $derived(pt(moonSid, R_BODY));

  // Live phase of the Moon marker (terminator geometry, as in MoonPhase.svelte).
  const moonLitPath = $derived.by(() => {
    const r = 12;
    const [cx, cy] = moonPt;
    const waxing = elong < 180;
    const rx = Math.abs(r * Math.cos(illum * Math.PI));
    const gibbous = illum > 0.5;
    const limbSweep = waxing ? 1 : 0;
    const termSweep = waxing ? (gibbous ? 1 : 0) : gibbous ? 0 : 1;
    return `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${limbSweep} ${cx} ${cy + r} A ${rx} ${r} 0 0 ${termSweep} ${cx} ${cy - r} Z`;
  });

  // ── Physical Sun–Earth–Moon inset ──────────────────────────────────────────
  const OW = 380;
  const OH = 188;
  const EARTH = { x: 244, y: OH / 2 };
  const SUNX = 44;
  const ORB = 62;
  const moonOrb = $derived.by(() => {
    const a = ((180 + elong) * Math.PI) / 180; // 180° = toward the Sun (new)
    return { x: EARTH.x + ORB * Math.cos(a), y: EARTH.y - ORB * Math.sin(a) };
  });
  const litHalf = (cx: number, cy: number, r: number) =>
    `M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} Z`; // sunward (left) semicircle
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

  <!-- prominent date/time readout -->
  <div class="clock">{simLabel}</div>

  <div class="sky__grid">
    <svg class="wheel" viewBox="0 0 {SIZE} {SIZE}" role="img" aria-label={hi('आकाश चक्र', 'Ecliptic wheel')}>
      <defs>
        <radialGradient id="sun-grad" cx="38%" cy="36%" r="68%">
          <stop offset="0%" stop-color="#fff8d8" />
          <stop offset="50%" stop-color="#ffd23f" />
          <stop offset="100%" stop-color="#f08a00" />
        </radialGradient>
        <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffcf4d" stop-opacity="0.5" />
          <stop offset="100%" stop-color="#ffcf4d" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="earth-grad" cx="38%" cy="34%" r="72%">
          <stop offset="0%" stop-color="#7db4e6" />
          <stop offset="100%" stop-color="#2f6196" />
        </radialGradient>
      </defs>

      <!-- rashi ring -->
      {#each rashis as i (i)}
        {@const isSun = i === sunRashi}
        {@const isMoon = i === moonRashi}
        <path d={sector(i * 30, (i + 1) * 30)} class="rashi" class:rashi--alt={i % 2 === 1} class:rashi--sun={isSun} class:rashi--moon={isMoon && !isSun} />
        {@const [lx, ly] = pt(i * 30 + 15, R_LABEL)}
        <circle cx={lx} cy={ly - 3} r="10" class="badge" class:badge--sun={isSun} class:badge--moon={isMoon && !isSun} />
        <text x={lx} y={ly - 3} class="rashi-glyph" class:on={isSun || isMoon} dominant-baseline="central" text-anchor="middle">{RASHI_GLYPH[i]}</text>
        <text x={lx} y={ly + 11} class="rashi-name" dominant-baseline="middle" text-anchor="middle">{rashiNameByIndex(i, lang)}</text>
      {/each}

      <!-- nakshatra ticks -->
      {#each nakTicks as deg (deg)}
        <line x1={pt(deg, R_IN)[0]} y1={pt(deg, R_IN)[1]} x2={pt(deg, R_IN - 6)[0]} y2={pt(deg, R_IN - 6)[1]} class="nak-tick" />
      {/each}

      <!-- elongation arc (the tithi gap) -->
      <path d={elongPath} class="elong-arc" fill="none" />

      <!-- radii from Earth to Sun and Moon -->
      <line x1={C} y1={C} x2={sunPt[0]} y2={sunPt[1]} class="ray ray--sun" />
      <line x1={C} y1={C} x2={moonPt[0]} y2={moonPt[1]} class="ray ray--moon" />

      <!-- other grahas -->
      {#each grahaPositions as g (g.key)}
        {@const [gx, gy] = pt(g.lon, R_GRAHA)}
        <circle cx={gx} cy={gy} r="8" class="graha" />
        <text x={gx} y={gy} class="graha-label" text-anchor="middle" dominant-baseline="central">{lang === 'hi' ? g.hi : g.en}</text>
      {/each}

      <!-- Earth at center -->
      <circle cx={C} cy={C} r="9" fill="url(#earth-grad)" stroke="var(--paper)" stroke-width="1.5" />
      <path d="M{C - 6} {C - 1} q3 -3 6 0 q2 2 -1 3 q-4 1 -5 -3 Z" class="earth-land" />
      <path d="M{C + 1} {C + 3} q3 -1 4 2 q-2 2 -4 0 Z" class="earth-land" />
      <text x={C} y={C + 22} class="center-label" text-anchor="middle">{hi('पृथ्वी', 'Earth')}</text>

      <!-- Moon: live phase disc -->
      <circle cx={moonPt[0]} cy={moonPt[1]} r="12" class="moon-dark" />
      <path d={moonLitPath} class="moon-lit" />
      <circle cx={moonPt[0]} cy={moonPt[1]} r="12" class="moon-ring" />

      <!-- Sun: subtle glow + gradient disc (same r as the Moon) + short rays -->
      <circle cx={sunPt[0]} cy={sunPt[1]} r="15" fill="url(#sun-glow)" />
      {#each rayAngles as a (a)}
        {@const cos = Math.cos((a * Math.PI) / 180)}
        {@const sin = Math.sin((a * Math.PI) / 180)}
        <line x1={sunPt[0] + cos * 13.5} y1={sunPt[1] - sin * 13.5} x2={sunPt[0] + cos * 17.5} y2={sunPt[1] - sin * 17.5} class="sun-ray" />
      {/each}
      <circle cx={sunPt[0]} cy={sunPt[1]} r="12" fill="url(#sun-grad)" stroke="#e07b00" stroke-width="0.75" />
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

  <!-- Physical Sun–Earth–Moon inset -->
  <figure class="orbital">
    <svg viewBox="0 0 {OW} {OH}" role="img" aria-label={hi('सूर्य–पृथ्वी–चन्द्र', 'Sun, Earth and Moon')}>
      <defs>
        <radialGradient id="orb-sun" cx="40%" cy="38%" r="62%">
          <stop offset="0%" stop-color="#fff8d8" />
          <stop offset="55%" stop-color="#ffd23f" />
          <stop offset="100%" stop-color="#f08a00" />
        </radialGradient>
        <radialGradient id="orb-earth" cx="38%" cy="34%" r="72%">
          <stop offset="0%" stop-color="#7db4e6" />
          <stop offset="100%" stop-color="#2f6196" />
        </radialGradient>
      </defs>
      {#each [-30, -10, 10, 30] as dy (dy)}
        <line x1={SUNX + 26} y1={EARTH.y + dy} x2={EARTH.x - 16} y2={EARTH.y + dy * 0.5} class="sunlight" />
      {/each}
      <circle cx={SUNX} cy={EARTH.y} r="26" fill="url(#orb-sun)" />
      <text x={SUNX} y={EARTH.y + 42} class="orb-label" text-anchor="middle">{hi('सूर्य', 'Sun')}</text>
      <circle cx={EARTH.x} cy={EARTH.y} r={ORB} class="orbit" />
      <line x1={EARTH.x} y1={EARTH.y} x2={moonOrb.x} y2={moonOrb.y} class="sight" />
      <circle cx={EARTH.x} cy={EARTH.y} r="11" fill="url(#orb-earth)" />
      <text x={EARTH.x} y={EARTH.y + 26} class="orb-label" text-anchor="middle">{hi('पृथ्वी', 'Earth')}</text>
      <circle cx={moonOrb.x} cy={moonOrb.y} r="9" class="orb-moon-dark" />
      <path d={litHalf(moonOrb.x, moonOrb.y, 9)} class="orb-moon-lit" />
      <circle cx={moonOrb.x} cy={moonOrb.y} r="9" class="orb-moon-ring" />
    </svg>
    <figcaption>
      {hi(
        'चन्द्र का सूर्य-मुखी आधा भाग सदा प्रकाशित रहता है; पृथ्वी से हम उसे एक कोण पर देखते हैं — वही अंतर कला बनाता है। अमावस्या पर चन्द्र सूर्य की ओर, पूर्णिमा पर विपरीत।',
        "The Moon's sunward half is always lit; from Earth we see it at an angle — that gap is the phase. New moon when the Moon is toward the Sun, full when opposite.",
      )}
    </figcaption>
  </figure>

  <!-- controls -->
  <div class="controls" role="group" aria-label={hi('समय नियंत्रण', 'Time controls')}>
    <div class="speeds">
      <button type="button" class:on={activeSpeedKey === 'now'} onclick={goNow}>● {hi('अभी', 'Now')}</button>
      {#each SPEEDS as s (s.key)}
        <button type="button" class:on={activeSpeedKey === s.key} onclick={() => setSpeed(s)}>
          {s.n ? num(s.n) + ' ' : ''}{lang === 'hi' ? s.hi : s.en}
        </button>
      {/each}
    </div>
    <label class="graha-toggle">
      <input type="checkbox" bind:checked={showGrahas} />
      {hi('सभी ग्रह', 'All grahas')}
    </label>
  </div>

  <p class="hint">
    {hi(
      'गति बढ़ाएँ और देखें — चन्द्र सूर्य से आगे बढ़ता है, अंतर 0° से 360° तक भरता है, हर 12° पर नई तिथि। ग्रह चालू करें तो तेज़ गति पर मंगल/बुध आदि का वक्री (उल्टा) चलना भी दिखता है।',
      'Speed it up and watch the Moon pull ahead of the Sun — every 12° is a new tithi. Turn on the grahas and, at speed, you can even watch a planet go retrograde (briefly reverse).',
    )}
    <a href="https://github.com/surendrajat/panchang/tree/main/docs/guide" target="_blank" rel="noopener">
      {hi('यह कैसे काम करता है →', 'How this works →')}
    </a>
  </p>
</section>

<style>
  .sky {
    max-width: 780px;
    margin: 0 auto;
  }
  .sky__head h2 {
    margin: 0;
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }
  .exp {
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--paper);
    background: var(--gold, #b8860b);
    padding: 0.1rem 0.4rem;
    border-radius: var(--radius-pill, 999px);
  }
  .desc {
    color: var(--ink-soft);
    margin: 0.4rem 0 0.75rem;
  }
  .clock {
    text-align: center;
    font-size: 1.15rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
    margin: 0 0 0.5rem;
  }
  .sky__grid {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem 1.5rem;
    align-items: center;
    justify-content: center;
  }
  .wheel {
    width: 380px;
    max-width: 100%;
    flex: 1 1 340px;
  }

  .rashi {
    fill: var(--paper-2);
    stroke: var(--line);
    stroke-width: 1;
  }
  .rashi--alt {
    fill: var(--paper-3);
  }
  /* strong, unambiguous highlight for the Sun's and Moon's current rashi
     (declared after --alt so they win) */
  .rashi--sun {
    fill: color-mix(in srgb, #f0a000 32%, var(--paper));
    stroke: #e07b00;
  }
  .rashi--moon {
    fill: color-mix(in srgb, #6f9fd0 30%, var(--paper));
    stroke: #4a79a8;
  }
  .badge {
    fill: var(--paper);
    stroke: var(--line);
    stroke-width: 1;
  }
  .badge--sun {
    fill: #f0a000;
    stroke: #e07b00;
  }
  .badge--moon {
    fill: #6f9fd0;
    stroke: #4a79a8;
  }
  .rashi-glyph {
    font-size: 13px;
    fill: var(--ink);
  }
  .rashi-glyph.on {
    fill: var(--paper);
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
    opacity: 0.9;
  }
  .ray {
    stroke-width: 1.25;
    opacity: 0.45;
  }
  .ray--sun {
    stroke: #f0a000;
  }
  .ray--moon {
    stroke: var(--ink-soft);
  }
  .sun-ray {
    stroke: #f5a623;
    stroke-width: 2.2;
    stroke-linecap: round;
  }
  .moon-dark {
    fill: var(--paper-3);
    stroke: none;
  }
  .moon-lit {
    fill: #f3e7c4;
  }
  .moon-ring {
    fill: none;
    stroke: var(--ink-soft);
    stroke-width: 1.25;
  }
  .graha {
    fill: var(--paper);
    stroke: var(--red-deep, #7a1818);
    stroke-width: 1.25;
  }
  .graha-label {
    font-size: 8px;
    font-weight: 700;
    fill: var(--red-deep, #7a1818);
  }
  .earth-land {
    fill: #4e9a5b;
    opacity: 0.85;
  }
  .center-label,
  .orb-label {
    font-size: 9px;
    fill: var(--ink-faint, #999);
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
    width: 380px;
    max-width: 100%;
    flex: 1 1 320px;
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
    opacity: 0.65;
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
    fill: #f3e7c4;
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
    gap: 0.6rem 1rem;
    justify-content: space-between;
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
  .graha-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.82rem;
    color: var(--ink-soft);
    cursor: pointer;
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
