<script lang="ts">
  import { PAN_INDIA_FESTIVALS, type FestivalOccurrence } from '$lib/panchanga';
  import { MS_PER_DAY } from '$lib/astro';
  import { preferences } from '$lib/state/preferences.svelte';
  import { formatDate, localYMD } from '$lib/format/time';
  import { applyNumerals } from '$lib/format/numerals';
  import { t, type TranslationKey, localeMetaOf } from '$lib/i18n';
  import { loadFestivals } from '$lib/festival-loader';
  import Loading from '$components/Loading.svelte';

  // Pick the language-appropriate display name for a festival.
  function festivalDisplay(o: FestivalOccurrence): string {
    const r = PAN_INDIA_FESTIVALS.find((f) => f.key === o.key);
    if (!r) return o.displayName;
    return preferences.language === 'hi' && r.displayNameHi ? r.displayNameHi : r.displayName;
  }

  const tr = (k: TranslationKey, vars?: Record<string, string | number>) =>
    t(k, vars, preferences.language);
  const num = (s: string) => applyNumerals(s, preferences.numerals);

  interface Props {
    year: string;
  }
  let { year }: Props = $props();

  const parsedYear = $derived.by(() => {
    const n = Number(year);
    if (!Number.isFinite(n) || n < 1900 || n > 2100) return null;
    return n;
  });

  // Festival compute (cache-first; a miss runs ~a year of dates off the main
  // thread in a shared worker) lives in $lib/festival-loader — the same module
  // the app uses to prefetch the current year on load, so a first visit here is
  // usually already a cache hit.

  let occurrences = $state<FestivalOccurrence[]>([]);
  let loading = $state(false);

  $effect(() => {
    if (!parsedYear || !preferences.location || !preferences.hydrated) {
      occurrences = [];
      loading = false;
      return;
    }
    const year = parsedYear;
    // Snapshot to a plain object — the reactive $state proxy can't be
    // structured-cloned, so postMessage to the worker would throw DataCloneError.
    const loc = $state.snapshot(preferences.location);
    const opts = { ayanamsa: preferences.ayanamsa, monthSystem: preferences.monthSystem };
    let cancelled = false;
    loading = true;
    loadFestivals(year, loc, opts)
      .then((results) => {
        if (!cancelled) occurrences = results;
      })
      .catch((e) => {
        if (!cancelled) {
          occurrences = [];
          console.error('festival compute failed', e);
        }
      })
      .finally(() => {
        if (!cancelled) loading = false;
      });
    return () => {
      cancelled = true;
    };
  });

  function adjustYear(delta: number): string {
    return String((parsedYear ?? new Date().getUTCFullYear()) + delta);
  }

  function tz(): string {
    return preferences.location?.timezone ?? 'UTC';
  }

  function daysFromToday(d: Date): number {
    const now = Date.now();
    return Math.round((d.getTime() - now) / MS_PER_DAY);
  }

  function countdownLabel(occ: FestivalOccurrence): string {
    const dt = daysFromToday(occ.date);
    if (dt === 0) return tr('fest.today');
    if (dt === -1) return tr('fest.oneDayAgo', { days: num('1') });
    if (dt < 0) return tr('fest.daysAgo', { days: num(String(-dt)) });
    if (dt === 1) return tr('fest.inOneDay', { days: num('1') });
    return tr('fest.inDays', { days: num(String(dt)) });
  }
</script>

<section class="view stack">
  {#if parsedYear}
    <header class="head">
      <h2>{tr('fest.festivalsYear', { year: num(String(parsedYear)) })}</h2>
      <div class="arrows">
        <a
          class="icon-btn icon-btn--link icon-btn--chev"
          href={'#/festivals/' + adjustYear(-1)}
          aria-label={tr('nav.prevYear')}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </a>
        <a
          class="icon-btn icon-btn--link icon-btn--chev"
          href={'#/festivals/' + adjustYear(1)}
          aria-label={tr('nav.nextYear')}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </a>
      </div>
    </header>
    {#if loading}
      <Loading label={tr('fest.computing')} />
    {:else if occurrences.length > 0}
      <ol class="festival-year">
        {#each occurrences as occ (occ.date.toISOString() + occ.key)}
          <li>
            <a class="row" href={'#/day/' + localYMD(occ.date, tz())}>
              <span class="row__date num">
                {num(formatDate(occ.date, tz(), localeMetaOf(preferences.language).intlLocale))}
              </span>
              <span class="row__name serif">{festivalDisplay(occ)}</span>
              <span class="row__count muted">{countdownLabel(occ)}</span>
            </a>
          </li>
        {/each}
      </ol>
    {:else}
      <p class="muted">{tr('fest.computing')}</p>
    {/if}
  {:else}
    <p class="muted">{tr('fest.invalidYear', { year })}</p>
  {/if}
</section>

<style>
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: var(--space-3);
  }
  .arrows {
    display: flex;
    gap: 6px;
  }
  .icon-btn--link {
    text-decoration: none;
  }
  .festival-year {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .row {
    display: grid;
    grid-template-columns: 12rem 1fr auto;
    gap: var(--space-3);
    padding: 14px 18px;
    align-items: baseline;
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--paper-2);
    color: var(--ink);
    text-decoration: none;
    transition:
      border-color 0.15s,
      background 0.15s;
  }
  .row:hover {
    border-color: var(--red);
    background: color-mix(in srgb, var(--red) 5%, var(--paper-2));
    text-decoration: none;
  }
  .row__date {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--ink-soft);
    letter-spacing: 0.02em;
  }
  .row__name {
    font-size: 17px;
  }
  .row__count {
    font-size: 13px;
  }
  @media (max-width: 500px) {
    .row {
      grid-template-columns: 1fr;
      gap: 4px;
    }
  }
</style>
