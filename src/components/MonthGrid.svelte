<script lang="ts">
  import type { Panchanga } from '$lib/panchanga';
  import { PAN_INDIA_FESTIVALS, MONTHLY_OBSERVANCE_KEYS } from '$lib/panchanga';
  import { renderNumber } from '$lib/format/numerals';
  import { localYMD } from '$lib/format/time';
  import { preferences } from '$lib/state/preferences.svelte';
  import { t, type TranslationKey, tithiNameByIndex, masaNameByIndex } from '$lib/i18n';

  const tr = (k: TranslationKey) => t(k, undefined, preferences.language);

  interface Props {
    days: Panchanga[];
    weekStart: 'sunday' | 'monday';
    year: number;
    month: number; // 1..12
    onSelectDay?: (date: Date) => void;
  }
  let { days, weekStart, year, month, onSelectDay }: Props = $props();

  const todayYMD = $derived(localYMD(new Date(), preferences.location?.timezone ?? 'UTC'));

  const grid = $derived(buildGrid(days, weekStart, year, month));
  // Tied to preferences.language via tr() — Hindi swaps to रवि/सोम/etc.
  const WD_KEYS = ['wd.sun', 'wd.mon', 'wd.tue', 'wd.wed', 'wd.thu', 'wd.fri', 'wd.sat'] as const;
  const weekdayLabels = $derived(
    weekStart === 'monday'
      ? [
          tr('wd.mon'),
          tr('wd.tue'),
          tr('wd.wed'),
          tr('wd.thu'),
          tr('wd.fri'),
          tr('wd.sat'),
          tr('wd.sun'),
        ]
      : WD_KEYS.map((k) => tr(k)),
  );

  function buildGrid(
    days: Panchanga[],
    weekStart: 'sunday' | 'monday',
    year: number,
    month: number,
  ): (Panchanga | null)[] {
    if (days.length === 0) return [];
    const firstGregorianDay = new Date(Date.UTC(year, month - 1, 1));
    let leadIn = firstGregorianDay.getUTCDay();
    if (weekStart === 'monday') leadIn = (leadIn + 6) % 7;
    const cells: (Panchanga | null)[] = [];
    for (let i = 0; i < leadIn; i++) cells.push(null);
    for (const d of days) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  // Accessible name for a day cell — fully localized, so screen-reader users
  // hear the same language they see (not raw English/romanized fields).
  function cellAria(cell: Panchanga, gregYmd: string, festName: string | null): string {
    const lang = preferences.language;
    const masa = masaNameByIndex(cell.masa.index, lang);
    const paksha =
      lang === 'hi'
        ? cell.paksha === 'shukla'
          ? 'शुक्ल'
          : 'कृष्ण'
        : cell.paksha === 'shukla'
          ? 'Shukla'
          : 'Krishna';
    const tithi = tithiNameByIndex(cell.tithi.index, lang);
    let label = `${gregYmd}, ${masa} ${paksha} ${tithi}`;
    if (festName) label += `, ${festName}`;
    return label;
  }

  function displayName(key: string): string {
    const r = PAN_INDIA_FESTIVALS.find((f) => f.key === key);
    if (!r) return key;
    return preferences.language === 'hi' && r.displayNameHi ? r.displayNameHi : r.displayName;
  }

  // Short cell label for an annual festival: drop any parenthetical alternative
  // name and trim to the first two words.
  function festivalShortName(key: string): string {
    return displayName(key)
      .replace(/\s\(.*?\)/, '')
      .split(' ')
      .slice(0, 2)
      .join(' ');
  }

  // First word inside the "(Pitru Karya)" / "(Deva Karya)" parenthetical, localized.
  function amavasyaQualifier(key: string): string | undefined {
    return displayName(key).match(/\(([^\s)]+)/)?.[1]; // Pitru / Deva / पितृ / देव
  }

  // "Amavasya" with the distinguishing qualifier — the only monthly observance we
  // name on the grid. Pitru (aparahna) and Deva (udaya) karya fall on different days
  // when the tithi spans two; a single day that is BOTH shows the combined label.
  function amavasyaLabel(which: 'pitru' | 'deva' | 'both'): string {
    const base = displayName('amavasya').split(' ')[0];
    const pitru = amavasyaQualifier('amavasya');
    const deva = amavasyaQualifier('amavasya_devakarya');
    const q =
      which === 'both'
        ? deva && pitru
          ? `${deva}-${pitru}`
          : undefined
        : which === 'pitru'
          ? pitru
          : deva;
    return q ? `${base} (${q})` : base;
  }

  // The cell's named observances: ALL annual festivals that fall on the day (a few
  // dates carry two, e.g. Naraka Chaturdashi + Diwali), else the Amavasya
  // (Pitru / Deva / combined). Other monthly observances stay glyph-only (●○◆).
  // `label` is the compact cell text; `name` is the full localized name for aria.
  function cellFestivals(keys: string[]): { label: string; name: string }[] {
    const annual = keys.filter((k) => !MONTHLY_OBSERVANCE_KEYS.has(k));
    if (annual.length)
      return annual.map((k) => ({ label: festivalShortName(k), name: displayName(k) }));
    const pitru = keys.includes('amavasya');
    const deva = keys.includes('amavasya_devakarya');
    const which = pitru && deva ? 'both' : pitru ? 'pitru' : deva ? 'deva' : null;
    if (!which) return [];
    const label = amavasyaLabel(which);
    return [{ label, name: label }];
  }

  function tithiGlyph(
    p: Panchanga,
  ): { char: string; type: 'purnima' | 'amavasya' | 'ekadashi' } | null {
    if (p.tithi.index === 15) return { char: '○', type: 'purnima' }; // Full moon — bright/hollow
    if (p.tithi.index === 30) return { char: '●', type: 'amavasya' }; // New moon — dark/filled
    if (p.tithi.number === 11) return { char: '◆', type: 'ekadashi' };
    return null;
  }
</script>

<div class="calendar-scroll">
  <div class="cal" role="grid">
    {#each weekdayLabels as label, i (i)}
      <div class="dh" role="columnheader">{label}</div>
    {/each}
    {#each grid as cell, i (i)}
      {#if cell}
        {@const gregYmd = localYMD(cell.date, cell.location.timezone)}
        {@const gregDay = Number(gregYmd.slice(-2))}
        {@const fests = cellFestivals(cell.festivals)}
        {@const glyph = tithiGlyph(cell)}
        {@const isToday = gregYmd === todayYMD}
        <button
          class="cell {cell.paksha} {isToday ? 'today' : ''} {fests.length > 1 ? 'multi' : ''}"
          role="gridcell"
          type="button"
          onclick={() => onSelectDay?.(cell.date)}
          aria-label={cellAria(cell, gregYmd, fests.map((f) => f.name).join(', ') || null)}
        >
          {#if fests.length}<span class="fdot" aria-hidden="true"></span>{/if}
          <div class="gd num">{renderNumber(gregDay, preferences.numerals)}</div>
          {#each fests as f (f.label)}<div class="fname">{f.label}</div>{/each}
          <div class="tt">
            {#if glyph}<span class="glyph glyph--{glyph.type}">{glyph.char}</span>
            {/if}{tithiNameByIndex(cell.tithi.index, preferences.language)}
          </div>
        </button>
      {:else}
        <span class="cell cell--empty" role="gridcell" aria-hidden="true"></span>
      {/if}
    {/each}
  </div>
</div>
<div class="legend">
  <span><span class="sw sw--shukla"></span>{tr('legend.shuklaPaksha')}</span>
  <span><span class="sw sw--krishna"></span>{tr('legend.krishnaPaksha')}</span>
  <span><span class="dot dot--fest">●</span>{tr('legend.festival')}</span>
  <span
    ><span class="dot dot--moon">○</span>{tr('common.purnima')} ·
    <span class="dot dot--amavasya">●</span>{tr('common.amavasya')} ·
    <span class="dot dot--ekadashi">◆</span>{tr('common.ekadashi')}</span
  >
</div>

<style>
  /* Standard month grid: weekday labels across the top row, then each week is a
     row below (the markup lists the 7 headers first, so they fill row 1). On a
     phone the 7 columns are wider than the viewport, so the grid scrolls
     horizontally inside .calendar-scroll (see the media query below). */
  .cal {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 2px;
    background: var(--line);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    overflow: hidden;
    margin-top: 14px;
  }
  .dh {
    background: var(--paper);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--red);
    font-weight: 700;
    padding: 7px 4px;
  }
  .cell {
    background: var(--cell-bg, var(--paper));
    min-height: 74px;
    padding: 6px 8px 7px;
    position: relative;
    cursor: pointer;
    transition:
      background 0.15s,
      transform 0.1s;
    display: flex;
    flex-direction: column;
    text-align: left;
    color: var(--ink);
  }
  /* Days carrying more than one named festival get extra room so every name is
     visible (the grid row auto-grows to the tallest cell). */
  .cell.multi {
    min-height: 96px;
  }
  .cell:hover {
    background: color-mix(in srgb, var(--red) 4%, var(--cell-bg, var(--paper)));
  }
  .cell:active {
    transform: scale(0.99);
  }
  .cell--empty {
    /* Empty leading/trailing cells: visibly off-grid, never just black.
       Cross-hatched paper to recede without feeling broken. */
    background: var(--paper-2);
    background-image: repeating-linear-gradient(135deg, transparent 0 6px, var(--line-2) 6px 7px);
    cursor: default;
  }
  /* Light theme — saturated cream for Shukla, slight ink for Krishna. */
  .cell.shukla {
    --cell-bg: color-mix(in srgb, #fff8e3 70%, var(--paper));
  }
  .cell.krishna {
    --cell-bg: color-mix(in srgb, #2a1c10 9%, var(--paper));
  }
  /* Dark theme (system or manual) — flip: Shukla = warm-tinted lift,
     Krishna = noticeably deeper than the page. */
  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme])) .cell.shukla {
      --cell-bg: color-mix(in srgb, #d3a953 11%, var(--paper-2));
    }
    :global(:root:not([data-theme])) .cell.krishna {
      --cell-bg: color-mix(in srgb, #000 38%, var(--paper));
    }
  }
  :global(:root[data-theme='dark']) .cell.shukla {
    --cell-bg: color-mix(in srgb, #d3a953 11%, var(--paper-2));
  }
  :global(:root[data-theme='dark']) .cell.krishna {
    --cell-bg: color-mix(in srgb, #000 38%, var(--paper));
  }
  .gd {
    font-family: var(--font-serif);
    font-size: 17px;
    font-weight: 600;
    line-height: 1;
    align-self: flex-end;
    color: var(--ink);
  }
  .cell.today {
    --cell-bg: color-mix(in srgb, var(--red) 10%, var(--paper));
    box-shadow: inset 0 0 0 1.5px var(--red);
  }
  .cell.today .gd {
    color: var(--paper);
    background: var(--red);
    width: 27px;
    height: 27px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    font-size: 14px;
    box-shadow: 0 2px 6px color-mix(in srgb, var(--red) 50%, transparent);
  }
  .tt {
    font-size: 11px;
    color: var(--ink-soft);
    font-weight: 600;
    margin-top: auto;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tt .glyph {
    font-size: 13px;
    color: var(--indigo);
    margin-right: 3px;
  }
  .tt .glyph--amavasya {
    color: var(--ink);
    opacity: 0.65;
  }
  .dot--amavasya {
    color: var(--ink);
    opacity: 0.65;
  }
  .fdot {
    position: absolute;
    left: 8px;
    top: 8px;
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--red);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--red) 30%, transparent);
  }
  .fname {
    font-size: 9.5px;
    color: var(--red);
    font-weight: 700;
    line-height: 1.1;
    margin-top: 2px;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    /* wrap to up to two lines (cells are tall enough) so the name isn't cut off */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-top: 16px;
    font-size: 12px;
    color: var(--ink-soft);
  }
  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .sw {
    width: 11px;
    height: 11px;
    border-radius: 2px;
    border: 1px solid var(--line-2);
    display: inline-block;
  }
  .sw--shukla {
    background: color-mix(in srgb, #fff8e3 70%, var(--paper));
  }
  .sw--krishna {
    background: color-mix(in srgb, #2a1c10 9%, var(--paper));
  }
  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme])) .sw--shukla {
      background: color-mix(in srgb, #d3a953 11%, var(--paper-2));
    }
    :global(:root:not([data-theme])) .sw--krishna {
      background: color-mix(in srgb, #000 38%, var(--paper));
    }
  }
  :global(:root[data-theme='dark']) .sw--shukla {
    background: color-mix(in srgb, #d3a953 11%, var(--paper-2));
  }
  :global(:root[data-theme='dark']) .sw--krishna {
    background: color-mix(in srgb, #000 38%, var(--paper));
  }
  /* Full-bleed scroll: pull container to .wrap's edges (margin-inline: -18px)
     so padding-inline: 18px becomes trailing space after the grid at max scroll.
     Value must match .wrap { padding: 0 18px } in app.css. */
  .calendar-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    margin-inline: -18px;
    padding-inline: 18px;
  }
  .dot {
    font-size: 13px;
  }
  .dot--fest {
    color: var(--red);
  }
  .dot--moon {
    color: var(--indigo);
  }
  .dot--ekadashi {
    color: var(--indigo);
  }
  @media (max-width: 460px) {
    /* Fixed-width columns so festival/tithi names show in full. width: max-content
       sizes the grid to its real width (otherwise it's clamped to the viewport and
       overflow:hidden clips the right columns), so it overflows and
       .calendar-scroll scrolls horizontally instead. */
    .cal {
      grid-template-columns: repeat(7, 92px);
      width: max-content;
    }
    .gd {
      font-size: 15px;
    }
    .dh {
      padding: 0 7px;
      font-size: 10px;
    }
  }
</style>
