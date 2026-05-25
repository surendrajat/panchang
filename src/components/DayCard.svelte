<script lang="ts">
  import type { Panchanga } from '$lib/panchanga';
  import { PAN_INDIA_FESTIVALS } from '$lib/panchanga';
  import { formatTime } from '$lib/format/time';
  import { applyNumerals, renderNumber } from '$lib/format/numerals';
  import { preferences } from '$lib/state/preferences.svelte';
  import {
    t,
    type TranslationKey,
    tithiNameByIndex,
    masaNameByIndex,
    samvatsaraNameByIndex,
    localeMetaOf,
  } from '$lib/i18n';
  import { SAMVATSARA_NAMES } from '$lib/panchanga/names';
  import MoonPhase from './MoonPhase.svelte';
  import PanchangaTable from './PanchangaTable.svelte';
  import TimingIcon from './TimingIcon.svelte';

  interface Props {
    panchanga: Panchanga;
  }
  let { panchanga }: Props = $props();

  const tz = $derived(panchanga.location.timezone);
  const sunrise = $derived(panchanga.sunrise);

  // Component-local helpers that read `preferences` reactively so the
  // rendered strings re-flow when the user switches language or
  // numeral system.
  const tr = (k: TranslationKey, vars?: Record<string, string | number>) =>
    t(k, vars, preferences.language);
  const num = (s: string) => applyNumerals(s, preferences.numerals);

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
  const MOON_PHASE_KEYS: Record<string, TranslationKey> = {
    'New Moon': 'moonPhase.new',
    'Waxing Crescent': 'moonPhase.waxingCrescent',
    'First Quarter': 'moonPhase.firstQuarter',
    'Waxing Gibbous': 'moonPhase.waxingGibbous',
    'Full Moon': 'moonPhase.full',
    'Waning Gibbous': 'moonPhase.waningGibbous',
    'Last Quarter': 'moonPhase.lastQuarter',
    'Waning Crescent': 'moonPhase.waningCrescent',
  };
  const RITU_KEYS: Record<string, TranslationKey> = {
    vasanta: 'ritu.vasanta',
    grishma: 'ritu.grishma',
    varsha: 'ritu.varsha',
    sharad: 'ritu.sharad',
    hemanta: 'ritu.hemanta',
    shishira: 'ritu.shishira',
  };

  // Hindi mode prefers each festival rule's `displayNameHi`, falling
  // back to the English `displayName` when no Hindi label is provided.
  const festivalNames = $derived(
    panchanga.festivals
      .map((key) => {
        const r = PAN_INDIA_FESTIVALS.find((f) => f.key === key);
        if (!r) return key;
        return preferences.language === 'hi' && r.displayNameHi ? r.displayNameHi : r.displayName;
      })
      .filter((x): x is string => !!x),
  );

  // Festival ribbon shows named festivals first, falling back to
  // observances (Purnima, Amavasya, Ekadashi) if there's nothing else.
  const ribbonFestival = $derived.by(() => {
    const named = panchanga.festivals.filter(
      (k) =>
        ![
          'ekadashi',
          'pradosh',
          'sankashti_chaturthi',
          'purnima',
          'amavasya',
          'masik_shivaratri',
        ].includes(k),
    );
    const key = named[0] ?? panchanga.festivals[0];
    if (!key) return null;
    const r = PAN_INDIA_FESTIVALS.find((f) => f.key === key);
    if (!r) return key;
    return preferences.language === 'hi' && r.displayNameHi ? r.displayNameHi : r.displayName;
  });

  function gregLine(): string {
    // Locale tag and weekday-duplication behavior come from the i18n
    // meta table, not a `language === 'hi'` branch. Adding a new
    // language (Tamil/Telugu/Bangla) is a META entry + translations.
    const meta = localeMetaOf(preferences.language);
    const fmt = new Intl.DateTimeFormat(meta.intlLocale, {
      timeZone: tz,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const date = fmt.format(panchanga.date);
    if (meta.weekdayInLongDate) {
      // The Intl-formatted date already includes the weekday in this
      // language's script, which IS the vara. Skip the suffix to
      // avoid "गुरुवार, 21 मई 2026 · गुरुवार".
      return num(date);
    }
    const idx = VARA_INDEX[panchanga.vara] ?? 0;
    const varaSanskrit = tr(VARA_KEYS[idx]);
    return num(date) + ' · ' + varaSanskrit;
  }

  function tithiEndsAtLabel(): string {
    if (!sunrise) return '';
    return num(formatTime(panchanga.tithi.endTime, tz, '24h', sunrise));
  }

  // Localized tithi name for the current day — used as both the hero
  // tithi name and as input to the "ends X · then Y" line.
  const tithiName = $derived(tithiNameByIndex(panchanga.tithi.index, preferences.language));
  const masaName = $derived(masaNameByIndex(panchanga.masa.index, preferences.language));

  function nextTithiName(): string {
    const next = (panchanga.tithi.index % 30) + 1;
    return tithiNameByIndex(next, preferences.language);
  }

  // Build muhurta items only if both sunrise and sunset are real (i.e.,
  // the day isn't polar-night).
  const hasDaylight = $derived(panchanga.sunrise !== null && panchanga.sunset !== null);
  interface MuhurtaRow {
    labelKey: TranslationKey;
    subKey: TranslationKey;
    interval: { start: Date; end: Date };
    tone: 'bad' | 'good';
  }
  const muhurtaItems = $derived.by<MuhurtaRow[]>(() => {
    if (!hasDaylight) return [];
    const m = panchanga.muhurta;
    // Order chronologically through the day so the table reads
    // top-to-bottom as sunrise → night.
    const rows: MuhurtaRow[] = [
      {
        labelKey: 'muhurta.brahmaMuhurta',
        subKey: 'muhurta.preDawn',
        interval: m.brahmaMuhurta,
        tone: 'good',
      },
      {
        labelKey: 'muhurta.pratahSandhya',
        subKey: 'muhurta.twilight',
        interval: m.pratahSandhya,
        tone: 'good',
      },
      {
        labelKey: 'muhurta.rahuKaal',
        subKey: 'muhurta.inauspicious',
        interval: m.rahuKaal,
        tone: 'bad',
      },
      {
        labelKey: 'muhurta.yamaganda',
        subKey: 'muhurta.inauspicious',
        interval: m.yamaganda,
        tone: 'bad',
      },
      {
        labelKey: 'muhurta.gulika',
        subKey: 'muhurta.inauspicious',
        interval: m.gulika,
        tone: 'bad',
      },
    ];
    if (m.abhijit) {
      rows.push({
        labelKey: 'muhurta.abhijit',
        subKey: 'muhurta.auspicious',
        interval: m.abhijit,
        tone: 'good',
      });
    }
    rows.push(
      {
        labelKey: 'muhurta.vijayaMuhurta',
        subKey: 'muhurta.afternoon',
        interval: m.vijayaMuhurta,
        tone: 'good',
      },
      { labelKey: 'muhurta.godhuli', subKey: 'muhurta.sunset', interval: m.godhuli, tone: 'good' },
      {
        labelKey: 'muhurta.sayahnaSandhya',
        subKey: 'muhurta.twilight',
        interval: m.sayahnaSandhya,
        tone: 'good',
      },
      {
        labelKey: 'muhurta.nishitaKaal',
        subKey: 'muhurta.night',
        interval: m.nishitaKaal,
        tone: 'good',
      },
    );
    // Sort by start time so muhurtas read chronologically regardless
    // of how Brahma's pre-sunrise window relates to the previous row.
    rows.sort((a, b) => a.interval.start.getTime() - b.interval.start.getTime());
    return rows;
  });

  function fmtRange(start: Date, end: Date): string {
    const a = formatTime(start, tz, '24h', sunrise);
    const b = formatTime(end, tz, '24h', sunrise);
    return num(`${a}–${b}`);
  }

  function fmtTime(d: Date | null): string {
    if (!d) return '—';
    return num(formatTime(d, tz, '24h'));
  }
</script>

<article class="day-card stagger">
  <!-- HERO: tithi name + meta + moon -->
  <div class="hero">
    <div class="hero__text">
      <div class="kicker">
        {panchanga.paksha === 'shukla' ? tr('paksha.shukla') : tr('paksha.krishna')} · {masaName}
        {#if panchanga.masa.isAdhika}<span class="badge">{tr('masa.adhika')}</span>{/if}
        {#if panchanga.masa.isKshaya}<span class="badge">{tr('masa.kshaya')}</span>{/if}
        <span class="kicker__system" title="Lunar-month convention"
          >· {panchanga.masa.system === 'purnimanta'
            ? tr('system.purnimanta')
            : tr('system.amanta')}</span
        >
      </div>
      <div class="tithi-name">
        {tithiName}
        <!-- Tiny number-in-brackets after the hero tithi name — gives
             readers a quick handle on "where am I in the lunar
             month" (1..15 within a paksha). -->
        <span class="tithi-name__num num">({num(String(panchanga.tithi.number))})</span>
      </div>
      {#if sunrise}
        <div class="tithi-meta">
          {tr('tithi.endsBefore')}<b class="num">{tithiEndsAtLabel()}</b>{tr('tithi.endsAfter')} ·
          {tr('tithi.then')}
          {nextTithiName()}
        </div>
      {/if}
      <div class="greg num">{gregLine()}</div>
    </div>
    <div class="hero__moon">
      <MoonPhase
        illumination={panchanga.moonPhase.illumination}
        phaseAngle={panchanga.moonPhase.phaseAngle}
        phaseName={panchanga.moonPhase.phaseName}
        size={104}
      />
      <div class="moon-pct num">
        {tr('moon.lit', {
          percent: renderNumber(
            Math.round(panchanga.moonPhase.illumination * 100),
            preferences.numerals,
          ),
        })}
      </div>
      <div class="moon-phase-name">
        {tr(MOON_PHASE_KEYS[panchanga.moonPhase.phaseName] ?? 'moonPhase.new')}
      </div>
    </div>
  </div>

  <!-- TIMINGS strip — a shared icon family keeps rise/set readable at a
       glance without depending on font fallback glyphs. -->
  <div class="timings">
    <div class="t">
      <div class="ic ic--sun"><TimingIcon type="sunrise" /></div>
      <div class="lab">{tr('timing.sunrise')}</div>
      <div class="val num">{fmtTime(panchanga.sunrise)}</div>
    </div>
    <div class="t">
      <div class="ic ic--sun"><TimingIcon type="sunset" /></div>
      <div class="lab">{tr('timing.sunset')}</div>
      <div class="val num">{fmtTime(panchanga.sunset)}</div>
    </div>
    <div class="t">
      <div class="ic ic--moon"><TimingIcon type="moonrise" /></div>
      <div class="lab">{tr('timing.moonrise')}</div>
      <div class="val num">{fmtTime(panchanga.moonrise)}</div>
    </div>
    <div class="t">
      <div class="ic ic--moon"><TimingIcon type="moonset" /></div>
      <div class="lab">{tr('timing.moonset')}</div>
      <div class="val num">{fmtTime(panchanga.moonset)}</div>
    </div>
  </div>

  <!-- ANGAS -->
  <div>
    <div class="sec-head">
      <h2>{tr('section.panchanga')}</h2>
      <span class="deva-sm">{tr('kicker.panchanga')}</span>
      <span class="fill"></span>
    </div>
    <PanchangaTable {panchanga} />
  </div>

  <!-- MUHURTA -->
  {#if muhurtaItems.length > 0}
    <div>
      <div class="sec-head">
        <h2>{tr('section.muhurta')}</h2>
        <span class="deva-sm">{tr('kicker.muhurta')}</span>
        <span class="fill"></span>
      </div>
      <div class="muhurta">
        {#each muhurtaItems as item (item.labelKey)}
          <div class="m m--{item.tone}">
            <div class="lab">
              {tr(item.labelKey)}
              <small>{tr(item.subKey)}</small>
            </div>
            <div class="tm num">{fmtRange(item.interval.start, item.interval.end)}</div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- SAMVAT details -->
  <div>
    <div class="sec-head">
      <h2>{tr('section.year')}</h2>
      <span class="deva-sm">{tr('kicker.year')}</span>
      <span class="fill"></span>
    </div>
    <ul class="samvat">
      <li>
        <span class="muted">{tr('year.vikrama')}</span>
        <b class="num">{renderNumber(panchanga.samvat.vikrama, preferences.numerals)}</b>
        {#if panchanga.samvat.yearName}
          {@const idx = SAMVATSARA_NAMES.indexOf(panchanga.samvat.yearName)}
          <span class="muted"
            >· {idx >= 0
              ? samvatsaraNameByIndex(idx, preferences.language)
              : panchanga.samvat.yearName}</span
          >
        {/if}
      </li>
      <li>
        <span class="muted">{tr('year.shaka')}</span>
        <b class="num">{renderNumber(panchanga.samvat.shaka, preferences.numerals)}</b>
      </li>
      <li>
        <span class="muted">{tr('year.kali')}</span>
        <b class="num">{renderNumber(panchanga.samvat.kali, preferences.numerals)}</b>
      </li>
      <li>
        <span class="muted">{tr('year.ritu')}</span>
        <b>{tr(RITU_KEYS[panchanga.ritu] ?? 'ritu.vasanta')}</b>
      </li>
      <li>
        <span class="muted">{tr('year.ayana')}</span>
        <b>{panchanga.ayana === 'uttarayana' ? tr('year.uttarayana') : tr('year.dakshinayana')}</b>
      </li>
    </ul>
  </div>

  {#if ribbonFestival}
    <div class="fest" role="note">
      <span class="star" aria-hidden="true">
        <!-- Lotus-style 8-petal flower — replaces the generic ✦ glyph
             with something rooted in Indian iconography. Two layers
             of four petals each, offset by 45°, around a central seed. -->
        <svg
          viewBox="0 0 32 32"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linejoin="round"
        >
          <path
            d="M16 4c2.2 4 2.2 8 0 12-2.2-4-2.2-8 0-12z"
            fill="currentColor"
            fill-opacity="0.22"
          />
          <path
            d="M16 28c-2.2-4-2.2-8 0-12 2.2 4 2.2 8 0 12z"
            fill="currentColor"
            fill-opacity="0.22"
          />
          <path
            d="M4 16c4-2.2 8-2.2 12 0-4 2.2-8 2.2-12 0z"
            fill="currentColor"
            fill-opacity="0.22"
          />
          <path
            d="M28 16c-4 2.2-8 2.2-12 0 4-2.2 8-2.2 12 0z"
            fill="currentColor"
            fill-opacity="0.22"
          />
          <path
            d="M7.5 7.5c3.3 1.4 6.1 4.3 7.5 7.5-3.3-1.4-6.1-4.3-7.5-7.5z"
            fill="currentColor"
            fill-opacity="0.12"
          />
          <path
            d="M24.5 24.5c-3.3-1.4-6.1-4.3-7.5-7.5 3.3 1.4 6.1 4.3 7.5 7.5z"
            fill="currentColor"
            fill-opacity="0.12"
          />
          <path
            d="M24.5 7.5c-1.4 3.3-4.3 6.1-7.5 7.5 1.4-3.3 4.3-6.1 7.5-7.5z"
            fill="currentColor"
            fill-opacity="0.12"
          />
          <path
            d="M7.5 24.5c1.4-3.3 4.3-6.1 7.5-7.5-1.4 3.3-4.3 6.1-7.5 7.5z"
            fill="currentColor"
            fill-opacity="0.12"
          />
          <circle cx="16" cy="16" r="2.2" fill="currentColor" />
        </svg>
      </span>
      <div class="ftext">
        <div class="fl">
          {festivalNames.length > 1 ? tr('fest.todayLabelMulti') : tr('fest.todayLabel')}
        </div>
        <div class="fn">{festivalNames.join(' · ')}</div>
      </div>
    </div>
  {/if}
</article>

<style>
  .day-card {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .day-card > * + * {
    margin-top: 6px;
  }

  /* ── hero ── */
  .hero {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 22px;
    align-items: center;
    margin-bottom: 8px;
  }
  .hero__text {
    min-width: 0;
  }
  .tithi-name__num {
    font-family: var(--font-serif);
    font-size: 0.4em;
    font-weight: 500;
    color: var(--ink-soft);
    margin-left: 2px;
    /* Align to the bottom of the hero word's descender line */
    vertical-align: text-bottom;
    letter-spacing: 0;
  }
  .badge {
    display: inline-block;
    margin-left: 6px;
    padding: 1px 8px;
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background: color-mix(in srgb, var(--gold) 22%, var(--paper-2));
    color: var(--gold);
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--gold) 35%, var(--line));
    vertical-align: 2px;
  }
  .kicker__system {
    margin-left: 6px;
    color: var(--ink-faint);
    text-transform: none;
    letter-spacing: 0.02em;
    font-weight: 600;
    font-size: 0.85em;
  }
  .tithi-name {
    font-family: var(--font-serif);
    font-optical-sizing: auto;
    font-size: clamp(34px, 8vw, 50px);
    font-weight: 600;
    line-height: 1.02;
    letter-spacing: -0.015em;
    color: var(--ink);
    margin-top: 6px;
  }
  /* Illuminated first letter in red — small print-tradition flourish.
     The letter scales naturally with the title since it inherits all
     properties except color/weight; only the size is bumped a touch.
     Browsers respect ::first-letter for inline-block + block elements. */
  .tithi-name::first-letter {
    color: var(--red);
    font-weight: 700;
    font-size: 1.12em;
    line-height: 1;
  }
  .tithi-meta {
    margin-top: 8px;
    font-size: 15px;
    color: var(--ink-soft);
    font-weight: 500;
  }
  .tithi-meta b {
    color: var(--ink);
    font-weight: 600;
  }
  .greg {
    margin-top: 12px;
    font-size: 13.5px;
    color: var(--ink-soft);
  }

  .hero__moon {
    text-align: center;
  }
  .moon-pct {
    font-family: var(--font-serif);
    font-size: 15px;
    font-weight: 500;
    margin-top: 8px;
    color: var(--ink);
  }
  .moon-phase-name {
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-soft);
    font-weight: 600;
  }

  /* ── timings ── */
  .timings {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    margin: 14px 0 4px;
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
  }
  .t {
    text-align: center;
    padding: 14px 6px;
    border-right: 1px solid var(--line-2);
  }
  .t:last-child {
    border-right: none;
  }
  .ic {
    color: var(--gold);
    margin: 0 auto 5px;
    width: 30px;
    height: 30px;
    opacity: 0.96;
  }
  .ic--sun {
    color: var(--red);
  }
  .ic--moon {
    color: var(--indigo);
  }
  .lab {
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink-soft);
    font-weight: 600;
  }
  .val {
    font-family: var(--font-serif);
    font-size: 19px;
    font-weight: 500;
    margin-top: 2px;
  }

  /* ── muhurta ── */
  .muhurta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2px;
    background: var(--line);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    overflow: hidden;
  }
  .m {
    background: var(--paper-2);
    padding: 14px 16px;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
    position: relative;
  }
  .m::before {
    /* Left rail to give the cell a clear identity. */
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: 3px;
    background: var(--rail, var(--line));
  }
  .m .lab {
    font-size: 14px;
    font-weight: 700;
    color: var(--ink);
    text-transform: none;
    letter-spacing: 0;
  }
  .m .lab small {
    display: block;
    font-size: 10.5px;
    color: var(--ink-soft);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-top: 2px;
  }
  .m .tm {
    font-family: var(--font-serif);
    font-size: 15px;
    font-weight: 500;
    color: var(--ink);
    white-space: nowrap;
  }
  /* Tile tints are kept light — the colored left rail carries the
     "good/bad" semantics; the background is just a gentle wash so the
     muhurta block doesn't read as an opaque dark slab. */
  .m--bad {
    background: color-mix(in srgb, var(--red) 7%, var(--paper-2));
    --rail: var(--red);
  }
  .m--bad .lab {
    color: var(--red-deep);
  }
  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme])) .m--bad {
      background: color-mix(in srgb, var(--red) 11%, var(--paper-2));
    }
    :global(:root:not([data-theme])) .m--bad .lab {
      color: var(--red);
    }
  }
  :global(:root[data-theme='dark']) .m--bad {
    background: color-mix(in srgb, var(--red) 11%, var(--paper-2));
  }
  :global(:root[data-theme='dark']) .m--bad .lab {
    color: var(--red);
  }
  .m--good {
    /* Auspicious window: green is the universal "safe / go" cue. */
    background: color-mix(in srgb, var(--ok) 7%, var(--paper-2));
    --rail: var(--ok);
  }
  .m--good .lab {
    color: var(--ok);
  }
  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme])) .m--good {
      background: color-mix(in srgb, var(--ok) 11%, var(--paper-2));
    }
  }
  :global(:root[data-theme='dark']) .m--good {
    background: color-mix(in srgb, var(--ok) 11%, var(--paper-2));
  }

  /* ── samvat ── */
  .samvat {
    list-style: none;
    padding: 0;
    margin: var(--space-2) 0 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px 20px;
    font-size: 14px;
  }
  .samvat li {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
  }

  /* ── festival ribbon ── */
  .fest {
    margin-top: 26px;
    border: 1.5px solid var(--red);
    border-radius: var(--radius-md);
    padding: 18px 20px;
    display: flex;
    align-items: center;
    gap: 14px;
    background: linear-gradient(
      to right,
      color-mix(in srgb, var(--red) 16%, var(--paper)),
      color-mix(in srgb, var(--red) 8%, var(--paper)) 40%,
      color-mix(in srgb, var(--red) 8%, var(--paper))
    );
    box-shadow: 0 2px 10px color-mix(in srgb, var(--red) 14%, transparent);
  }
  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme])) .fest {
      background: linear-gradient(
        to right,
        color-mix(in srgb, var(--red) 22%, var(--paper-2)),
        color-mix(in srgb, var(--red) 12%, var(--paper-2)) 40%,
        color-mix(in srgb, var(--red) 12%, var(--paper-2))
      );
    }
  }
  :global(:root[data-theme='dark']) .fest {
    background: linear-gradient(
      to right,
      color-mix(in srgb, var(--red) 22%, var(--paper-2)),
      color-mix(in srgb, var(--red) 12%, var(--paper-2)) 40%,
      color-mix(in srgb, var(--red) 12%, var(--paper-2))
    );
  }
  .fest .star {
    color: var(--red);
    width: 26px;
    height: 26px;
    flex: none;
  }
  .fest .star svg {
    width: 100%;
    height: 100%;
  }
  .ftext {
    flex: 1;
  }
  .fl {
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--red);
    font-weight: 700;
  }
  .fn {
    font-family: var(--font-serif);
    font-size: 22px;
    font-weight: 600;
    margin-top: 1px;
    color: var(--ink);
  }

  @media (max-width: 460px) {
    .hero {
      grid-template-columns: 1fr;
    }
    .hero__moon {
      justify-self: start;
    }
    .timings {
      grid-template-columns: repeat(2, 1fr);
    }
    .t:nth-child(2) {
      border-right: none;
    }
    .muhurta {
      grid-template-columns: 1fr;
    }
  }
</style>
