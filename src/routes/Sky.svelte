<script lang="ts">
  // EXPERIMENTAL — "The Sky Right Now": the Sun, Moon and planets in YOUR local
  // sky (the all-sky dome), plus the Sun–Earth–Moon model that shows why the Moon
  // wears a phase. The interactive ecliptic wheel + live readout now live in the
  // #/learn notebook (as its finale); this page keeps the two views that are
  // about where things actually are in the sky above you.
  import { preferences } from '$lib/state/preferences.svelte';
  import { dateToJulian, sunMoonElongationAtJD, moonIlluminationAtJD } from '$lib/astro';
  import { tithiIndexFromElongation } from '$lib/jyotish/sky-math';
  import { tithiNameByIndex } from '$lib/i18n';
  import { applyNumerals } from '$lib/format/numerals';
  import MoonPhase from '../components/MoonPhase.svelte';
  import OrbitalView from '../components/sky/OrbitalView.svelte';
  import StarDome from '../components/sky/StarDome.svelte';

  const lang = $derived(preferences.language);
  const num = (s: string | number) => applyNumerals(String(s), preferences.numerals);
  const hi = (h: string, e: string) => (lang === 'hi' ? h : e);
  const tn = (dev: string, tr: string, en: string) =>
    lang === 'hi' ? dev : preferences.transliteration ? tr : en;
  const earthLabel = $derived(tn('पृथ्वी', 'Prithvi', 'Earth'));

  // ── Time model (capped ~30 fps; idle when paused; torn down on unmount) ─────
  let simMs = $state(Date.now());
  let speed = $state(0);
  let live = $state(true);
  $effect(() => {
    if (!live && speed === 0) return;
    let raf = 0;
    let last = performance.now();
    let liveAcc = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const dt = t - last;
      if (dt < 30) return;
      last = t;
      if (live) {
        liveAcc += dt;
        if (liveAcc >= 1000) {
          simMs = Date.now();
          liveAcc = 0;
        }
      } else simMs += speed * dt;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  const SPEEDS = [
    { key: 'pause', live: false, speed: 0, n: '', hi: 'रोकें', en: 'Pause' },
    // "से." with the trailing dot — abbreviation of "सेकंड" (second)
    { key: 'hour', live: false, speed: 3600, n: '1', hi: 'घंटा/से.', en: 'hour/s' },
    { key: 'day', live: false, speed: 86400, n: '1', hi: 'दिन/से.', en: 'day/s' },
    { key: 'week', live: false, speed: 604800, n: '1', hi: 'सप्ताह/से.', en: 'week/s' },
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

  const simDate = $derived(new Date(simMs));
  const jd = $derived(dateToJulian(simDate));
  const elong = $derived(sunMoonElongationAtJD(jd));
  const illum = $derived(moonIlluminationAtJD(jd));
  const tithiNum = $derived(tithiIndexFromElongation(elong));
  const paksha = $derived(elong < 180 ? hi('शुक्ल', 'Shukla') : hi('कृष्ण', 'Krishna'));

  const simLabelFmt = $derived(
    new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: preferences.timeFormat === '12h',
      numberingSystem: 'latn',
      timeZone: preferences.location?.timezone,
    }),
  );
  const simLabel = $derived(num(simLabelFmt.format(simDate)));
</script>

<section class="sky">
  <header class="sky__head">
    <h2>{hi('आकाश दृश्य', 'The Sky View')}</h2>
    <p class="desc">
      {hi(
        'आपके स्थानीय आकाश में सूर्य, चन्द्र व ग्रह — और सूर्य–पृथ्वी–चन्द्र मॉडल जो दिखाता है कि चन्द्र की कला क्यों बनती है। पूरा अंतःक्रियात्मक राशि-चक्र अब ',
        'The Sun, Moon and planets in your local sky — and the Sun–Earth–Moon model that shows why the Moon wears a phase. The full interactive zodiac wheel now lives in the ',
      )}<a href="#/learn">{hi('सीखें-नोटबुक', 'Learn notebook')}</a>{hi(' में है।', '.')}
    </p>
  </header>

  <div class="timebar">
    <div class="clock">{simLabel}</div>
    <div class="speeds" role="group" aria-label={hi('समय गति', 'Time speed')}>
      <button type="button" class:on={activeSpeedKey === 'now'} onclick={goNow}
        >● {hi('अभी', 'Now')}</button
      >
      {#each SPEEDS as s (s.key)}
        <button type="button" class:on={activeSpeedKey === s.key} onclick={() => setSpeed(s)}
          >{s.n ? num(s.n) + ' ' : ''}{lang === 'hi' ? s.hi : s.en}</button
        >
      {/each}
    </div>
    <p class="speed-hint">
      {hi('💡 समय की गति यहाँ टैप करके बढ़ाई जा सकती है', '💡 Speed up time by tapping here')}
    </p>
  </div>

  <!-- Local sky: where the Sun, Moon & planets actually are above you right now -->
  <StarDome date={simDate} {illum} {elong} controls />

  <!-- Side view: the model on the left, the phase we actually see on the right -->
  <div class="what-we-see">
    <figure class="orbital">
      <OrbitalView {elong} {earthLabel} labelMode="hover" />
      <figcaption>
        {hi(
          'चन्द्र का सूर्य-मुखी आधा भाग सदा प्रकाशित; पृथ्वी से हम उसे एक कोण पर देखते हैं — वही अंतर चन्द्र की कला है।',
          "The Moon's sunward half is always lit; from Earth we see it at an angle — and that gap is the Moon's phase.",
        )}
      </figcaption>
    </figure>

    <figure class="moonphase">
      <MoonPhase illumination={illum} phaseAngle={elong} phaseName={paksha} size={120} />
      <figcaption>
        {hi('चन्द्र हमें कैसा दिखता है', 'How the Moon looks to us')} —
        <strong>{num((illum * 100).toFixed(0))}% {hi('प्रकाशित', 'lit')}</strong>, {paksha}
        {tithiNameByIndex(tithiNum, lang)}
      </figcaption>
    </figure>
  </div>
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
  .desc {
    color: var(--ink-soft);
    margin: 0.4rem 0 0.9rem;
    font-size: 0.95rem;
    line-height: 1.55;
  }
  .desc a {
    color: var(--red);
  }

  /* keep the date + speed controls in view while scrolling */
  .timebar {
    position: sticky;
    top: 0;
    z-index: 20;
    text-align: center;
    margin-bottom: 1rem;
    padding: 0.5rem 0 0.6rem;
    background: color-mix(in srgb, var(--paper) 92%, transparent);
    backdrop-filter: blur(6px);
    border-bottom: 1px solid var(--line);
  }
  @media (hover: none), (max-width: 600px) {
    .timebar {
      backdrop-filter: none;
      background: var(--paper);
    }
  }
  .clock {
    display: inline-block;
    min-width: 13rem;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    line-height: 1.5;
  }
  .speeds {
    display: inline-flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 2px;
    margin-top: 0.55rem;
    padding: 3px;
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: var(--radius-pill, 999px);
  }
  .speed-hint {
    margin: 0.75rem 0 0;
    font-size: 0.72rem;
    color: var(--ink-faint);
    line-height: 1.2;
    font-style: italic;
  }
  .speeds button {
    padding: 0.32rem 0.78rem;
    border: none;
    border-radius: var(--radius-pill, 999px);
    background: none;
    color: var(--ink-soft);
    font: inherit;
    font-size: 0.82rem;
    cursor: pointer;
    white-space: nowrap;
    transition:
      background 0.15s,
      color 0.15s;
  }
  @media (max-width: 460px) {
    .speeds {
      gap: 1px;
      padding: 2px;
    }
    .speeds button {
      padding: 0.3rem 0.46rem;
      font-size: 0.72rem;
    }
  }
  .speeds button:hover {
    color: var(--ink);
  }
  .speeds button.on {
    background: var(--red);
    color: var(--paper);
    font-weight: 600;
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.18);
  }

  /* "what we see": the Sun–Earth–Moon model on the left, the phase on the right */
  .what-we-see {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 1rem 1.75rem;
    margin-top: 1.5rem;
  }
  .orbital {
    flex: 1 1 300px;
    max-width: 360px;
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.6rem;
  }
  .orbital figcaption {
    flex: 1 1 100%;
    color: var(--ink-soft);
    font-size: 0.84rem;
    line-height: 1.5;
  }
  .moonphase {
    flex: 0 1 200px;
    margin: 0;
    text-align: center;
  }
  .moonphase figcaption {
    margin-top: 12px;
    font-size: 13.5px;
    color: var(--ink-soft);
    line-height: 1.5;
  }
  .moonphase figcaption strong {
    color: var(--ink);
  }
</style>
