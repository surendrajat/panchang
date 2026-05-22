<script lang="ts">
  import MonthGrid from '$components/MonthGrid.svelte';
  import { computeMonth } from '$lib/panchanga';
  import { preferences } from '$lib/state/preferences.svelte';
  import { applyNumerals } from '$lib/format/numerals';
  import { t, type TranslationKey, masaNameByIndex, localeMetaOf } from '$lib/i18n';

  const tr = (k: TranslationKey, vars?: Record<string, string | number>) =>
    t(k, vars, preferences.language);
  const num = (s: string) => applyNumerals(s, preferences.numerals);

  interface Props {
    yyyymm: string;
  }
  let { yyyymm }: Props = $props();

  const parsed = $derived.by(() => {
    const m = yyyymm.match(/^(\d{4})-(\d{2})$/);
    if (!m) return null;
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (month < 1 || month > 12) return null;
    return { year, month };
  });

  const days = $derived.by(() => {
    if (!parsed || !preferences.location || !preferences.hydrated) return [];
    return computeMonth(parsed.year, parsed.month, preferences.location, {
      ayanamsa: preferences.ayanamsa,
      monthSystem: preferences.monthSystem,
    });
  });

  function adjacentMonth(delta: number): string {
    if (!parsed) return yyyymm;
    let y = parsed.year;
    let m = parsed.month + delta;
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    while (m > 12) {
      m -= 12;
      y += 1;
    }
    return `${y}-${String(m).padStart(2, '0')}`;
  }

  function handleSelect(d: Date): void {
    // `d` is local-midnight-as-UTC for the picked day, in the location
    // tz. Localize to YYYY-MM-DD in that same tz so URL matches the
    // displayed day (see lib/format/time.ts: localYMD).
    if (!preferences.location) return;
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: preferences.location.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    location.hash = `/day/${fmt.format(d)}`;
  }

  function monthLabel(): string {
    if (!parsed) return yyyymm;
    const label = new Intl.DateTimeFormat(localeMetaOf(preferences.language).intlLocale, {
      year: 'numeric',
      month: 'long',
    }).format(new Date(Date.UTC(parsed.year, parsed.month - 1, 1)));
    return num(label);
  }

  function lunarLabel(): string {
    if (days.length === 0) return '';
    const lang = preferences.language;
    const first = masaNameByIndex(days[0].masa.index, lang);
    const last = masaNameByIndex(days[days.length - 1].masa.index, lang);
    const samvat = `${tr('masthead.vikram')} ${num(String(days[0].samvat.vikrama))}`;
    const system =
      days[0].masa.system === 'purnimanta' ? tr('system.purnimanta') : tr('system.amanta');
    const masaPart = first === last ? first : `${first}–${last}`;
    return `${masaPart} · ${system} · ${samvat}`;
  }
</script>

<section class="view stack">
  {#if parsed}
    <header class="month-head">
      <div class="mtitle">
        {monthLabel()}
        <small>{lunarLabel()}</small>
      </div>
      <div class="arrows">
        <a
          class="icon-btn icon-btn--link icon-btn--chev"
          href={'#/month/' + adjacentMonth(-1)}
          aria-label={tr('nav.prevMonth')}
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
          href={'#/month/' + adjacentMonth(1)}
          aria-label={tr('nav.nextMonth')}
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
    {#if days.length > 0}
      <MonthGrid
        {days}
        weekStart={preferences.weekStart}
        year={parsed.year}
        month={parsed.month}
        onSelectDay={handleSelect}
      />
    {:else}
      <p class="muted">{tr('month.computing')}</p>
    {/if}
  {:else}
    <p class="muted">{tr('month.invalid', { value: yyyymm })}</p>
  {/if}
</section>

<style>
  .month-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    gap: 12px;
  }
  .mtitle {
    font-family: var(--font-serif);
    font-size: 26px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .mtitle small {
    display: block;
    font-size: 13px;
    color: var(--red);
    font-weight: 500;
    letter-spacing: 0.04em;
    margin-top: 2px;
  }
  .arrows {
    display: flex;
    gap: 6px;
  }
  .icon-btn--link {
    text-decoration: none;
  }
</style>
