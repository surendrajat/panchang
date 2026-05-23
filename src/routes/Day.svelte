<script lang="ts">
  import DayCard from '$components/DayCard.svelte';
  import DayPager from '$components/DayPager.svelte';
  import { civilTimeInZone, isValidCivilDate } from '$lib/astro';
  import { computePanchanga } from '$lib/panchanga';
  import { preferences } from '$lib/state/preferences.svelte';
  import { t, type TranslationKey } from '$lib/i18n';

  const tr = (k: TranslationKey, vars?: Record<string, string | number>) =>
    t(k, vars, preferences.language);

  interface Props {
    yyyymmdd: string;
  }
  let { yyyymmdd }: Props = $props();

  const date = $derived.by(() => {
    if (!preferences.location) return null;
    const m = yyyymmdd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (!isValidCivilDate(year, month, day)) return null;
    return civilTimeInZone(year, month, day, preferences.location.timezone, 12);
  });

  const invalidDate = $derived.by(() => {
    const m = yyyymmdd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return true;
    return !isValidCivilDate(Number(m[1]), Number(m[2]), Number(m[3]));
  });

  const panchanga = $derived.by(() => {
    if (!preferences.location || !preferences.hydrated) return null;
    if (!date || Number.isNaN(date.getTime())) return null;
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
  {:else if invalidDate}
    <p class="muted">{tr('month.invalidDate', { value: yyyymmdd })}</p>
  {:else}
    <p class="muted">{tr('month.loading')}</p>
  {/if}
</section>
