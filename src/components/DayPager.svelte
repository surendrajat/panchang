<script lang="ts">
  // Inline day pager rendered above a Day/Today panchanga.
  //
  // Three modes:
  //  - On today: shows `‹ Yesterday | TODAY (label) | Tomorrow ›`.
  //  - On a different day: shows `‹ Previous | <date> | Today (jump) | Next ›`,
  //    where the date label IS the focus and the "Today" pill jumps back
  //    to the current calendar day.
  //
  // YMD strings are emitted in the location's tz to avoid the UTC-slice
  // off-by-one (see lib/format/time.ts: localYMD).

  import { preferences } from '$lib/state/preferences.svelte';
  import { localYMD } from '$lib/format/time';
  import { applyNumerals } from '$lib/format/numerals';
  import { t, type TranslationKey, localeMetaOf } from '$lib/i18n';
  import { MS_PER_DAY } from '$lib/astro';

  const tr = (k: TranslationKey, vars?: Record<string, string | number>) =>
    t(k, vars, preferences.language);
  const num = (s: string) => applyNumerals(s, preferences.numerals);

  interface Props {
    // YYYY-MM-DD currently displayed (always in the location's tz).
    currentYMD: string;
    // The civil date as a Date object — used for the long label
    // ("Thursday, 21 May 2026") rendered between the arrows.
    currentDate: Date;
  }
  let { currentYMD, currentDate }: Props = $props();

  const tz = $derived(preferences.location?.timezone ?? 'UTC');
  const todayYMD = $derived(localYMD(new Date(), tz));
  const isToday = $derived(currentYMD === todayYMD);

  function shiftYMD(delta: number): string {
    // Walk by ±1 day in the location's tz. We rebuild from `currentYMD`
    // via Date.UTC at noon and then re-format in tz so DST changes don't
    // bite. (Same convention as Day.svelte's shift helper.)
    const m = currentYMD.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return currentYMD;
    const base = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0));
    const next = new Date(base.getTime() + delta * MS_PER_DAY);
    return localYMD(next, tz);
  }

  const prevYMD = $derived(shiftYMD(-1));
  const nextYMD = $derived(shiftYMD(1));

  // Pull the BCP-47 locale tag from the central locale-meta table —
  // adding Tamil/Telugu/etc. doesn't require editing this component.
  const localeTag = $derived(localeMetaOf(preferences.language).intlLocale);

  // Date-picker: a hidden <input type="date"> is triggered programmatically
  // so we get the native picker UI on every platform while keeping full
  // control over placement and styling of the trigger button.
  let dateInput = $state<HTMLInputElement | null>(null);

  function openDatePicker() {
    if (!dateInput) return;
    // showPicker() is the modern API; fall back to click() for older browsers.
    if (typeof dateInput.showPicker === 'function') {
      dateInput.showPicker();
    } else {
      dateInput.click();
    }
  }

  function onDatePick(e: Event) {
    const value = (e.target as HTMLInputElement).value; // YYYY-MM-DD
    if (!value) return;
    window.location.hash = dayHref(value);
  }

  function dateLabel(): string {
    return new Intl.DateTimeFormat(localeTag, {
      timeZone: tz,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(currentDate);
  }

  // Compact label for narrow screens. The weekday always abbreviates.
  // Month format is locale-aware: Hindi month names (मई, जून, अगस्त…)
  // are already compact so they stay full; English uses the short form
  // to prevent overflow on narrow phones (Sep vs September).
  function compactDateLabel(): string {
    const month = preferences.language === 'hi' ? ('long' as const) : ('short' as const);
    return new Intl.DateTimeFormat(localeTag, {
      timeZone: tz,
      weekday: 'short',
      day: 'numeric',
      month,
      year: 'numeric',
    }).format(currentDate);
  }

  function shortDateLabel(ymd: string): string {
    const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return ymd;
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0));
    return new Intl.DateTimeFormat(localeTag, {
      timeZone: tz,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(d);
  }

  // For the "Day" tab semantic to stay clean we use #/ for today and
  // #/day/<ymd> for any other day.
  function dayHref(ymd: string): string {
    return ymd === todayYMD ? '#/' : `#/day/${ymd}`;
  }
</script>

<nav class="pager" aria-label="Day navigation">
  <a class="pager__arrow" href={dayHref(prevYMD)} aria-label={tr('nav.previousDay')}>
    <svg
      class="pager__chev"
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

  <div class="pager__center">
    <div class="pager__date-row">
      <span class="pager__date pager__date--full">{num(dateLabel())}</span>
      <span class="pager__date pager__date--compact" aria-hidden="true"
        >{num(compactDateLabel())}</span
      >
      <button
        class="pager__pick"
        onclick={openDatePicker}
        aria-label={tr('pager.pickDate')}
        title={tr('pager.pickDate')}
        type="button"
      >
        <!-- Calendar icon (Lucide-style) -->
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <circle cx="12" cy="15" r="1" fill="currentColor" stroke="none" />
        </svg>
      </button>
      <!-- Hidden native date input — triggered by the button above -->
      <input
        bind:this={dateInput}
        type="date"
        class="pager__pick-input"
        value={currentYMD}
        onchange={onDatePick}
        aria-hidden="true"
        tabindex="-1"
      />
    </div>
    {#if !isToday}
      <a class="pager__today" href="#/">{tr('pager.jumpToToday')}</a>
    {/if}
  </div>

  <a
    class="pager__arrow pager__arrow--right"
    href={dayHref(nextYMD)}
    aria-label={tr('nav.nextDay')}
  >
    <svg
      class="pager__chev"
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
</nav>

<style>
  .pager {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    margin-bottom: var(--space-5);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--paper-2);
  }
  .pager__arrow {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--red);
    text-decoration: none;
    width: 44px;
    height: 44px;
    border-radius: var(--radius-pill);
    transition:
      background 0.15s,
      color 0.15s;
  }
  .pager__arrow--right {
    justify-self: end;
  }
  .pager__arrow:hover {
    color: var(--ink);
    background: var(--paper-3);
    text-decoration: none;
  }
  .pager__chev {
    width: 18px;
    height: 18px;
  }
  .pager__center {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    min-width: 0;
  }
  .pager__date-row {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    max-width: 100%;
  }
  .pager__date {
    font-family: var(--font-serif);
    font-size: 15px;
    font-weight: 600;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    min-width: 0;
  }
  .pager__date--compact {
    display: none;
  }
  .pager__pick {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--ink-soft);
    background: none;
    border: none;
    cursor: pointer;
    padding: 3px;
    border-radius: var(--radius-sm);
    transition:
      background 0.15s,
      color 0.15s;
    line-height: 0;
    flex-shrink: 0;
  }
  .pager__pick:hover {
    color: var(--red);
    background: color-mix(in srgb, var(--red) 10%, var(--paper-2));
  }
  .pager__pick svg {
    width: 14px;
    height: 14px;
  }
  /* Hidden native date input — visually invisible, opened programmatically */
  .pager__pick-input {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
    opacity: 0;
    pointer-events: none;
  }
  .pager__today {
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--red);
    font-weight: 700;
    text-decoration: none;
    padding: 2px 8px;
    border: 1px solid color-mix(in srgb, var(--red) 40%, var(--line));
    border-radius: var(--radius-pill);
    background: color-mix(in srgb, var(--red) 8%, var(--paper-2));
    transition: background 0.15s;
  }
  .pager__today:hover {
    background: color-mix(in srgb, var(--red) 18%, var(--paper-2));
    text-decoration: none;
  }
  @media (max-width: 460px) {
    .pager {
      grid-template-columns: auto 1fr auto;
    }
    .pager__date--full {
      display: none;
    }
    .pager__date--compact {
      display: inline;
    }
  }
</style>
