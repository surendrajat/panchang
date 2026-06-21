<script lang="ts">
  // EXPERIMENTAL — "The Sky Right Now": the Sun, Moon and planets in YOUR local
  // sky (the all-sky dome), plus the Sun–Earth–Moon model that shows why the Moon
  // wears a phase. The interactive ecliptic wheel + live readout live in the
  // #/learn guide (as its finale); this page keeps the views about where things
  // actually are in the sky above you. (More observation/planning tools to come.)
  import { preferences } from '$lib/state/preferences.svelte';
  import { dateToJulian, sunMoonElongationAtJD, moonIlluminationAtJD } from '$lib/astro';
  import { tithiIndexFromElongation } from '$lib/jyotish/sky-math';
  import { tithiNameByIndex } from '$lib/i18n';
  import { applyNumerals } from '$lib/format/numerals';
  import MoonPhase from '../components/MoonPhase.svelte';
  import OrbitalView from '../components/sky/OrbitalView.svelte';
  import StarDome from '../components/sky/StarDome.svelte';
  import SkyClock from '../components/sky/SkyClock.svelte';

  const lang = $derived(preferences.language);
  const num = (s: string | number) => applyNumerals(String(s), preferences.numerals);
  const hi = (h: string, e: string) => (lang === 'hi' ? h : e);
  const tn = (dev: string, tr: string, en: string) =>
    lang === 'hi' ? dev : preferences.transliteration ? tr : en;
  const earthLabel = $derived(tn('पृथ्वी', 'Pṛthvī', 'Earth'));

  // The shared <SkyClock> owns the time model; we bind to its current moment.
  let now = $state(new Date());
  const jd = $derived(dateToJulian(now));
  const elong = $derived(sunMoonElongationAtJD(jd));
  const illum = $derived(moonIlluminationAtJD(jd));
  const tithiNum = $derived(tithiIndexFromElongation(elong));
  const paksha = $derived(elong < 180 ? hi('शुक्ल', 'Shukla') : hi('कृष्ण', 'Krishna'));
</script>

<section class="sky">
  <header class="sky__head">
    <h2>{hi('आकाश दृश्य', 'The Sky View')}</h2>
    <p class="desc">
      {hi(
        'आपके स्थानीय आकाश में सूर्य, चन्द्र व ग्रह — और सूर्य–पृथ्वी–चन्द्र मॉडल जो दिखाता है कि चन्द्र की कला क्यों बनती है। पूरा अंतःक्रियात्मक राशि-चक्र ',
        'The Sun, Moon and planets in your local sky — and the Sun–Earth–Moon model that shows why the Moon wears a phase. The full interactive zodiac wheel lives in the ',
      )}<a href="#/learn">{hi('सीखें मार्गदर्शिका', 'Learn guide')}</a>{hi(' में है।', '.')}
    </p>
  </header>

  <SkyClock bind:date={now} />

  <!-- Local sky: where the Sun, Moon & planets actually are above you right now -->
  <StarDome date={now} {illum} {elong} controls />

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
