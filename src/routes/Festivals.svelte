<script lang="ts">
  import { onDestroy } from 'svelte';
  import {
    PAN_INDIA_FESTIVALS,
    type FestivalOccurrence,
    type Location,
    type AyanamsaSystem,
    type MonthSystem,
  } from '$lib/panchanga';
  import { civilTimeInZone, MS_PER_DAY } from '$lib/astro';
  import { preferences } from '$lib/state/preferences.svelte';
  import { formatDate, localYMD } from '$lib/format/time';
  import { applyNumerals } from '$lib/format/numerals';
  import { t, type TranslationKey, localeMetaOf } from '$lib/i18n';
  import { festivalCacheKey, getFestivalsCached, putFestivalsCached } from '$lib/storage';

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

  // Filter out monthly recurrences from the year view.
  const MONTHLY_KEYS = new Set([
    'ekadashi',
    'pradosh',
    'sankashti_chaturthi',
    'amavasya',
    'purnima',
    'masik_shivaratri',
  ]);

  // Festival computation runs in a Web Worker so a first visit (cache miss)
  // doesn't freeze the UI while ~a year of dates is computed — the spinner keeps
  // animating. Repeat visits hit the IndexedDB cache and never reach the worker.
  let worker: Worker | null = null;
  let reqId = 0;
  // Plain bookkeeping for in-flight worker requests — not reactive state, so a
  // SvelteMap isn't needed here.
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const pending = new Map<
    number,
    { resolve: (r: FestivalOccurrence[]) => void; reject: (e: Error) => void }
  >();

  function computeInWorker(
    fromMs: number,
    toMs: number,
    loc: Location,
    opts: { ayanamsa: AyanamsaSystem; monthSystem: MonthSystem },
  ): Promise<FestivalOccurrence[]> {
    if (!worker) {
      worker = new Worker(new URL('./festivals.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (
        e: MessageEvent<{ id: number; results?: FestivalOccurrence[]; error?: string }>,
      ) => {
        const p = pending.get(e.data.id);
        if (!p) return;
        pending.delete(e.data.id);
        if (e.data.error) p.reject(new Error(e.data.error));
        else p.resolve(e.data.results ?? []);
      };
    }
    const id = ++reqId;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      worker!.postMessage({ id, fromMs, toMs, loc, opts });
    });
  }
  onDestroy(() => worker?.terminate());

  // Cache hit → instant; miss → compute off-thread (with a spinner).
  async function loadFestivals(
    year: number,
    loc: Location,
    opts: { ayanamsa: AyanamsaSystem; monthSystem: MonthSystem },
  ): Promise<FestivalOccurrence[]> {
    const key = festivalCacheKey(year, loc, opts);
    const cached = await getFestivalsCached(key);
    if (cached) return cached;
    const from = civilTimeInZone(year, 1, 1, loc.timezone, 12);
    const to = civilTimeInZone(year, 12, 31, loc.timezone, 12);
    const all = await computeInWorker(from.getTime(), to.getTime(), loc, opts);
    const results = all.filter((o) => !MONTHLY_KEYS.has(o.key));
    await putFestivalsCached(key, results);
    return results;
  }

  let occurrences = $state<FestivalOccurrence[]>([]);
  let loading = $state(false);

  $effect(() => {
    if (!parsedYear || !preferences.location || !preferences.hydrated) {
      occurrences = [];
      loading = false;
      return;
    }
    const year = parsedYear;
    const loc = preferences.location;
    const opts = { ayanamsa: preferences.ayanamsa, monthSystem: preferences.monthSystem };
    let cancelled = false;
    loading = true;
    loadFestivals(year, loc, opts)
      .then((results) => {
        if (!cancelled) occurrences = results;
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
      <div class="loading" role="status" aria-live="polite">
        <span class="spinner" aria-hidden="true"></span>
        <span class="muted">{tr('fest.computing')}</span>
      </div>
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
  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 44px 0;
  }
  .spinner {
    width: 22px;
    height: 22px;
    border: 2.5px solid var(--line);
    border-top-color: var(--red);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation-duration: 2s;
    }
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
