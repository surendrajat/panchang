<script lang="ts">
  import type { Panchanga } from '$lib/panchanga';
  import { formatTime } from '$lib/format/time';
  import { applyNumerals, renderNumber } from '$lib/format/numerals';
  import { preferences } from '$lib/state/preferences.svelte';
  import {
    t,
    type TranslationKey,
    tithiNameByIndex,
    nakshatraNameByIndex,
    yogaNameByIndex,
    karanaNameByPosition,
    localeMetaOf,
  } from '$lib/i18n';

  interface Props {
    panchanga: Panchanga;
  }
  let { panchanga }: Props = $props();

  const tz = $derived(panchanga.location.timezone);
  const sunrise = $derived(panchanga.sunrise);

  const tr = (k: TranslationKey, vars?: Record<string, string | number>) =>
    t(k, vars, preferences.language);

  const VARA_KEYS = [
    'vara.sunday',
    'vara.monday',
    'vara.tuesday',
    'vara.wednesday',
    'vara.thursday',
    'vara.friday',
    'vara.saturday',
  ] as const;
  const VARA_INDEX: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  // Anga rows. All Sanskrit names go through the i18n indexed lookups
  // so they render in Devanagari when the active language is Hindi.
  const rows = $derived([
    {
      labelKey: 'anga.tithi' as const,
      value: `${panchanga.paksha === 'shukla' ? tr('paksha.shukla').replace(' Paksha', '').replace(' पक्ष', '') : tr('paksha.krishna').replace(' Paksha', '').replace(' पक्ष', '')} ${tithiNameByIndex(panchanga.tithi.index, preferences.language)}`,
      endsAt: panchanga.tithi.endTime,
    },
    {
      labelKey: 'anga.nakshatra' as const,
      value: `${nakshatraNameByIndex(panchanga.nakshatra.index, preferences.language)} (${tr('anga.pada')} ${renderNumber(panchanga.nakshatra.pada, preferences.numerals)})`,
      endsAt: panchanga.nakshatra.endTime,
    },
    {
      labelKey: 'anga.yoga' as const,
      value: yogaNameByIndex(panchanga.yoga.index, preferences.language),
      endsAt: panchanga.yoga.endTime,
    },
    // Karana — a panchanga day spans 2-3 karanas (each ~12 h). Show
    // the full sequence joined with " · ". The end time of the LAST
    // karana in the day is the one users care about.
    {
      labelKey: 'anga.karana' as const,
      value: panchanga.karanas
        .map((k) => karanaNameByPosition(k.positionInCycle, preferences.language))
        .join(' · '),
      endsAt: panchanga.karanas[panchanga.karanas.length - 1].endTime,
    },
    {
      labelKey: 'anga.vara' as const,
      value: tr(VARA_KEYS[VARA_INDEX[panchanga.vara] ?? 0]),
      endsAt: null as Date | null,
    },
  ]);

  function num(text: string): string {
    return applyNumerals(text, preferences.numerals);
  }
</script>

<div class="anga-table">
  {#each rows as row (row.labelKey)}
    <div class="anga-row">
      <div class="name">
        <small>{tr(row.labelKey)}</small>
        {row.value}
      </div>
      <div class="lead" aria-hidden="true"></div>
      <div class="end">
        {#if row.endsAt}
          <!-- Order driven by the locale-meta's `uptoOrder` so no
               component branches on language identity. -->
          {#if localeMetaOf(preferences.language).uptoOrder === 'postfix'}
            <b class="num"
              ><time datetime={row.endsAt.toISOString()}
                >{num(formatTime(row.endsAt, tz, preferences.timeFormat, sunrise))}</time
              ></b
            >
            {tr('tithi.upto')}
          {:else}
            {tr('tithi.upto')}
            <b class="num"
              ><time datetime={row.endsAt.toISOString()}
                >{num(formatTime(row.endsAt, tz, preferences.timeFormat, sunrise))}</time
              ></b
            >
          {/if}
        {:else}
          {tr('tithi.allDay')}
        {/if}
      </div>
    </div>
  {/each}
</div>

<style>
  .anga-table {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .anga-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 9px 2px;
  }
  .name {
    font-weight: 600;
    font-size: 15.5px;
    color: var(--ink);
    display: flex;
    flex-direction: column;
  }
  .name small {
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--red);
    font-weight: 700;
  }
  .lead {
    flex: 1;
    border-bottom: 1.5px dotted var(--line);
    position: relative;
    top: -4px;
    min-width: 24px;
  }
  .end {
    font-family: var(--font-serif);
    font-size: 15px;
    font-weight: 500;
    color: var(--ink-soft);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .end b {
    color: var(--ink);
    font-weight: 600;
  }
</style>
