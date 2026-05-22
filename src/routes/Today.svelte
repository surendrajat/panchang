<script lang="ts">
  import DayCard from '$components/DayCard.svelte';
  import DayPager from '$components/DayPager.svelte';
  import { computePanchanga } from '$lib/panchanga';
  import { preferences } from '$lib/state/preferences.svelte';
  import { localYMD } from '$lib/format/time';
  import { t, type TranslationKey } from '$lib/i18n';

  const tr = (k: TranslationKey, vars?: Record<string, string | number>) =>
    t(k, vars, preferences.language);

  const now = new Date();
  const todayYMD = $derived(localYMD(now, preferences.location?.timezone ?? 'UTC'));

  const panchanga = $derived.by(() => {
    if (!preferences.location || !preferences.hydrated) return null;
    return computePanchanga(now, preferences.location, {
      ayanamsa: preferences.ayanamsa,
      monthSystem: preferences.monthSystem,
    });
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
