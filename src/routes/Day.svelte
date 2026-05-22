<script lang="ts">
  import DayCard from '$components/DayCard.svelte';
  import DayPager from '$components/DayPager.svelte';
  import { computePanchanga } from '$lib/panchanga';
  import { preferences } from '$lib/state/preferences.svelte';
  import { t, type TranslationKey } from '$lib/i18n';

  const tr = (k: TranslationKey, vars?: Record<string, string | number>) =>
    t(k, vars, preferences.language);

  interface Props {
    yyyymmdd: string;
  }
  let { yyyymmdd }: Props = $props();

  // We interpret `yyyymmdd` as "civil date in the location's tz". To
  // get a Date that resolves to that civil day inside computePanchanga
  // (which itself snaps to civil midnight in the tz), pass any instant
  // safely inside the day's UTC window. Noon UTC works for any single
  // tz on Earth (UTC±14h).
  const date = $derived.by(() => {
    const m = yyyymmdd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return new Date(NaN);
    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0));
  });

  const panchanga = $derived.by(() => {
    if (!preferences.location || !preferences.hydrated) return null;
    if (Number.isNaN(date.getTime())) return null;
    return computePanchanga(date, preferences.location, {
      ayanamsa: preferences.ayanamsa,
      monthSystem: preferences.monthSystem,
    });
  });

  // Day navigation lives in DayPager.svelte now — single source of
  // truth for prev/next/today.
</script>

<section class="view stack stack--lg">
  {#if panchanga}
    <DayPager currentYMD={yyyymmdd} currentDate={panchanga.date} />
    <DayCard {panchanga} />
  {:else if Number.isNaN(date.getTime())}
    <p class="muted">{tr('month.invalidDate', { value: yyyymmdd })}</p>
  {:else}
    <p class="muted">{tr('month.loading')}</p>
  {/if}
</section>
