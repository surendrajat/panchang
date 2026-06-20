<script lang="ts">
  import DayCard from '$components/DayCard.svelte';
  import DayPager from '$components/DayPager.svelte';
  import { computePanchanga, type Panchanga } from '$lib/panchanga';
  import { preferences, panchangaOptionsFrom } from '$lib/state/preferences.svelte';
  import { clock } from '$lib/state/clock.svelte';
  import { localYMD } from '$lib/format/time';
  import { t, type TranslationKey } from '$lib/i18n';
  import { cacheKey, getCached, putCached } from '$lib/storage';

  const tr = (k: TranslationKey, vars?: Record<string, string | number>) =>
    t(k, vars, preferences.language);

  const now = $derived(clock.now);
  const todayYMD = $derived(localYMD(now, preferences.location?.timezone ?? 'UTC'));

  let panchanga = $state<Panchanga | null>(null);

  $effect(() => {
    const loc = preferences.location;
    const hydrated = preferences.hydrated;
    const opts = panchangaOptionsFrom(preferences);
    if (!loc || !hydrated) {
      panchanga = null;
      return;
    }
    const key = cacheKey(now, loc, opts);
    let cancelled = false;
    getCached(key).then((cached) => {
      if (cancelled) return;
      if (cached) {
        panchanga = cached;
        return;
      }
      const result = computePanchanga(now, loc, opts);
      if (!cancelled) {
        panchanga = result;
        void putCached(key, result);
      }
    });
    return () => {
      cancelled = true;
    };
  });
</script>

<section class="view stack stack--lg">
  {#if panchanga}
    <DayPager currentYMD={todayYMD} currentDate={panchanga.date} />
    <DayCard {panchanga} />
  {:else}
    <p class="muted">{tr('month.loading')}</p>
  {/if}
</section>
