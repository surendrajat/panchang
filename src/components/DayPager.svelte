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
    const next = new Date(base.getTime() + delta * 86_400_000);
    return localYMD(next, tz);
  }

  const prevYMD = $derived(shiftYMD(-1));
  const nextYMD = $derived(shiftYMD(1));

  // Pull the BCP-47 locale tag from the central locale-meta table —
  // adding Tamil/Telugu/etc. doesn't require editing this component.
  const localeTag = $derived(localeMetaOf(preferences.language).intlLocale);

  function dateLabel(): string {
    return new Intl.DateTimeFormat(localeTag, {
      timeZone: tz,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
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
    <div class="pager__date">{num(dateLabel())}</div>
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
    width: 36px;
    height: 36px;
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
  }
  .pager__date {
    font-family: var(--font-serif);
    font-size: 15px;
    font-weight: 600;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
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
  }
</style>
