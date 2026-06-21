<script lang="ts">
  // A short ANIMATED primer that builds the one idea the notebook rests on, before
  // any formulas: celestial sphere → the ecliptic → ecliptic longitude (λ) → the
  // twelve rāśi → the two "hands" (Sun & Moon). One evolving canvas; the Sun
  // really crawls and the Moon really races (~13× faster), so the gap that becomes
  // the tithi is felt, not just told. The dark "sky" sits inside a paper card so
  // it belongs to the page. Self-paced — independent of the notebook's kernel.
  import { preferences } from '$lib/state/preferences.svelte';
  import { applyNumerals } from '$lib/format/numerals';
  import { SIGN_GLYPH } from '$lib/jyotish/glyphs';
  import BodyIcon from '../BodyIcon.svelte';
  import EarthIcon from './EarthIcon.svelte';

  const lang = $derived(preferences.language);
  const num = (s: string | number) => applyNumerals(String(s), preferences.numerals);
  const hi = (h: string, e: string) => (lang === 'hi' ? h : e);

  const STEPS = [
    {
      t: { hi: 'आप यहाँ हैं', en: 'You are here' },
      b: {
        hi: 'पृथ्वी से देखें तो आकाश एक विशाल गुम्बद है और तारे उस पर जड़े लगते हैं। दूरी मायने नहीं रखती — केवल दिशा।',
        en: 'From Earth, the sky looks like a vast dome with the stars fixed on it. Distance doesn’t matter here — only direction does.',
      },
    },
    {
      t: { hi: 'क्रान्तिवृत्त', en: 'The ecliptic' },
      b: {
        hi: 'वर्ष भर सूर्य तारों के बीच एक ही वृत्त खींचता है — क्रान्तिवृत्त। चन्द्र और ग्रह भी इसी मार्ग पर चलते हैं।',
        en: 'Over a year the Sun traces one fixed circle against the stars — the ecliptic. The Moon and planets ride the same highway.',
      },
    },
    {
      t: { hi: 'देशांतर (λ)', en: 'Longitude (λ)' },
      b: {
        hi: 'तो किसी पिंड का स्थान बस एक संख्या से बनता है: वृत्त पर वह 0° से कितना आगे है। यही उसका देशांतर λ है।',
        en: 'So a body’s place needs just one number: how far around the circle it sits, from 0°. That angle is its longitude, λ.',
      },
    },
    {
      t: { hi: 'बारह राशियाँ', en: 'The twelve signs' },
      b: {
        hi: 'इस वृत्त को 30° के बारह बराबर भागों में बाँटिए — यही राशियाँ हैं (मेष, वृषभ…)। यही वह रंगमंच है जिस पर सब घटित होता है।',
        en: 'Cut that circle into twelve equal 30° slices and you get the rāśi — the zodiac signs (Meṣa, Vṛṣabha…). This is the stage it all plays out on.',
      },
    },
    {
      t: { hi: 'दो सुइयाँ', en: 'Two hands' },
      b: {
        hi: 'बस दो पर नज़र रखें — सूर्य (धीमा, ~1°/दिन) और चन्द्र (तेज़, ~13°/दिन)। इन्हीं दो कोणों से पूरा पंचांग बनता है।',
        en: 'Track just two — the Sun (slow, ~1°/day) and the Moon (fast, ~13°/day). From these two angles the whole calendar is built.',
      },
    },
  ];

  // ── geometry ────────────────────────────────────────────────────────────────
  const VW = 360;
  const VH = 250;
  const CX = 180;
  const CY = 125;
  const R = 96; // ecliptic radius
  const SIGNS = Array.from({ length: 12 }, (_, i) => i);
  const pt = (deg: number, r = R): [number, number] => {
    const a = (deg * Math.PI) / 180;
    return [CX + r * Math.cos(a), CY - r * Math.sin(a)];
  };
  const ptS = (deg: number, r = R) =>
    pt(deg, r)
      .map((n) => n.toFixed(1))
      .join(' ');
  // CCW arc from a→b (longitudes increase counter-clockwise, 0° = due east)
  const arc = (a: number, b: number, r: number) => {
    const big = (b - a + 360) % 360 > 180 ? 1 : 0;
    return `M ${ptS(a, r)} A ${r} ${r} 0 ${big} 0 ${ptS(b, r)}`;
  };

  // background stars (fixed scatter, twinkle via CSS)
  const STARS: [number, number, number, number][] = [
    [16, 18, 1, 0],
    [180, 12, 1.3, 0.6],
    [345, 18, 1, 1.2],
    [60, 40, 0.9, 0.3],
    [300, 40, 1.1, 0.9],
    [110, 22, 0.8, 1.5],
    [250, 22, 1, 0.4],
    [35, 75, 1.2, 1.1],
    [325, 75, 0.9, 0.7],
    [14, 125, 1, 1.8],
    [348, 125, 1.1, 0.2],
    [35, 180, 0.8, 1.3],
    [325, 180, 1, 0.5],
    [16, 232, 1.1, 1.6],
    [180, 244, 1.2, 0.8],
    [345, 232, 0.9, 0.1],
    [85, 30, 0.8, 2.0],
    [275, 30, 1, 1.0],
    [85, 222, 0.9, 0.6],
    [275, 222, 1.1, 1.4],
    [55, 150, 0.8, 0.9],
    [305, 150, 0.9, 1.7],
    [130, 235, 1, 0.3],
    [232, 238, 0.8, 1.1],
    [140, 88, 0.7, 1.9],
    [228, 96, 0.7, 0.5],
    [150, 168, 0.7, 1.2],
    [216, 160, 0.7, 0.8],
  ];

  // ── motion (the Sun crawls, the Moon races; real ~13:1 ratio) ────────────────
  let t = $state(0); // elapsed "days"
  let step = $state(0);
  let auto = $state(true);
  const DAYS_PER_SEC = 3;

  // pause the animation loop whenever the panel is scrolled off-screen, so it
  // costs nothing once the reader has moved past it (cleaned up on unmount)
  let visible = $state(true);
  function onscreen(node: HTMLElement) {
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.01 });
    io.observe(node);
    return { destroy: () => io.disconnect() };
  }

  const sunDeg = $derived((t * 0.9856) % 360); // ~1°/day
  const moonDeg = $derived((t * 13.176) % 360); // ~13°/day
  const sunPos = $derived(pt(sunDeg));
  const moonPos = $derived(pt(moonDeg));
  const gap = $derived(((moonDeg - sunDeg + 360) % 360).toFixed(0));
  const ZERO = pt(0); // the 0° reference point (constant)
  const gapLabelPos = $derived(pt((sunDeg + ((moonDeg - sunDeg + 360) % 360) / 2) % 360, 66));

  // what shows at each step (progressive build-up)
  const lit = $derived(step >= 1);
  const showSun = $derived(step >= 1);
  const showZero = $derived(step >= 2);
  const showAngle = $derived(step === 2);
  const showSigns = $derived(step >= 3);
  const showMoon = $derived(step >= 4);

  $effect(() => {
    if (!visible) return; // idle while off-screen
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = now - last;
      if (dt < 33) return; // ~30fps
      last = now;
      t += (dt / 1000) * DAYS_PER_SEC;
      if (auto) {
        acc += dt;
        if (acc > 9000) {
          acc = 0;
          step = (step + 1) % STEPS.length;
        }
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  function go(s: number) {
    step = (s + STEPS.length) % STEPS.length;
    auto = false;
  }
</script>

<figure class="ci" use:onscreen>
  <div class="ci-sky">
    <svg viewBox="0 0 {VW} {VH}" role="img" aria-label={hi(STEPS[step].t.hi, STEPS[step].t.en)}>
      <defs>
        <radialGradient id="ci-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffcf4d" stop-opacity="0.5" />
          <stop offset="100%" stop-color="#ffcf4d" stop-opacity="0" />
        </radialGradient>
      </defs>

      <!-- stars -->
      <g>
        {#each STARS as [x, y, r, d] (`${x},${y}`)}
          <circle cx={x} cy={y} {r} class="ci-star" style="animation-delay:{d}s" />
        {/each}
      </g>

      <!-- the ecliptic circle (faint until named in step 2) -->
      <circle cx={CX} cy={CY} r={R} class="ci-ecliptic" class:lit fill="none" />

      <!-- the twelve rāśi divisions (step 4) -->
      <g class="ci-layer ci-signs" class:show={showSigns} class:dim={showMoon}>
        {#each SIGNS as i (i)}
          {@const a = pt(i * 30, R - 7)}
          {@const b = pt(i * 30, R + 7)}
          {@const g = pt(i * 30 + 15, R - 18)}
          <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} class="ci-sigtick" />
          <text
            x={g[0]}
            y={g[1]}
            class="ci-sigglyph"
            text-anchor="middle"
            dominant-baseline="central">{SIGN_GLYPH[i]}</text
          >
        {/each}
      </g>

      <!-- 0° reference + the longitude angle (step 3) -->
      <g class="ci-layer" class:show={showZero}>
        <line x1={CX} y1={CY} x2={ZERO[0]} y2={ZERO[1]} class="ci-zero" />
        <circle cx={ZERO[0]} cy={ZERO[1]} r="2.2" class="ci-zerodot" />
        <text x={ZERO[0] + 6} y={ZERO[1] + 4} class="ci-zerolabel">0°</text>
      </g>
      <g class="ci-layer" class:show={showAngle}>
        <path d={arc(0, sunDeg || 0.01, 30)} class="ci-anglearc" fill="none" />
      </g>

      <!-- the gap arc Sun→Moon (step 5) -->
      <g class="ci-layer" class:show={showMoon}>
        <path d={arc(sunDeg, moonDeg || 0.01, 52)} class="ci-gaparc" fill="none" />
        <text x={gapLabelPos[0]} y={gapLabelPos[1]} class="ci-gaplabel" text-anchor="middle"
          >{hi('अंतर', 'gap')} {num(gap)}°</text
        >
      </g>

      <!-- Earth at the centre -->
      <EarthIcon cx={CX} cy={CY} r={13} />
      <!-- "you are here" (step 1) -->
      <g class="ci-layer" class:show={step === 0}>
        <text x={CX} y={CY + 30} class="ci-here" text-anchor="middle"
          >{hi('आप · पृथ्वी', 'you · Earth')}</text
        >
      </g>

      <!-- the Moon (step 5): fast hand -->
      <g class="ci-layer" class:show={showMoon}>
        <line x1={CX} y1={CY} x2={moonPos[0]} y2={moonPos[1]} class="ci-ray ci-ray--moon" />
        <BodyIcon kind="moon" cx={moonPos[0]} cy={moonPos[1]} r={6.5} />
        <text x={moonPos[0]} y={moonPos[1] - 11} class="ci-bodylabel" text-anchor="middle"
          >{hi('चन्द्र', 'Moon')} · ~13°{hi('/दिन', '/d')}</text
        >
      </g>

      <!-- the Sun (step 2+): slow hand, with a short motion tail -->
      <g class="ci-layer" class:show={showSun}>
        <path d={arc((sunDeg - 38 + 360) % 360, sunDeg || 0.01, R)} class="ci-tail" fill="none" />
        <line x1={CX} y1={CY} x2={sunPos[0]} y2={sunPos[1]} class="ci-ray ci-ray--sun" />
        <circle cx={sunPos[0]} cy={sunPos[1]} r="13" fill="url(#ci-glow)" />
        <BodyIcon kind="sun" cx={sunPos[0]} cy={sunPos[1]} r={8} />
        {#if showAngle}
          {@const l = pt(sunDeg, R + 20)}
          <text x={l[0]} y={l[1]} class="ci-lambda" text-anchor="middle"
            >λ {num(sunDeg.toFixed(0))}°</text
          >
        {:else if step === 1 || showMoon}
          <text x={sunPos[0]} y={sunPos[1] - 13} class="ci-bodylabel" text-anchor="middle"
            >{hi('सूर्य', 'Sun')} · ~1°{hi('/दिन', '/d')}</text
          >
        {/if}
      </g>
    </svg>
  </div>

  <div class="ci-text">
    <h4>{hi(STEPS[step].t.hi, STEPS[step].t.en)}</h4>
    <p>{hi(STEPS[step].b.hi, STEPS[step].b.en)}</p>
  </div>

  <div class="ci-nav">
    <button
      type="button"
      class="ci-arrow"
      onclick={() => go(step - 1)}
      aria-label={hi('पिछला', 'Previous')}>‹</button
    >
    <div class="ci-dots" role="tablist">
      {#each STEPS as s, i (i)}
        <button
          type="button"
          class="ci-dot"
          class:on={i === step}
          aria-label={hi(s.t.hi, s.t.en)}
          aria-selected={i === step}
          role="tab"
          onclick={() => go(i)}
        ></button>
      {/each}
    </div>
    <button
      type="button"
      class="ci-arrow"
      onclick={() => go(step + 1)}
      aria-label={hi('अगला', 'Next')}>›</button
    >
  </div>
</figure>

<style>
  /* a paper card that belongs to the page; the dark sky lives inside a window */
  .ci {
    margin: 0 0 1rem;
    padding: 0.7rem;
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
  }
  .ci-sky {
    background: linear-gradient(180deg, #141b33 0%, #1d233f 100%);
    border-radius: var(--radius-sm);
    padding: 0.25rem;
    overflow: hidden;
  }
  .ci-sky svg {
    width: 100%;
    max-width: 440px;
    display: block;
    margin: 0 auto;
  }
  .ci-star {
    fill: #fff;
    opacity: 0.85;
    animation: ci-tw 3.5s ease-in-out infinite;
  }
  @keyframes ci-tw {
    0%,
    100% {
      opacity: 0.85;
    }
    50% {
      opacity: 0.3;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .ci-star {
      animation: none;
    }
  }
  .ci-ecliptic {
    stroke: rgba(255, 255, 255, 0.18);
    stroke-width: 1;
    stroke-dasharray: 3 4;
    transition:
      stroke 0.6s,
      stroke-width 0.6s;
  }
  .ci-ecliptic.lit {
    stroke: #e0b85a;
    stroke-width: 2;
    stroke-dasharray: none;
  }
  .ci-layer {
    opacity: 0;
    transition: opacity 0.6s ease;
  }
  .ci-layer.show {
    opacity: 1;
  }
  .ci-signs.dim {
    opacity: 0.4;
  }
  .ci-sigtick {
    stroke: rgba(224, 184, 90, 0.7);
    stroke-width: 1.2;
  }
  .ci-sigglyph {
    fill: #f0d79a;
    font-size: 11px;
    font-family: 'Panchang Symbols', 'Apple Symbols', 'Segoe UI Symbol', serif;
  }
  .ci-zero {
    stroke: rgba(255, 255, 255, 0.3);
    stroke-width: 1;
    stroke-dasharray: 2 3;
  }
  .ci-zerodot {
    fill: #fff;
  }
  .ci-zerolabel,
  .ci-here,
  .ci-bodylabel,
  .ci-lambda,
  .ci-gaplabel {
    fill: rgba(255, 255, 255, 0.92);
    font-size: 10px;
    font-weight: 600;
    paint-order: stroke;
    stroke: rgba(8, 12, 28, 0.55);
    stroke-width: 2px;
    stroke-linejoin: round;
  }
  .ci-here {
    fill: #9fc4ee;
  }
  .ci-lambda {
    fill: #ffd24d;
    font-size: 11px;
    font-weight: 700;
  }
  .ci-gaplabel {
    fill: #ff9a6a;
    font-weight: 700;
  }
  .ci-anglearc {
    stroke: #ffd24d;
    stroke-width: 2;
    stroke-linecap: round;
  }
  .ci-gaparc {
    stroke: #ff7a45;
    stroke-width: 3;
    stroke-linecap: round;
    opacity: 0.9;
  }
  .ci-tail {
    stroke: #ffce3a;
    stroke-width: 3;
    stroke-linecap: round;
    opacity: 0.28;
  }
  .ci-ray {
    stroke-width: 1;
    opacity: 0.3;
  }
  .ci-ray--sun {
    stroke: #ffce3a;
  }
  .ci-ray--moon {
    stroke: #c9d3ee;
  }
  /* text + controls in the page palette so the card reads as part of the page */
  .ci-text {
    text-align: center;
    max-width: 50ch;
    margin: 0.6rem auto 0.1rem;
  }
  .ci-text h4 {
    margin: 0 0 0.2rem;
    font-family: var(--font-serif);
    font-size: 1.1rem;
    color: var(--ink);
  }
  .ci-text p {
    margin: 0;
    font-size: 0.88rem;
    line-height: 1.5;
    color: var(--ink-soft);
    min-height: 3em;
  }
  .ci-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.8rem;
    margin-top: 0.4rem;
  }
  .ci-arrow {
    border: 1px solid var(--line);
    background: var(--paper-3);
    color: var(--ink-soft);
    width: 1.7rem;
    height: 1.7rem;
    border-radius: 50%;
    font-size: 1.1rem;
    line-height: 1;
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s;
  }
  .ci-arrow:hover {
    background: var(--paper);
    color: var(--ink);
  }
  .ci-dots {
    display: flex;
    gap: 0.4rem;
  }
  .ci-dot {
    width: 0.5rem;
    height: 0.5rem;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: var(--line);
    cursor: pointer;
    transition:
      background 0.15s,
      transform 0.15s;
  }
  .ci-dot.on {
    background: var(--gold, #e0b85a);
    transform: scale(1.3);
  }
</style>
