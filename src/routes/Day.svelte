<script lang="ts">
  import DayCard from '$components/DayCard.svelte';
  import DayPager from '$components/DayPager.svelte';
  import { civilTimeInZone, isValidCivilDate } from '$lib/astro';
  import { computePanchanga, type Panchanga } from '$lib/panchanga';
  import { preferences } from '$lib/state/preferences.svelte';
  import { t, type TranslationKey } from '$lib/i18n';
  import { cacheKey, getCached, putCached } from '$lib/storage';

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

  let panchanga = $state<Panchanga | null>(null);

  $effect(() => {
    const loc = preferences.location;
    const hydrated = preferences.hydrated;
    const opts = { ayanamsa: preferences.ayanamsa, monthSystem: preferences.monthSystem };
    if (!loc || !hydrated || !date || Number.isNaN(date.getTime())) {
      panchanga = null;
      return;
    }
    const d = date;
    const key = cacheKey(d, loc, opts);
    let cancelled = false;
    getCached(key).then((cached) => {
      if (cancelled) return;
      if (cached) {
        panchanga = cached;
        return;
      }
      const result = computePanchanga(d, loc, opts);
      if (!cancelled) {
        panchanga = result;
        void putCached(key, result);
      }
    });
    return () => {
      cancelled = true;
    };
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
