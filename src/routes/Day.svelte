<script lang="ts">
  import DayCard from '$components/DayCard.svelte';
  import DayPager from '$components/DayPager.svelte';
  import { civilTimeInZone, isValidCivilDate } from '$lib/astro';
  import { computePanchanga, type Panchanga } from '$lib/panchanga';
  import { preferences, panchangaOptionsFrom } from '$lib/state/preferences.svelte';
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

  // Sync-compute: computePanchanga is pure and fast (~2 ms). Computing
  // synchronously eliminates the "loading…" flash between mount and async cache
  // resolution. With the DayPager sticky, that brief shorter-content moment let
  // the browser snap scrollY to 0 during today↔day navigation.
  const panchanga = $derived.by<Panchanga | null>(() => {
    const loc = preferences.location;
    if (!loc || !preferences.hydrated || !date || Number.isNaN(date.getTime())) return null;
    return computePanchanga(date, loc, panchangaOptionsFrom(preferences));
  });

  $effect(() => {
    const loc = preferences.location;
    if (!loc || !date || !panchanga) return;
    const key = cacheKey(date, loc, panchangaOptionsFrom(preferences));
    void getCached(key).then((cached) => {
      if (!cached) void putCached(key, panchanga);
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
