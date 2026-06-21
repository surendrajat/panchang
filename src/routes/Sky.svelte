<script lang="ts">
  // EXPERIMENTAL — "The Sky Right Now": the Sun, Moon and planets in YOUR local
  // sky (the all-sky dome) plus a practical observing table for tonight (rise,
  // set, where each body is now, brightness). The interactive ecliptic wheel +
  // live readout live in the #/learn guide. (More observation/planning to come.)
  import { dateToJulian, sunMoonElongationAtJD, moonIlluminationAtJD } from '$lib/astro';
  import { preferences } from '$lib/state/preferences.svelte';
  import StarDome from '../components/sky/StarDome.svelte';
  import SkyClock from '../components/sky/SkyClock.svelte';
  import ObservationTable from '../components/sky/ObservationTable.svelte';

  const lang = $derived(preferences.language);
  const hi = (h: string, e: string) => (lang === 'hi' ? h : e);

  // The shared <SkyClock> owns the time model; we bind to its current moment.
  let now = $state(new Date());
  const jd = $derived(dateToJulian(now));
  const elong = $derived(sunMoonElongationAtJD(jd));
  const illum = $derived(moonIlluminationAtJD(jd));
</script>

<section class="sky">
  <header class="sky__head">
    <h2>{hi('आकाश दृश्य', 'The Sky View')}</h2>
    <p class="desc">
      {hi(
        'आपके स्थानीय आकाश में सूर्य, चन्द्र व ग्रह — और आज रात के उदय/अस्त समय। पूरा अंतःक्रियात्मक राशि-चक्र ',
        'The Sun, Moon and planets in your local sky — and tonight’s rise/set times. The full interactive zodiac wheel lives in the ',
      )}<a href="#/learn">{hi('सीखें मार्गदर्शिका', 'Learn guide')}</a>{hi(' में है।', '.')}
    </p>
  </header>

  <SkyClock bind:date={now} />

  <!-- Local sky: where the Sun, Moon & planets actually are above you right now -->
  <StarDome date={now} {illum} {elong} controls />

  <!-- Tonight: when each body rises/sets, where it is now, how bright -->
  <ObservationTable date={now} />
</section>

<style>
  .sky {
    max-width: 760px;
    margin: 0 auto;
    padding-bottom: 2rem;
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
</style>
