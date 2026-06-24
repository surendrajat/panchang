<script lang="ts">
  import { onMount } from 'svelte';
  import LocationPicker from '$components/LocationPicker.svelte';
  import KundliChart from '$components/KundliChart.svelte';
  import { preferences } from '$lib/state/preferences.svelte';
  import type { Location } from '$lib/panchanga';
  import {
    computeBirthChart,
    birthInstant,
    vimshottariMahadashas,
    antardashasOf,
    activeDashaIndex,
    nameSyllable,
    type BirthChart,
    type GrahaKey,
  } from '$lib/jyotish';
  import { nakshatraNameByIndex } from '$lib/i18n';
  import { rashiLabel, grahaLabel, ayanamsaShortLabel, nodeShortLabel } from '$lib/labels';
  import { applyNumerals } from '$lib/format/numerals';
  import {
    listBirthProfiles,
    addBirthProfile,
    deleteBirthProfile,
    type BirthProfile,
  } from '$lib/storage';
  import { kundliDraft } from '$lib/state/jyotish-draft.svelte';
  import Match from './Match.svelte';

  const lang = $derived(preferences.language);
  const numerals = $derived(preferences.numerals);
  const num = (s: string | number) => applyNumerals(String(s), numerals);

  // The two jyotish tools live on one page: a single birth chart, and Milan
  // (two-chart compatibility) — switched here, not via a separate route.
  let mode = $state<'chart' | 'match'>('chart');

  // Form + result state, initialised from the module draft so it survives
  // navigating away from this lazy-loaded route and back (see jyotish-draft).
  let name = $state(kundliDraft.name);
  let date = $state(kundliDraft.date); // YYYY-MM-DD
  let time = $state(kundliDraft.time); // HH:MM
  let timeKnown = $state(kundliDraft.timeKnown);
  let place = $state<Location | null>(kundliDraft.place ?? preferences.location);
  let chart = $state<BirthChart | null>(kundliDraft.chart);
  let editing = $state(kundliDraft.editing); // form open vs. result shown
  let error = $state<string | null>(null);
  let vargaView = $state<1 | 9>(1); // Rashi (D1) or Navamsa (D9)

  // The methodology note states what the chart was ACTUALLY computed with — read
  // from chart.options (frozen at cast), NOT live preferences, so changing the
  // ayanamsa/node in Settings after casting can't make the caption contradict the
  // displayed chart. Falls back to the live preference only while editing (no chart).
  const methodAyanamsa = $derived(
    ayanamsaShortLabel(chart ? chart.options.ayanamsa : preferences.ayanamsa),
  );
  const methodNode = $derived(
    nodeShortLabel(chart ? chart.options.nodeType : preferences.nodeType),
  );

  // ── saved profiles ──
  let profiles = $state<BirthProfile[]>([]);
  let saved = $state(kundliDraft.saved); // current chart already persisted

  // Persist every change back to the module draft.
  $effect(() => {
    Object.assign(kundliDraft, { name, date, time, timeKnown, place, chart, editing, saved });
  });
  async function refreshProfiles(): Promise<void> {
    try {
      profiles = await listBirthProfiles();
    } catch {
      profiles = [];
    }
  }
  onMount(refreshProfiles);

  function loadProfile(p: BirthProfile): void {
    name = p.name;
    date = p.date;
    time = p.time;
    timeKnown = p.timeKnown;
    place = p.location;
    cast();
    saved = true; // came from a saved profile
  }

  async function saveCurrent(): Promise<void> {
    if (!date || !place) return;
    try {
      // place is a Svelte $state proxy; IndexedDB can't structured-clone a
      // proxy, so snapshot to a plain object before persisting.
      await addBirthProfile({
        name: name || (lang === 'hi' ? 'अनाम' : 'Unnamed'),
        date,
        time,
        timeKnown,
        location: $state.snapshot(place),
      });
      saved = true;
      await refreshProfiles();
    } catch (e) {
      error = lang === 'hi' ? 'सहेजा नहीं जा सका।' : 'Could not save.';
      console.error('saveBirthProfile failed', e);
    }
  }

  async function removeProfile(id: number | undefined): Promise<void> {
    if (id === undefined) return;
    try {
      await deleteBirthProfile(id);
      await refreshProfiles();
    } catch {
      /* ignore */
    }
  }

  const canCast = $derived(!!date && !!place);

  function cast(): void {
    error = null;
    if (!date || !place) {
      error =
        lang === 'hi' ? 'जन्म तिथि और स्थान आवश्यक हैं।' : 'Birth date and place are required.';
      return;
    }
    try {
      const t = timeKnown ? time : '12:00';
      const instant = birthInstant(date, t, place.timezone);
      chart = computeBirthChart(instant, place, timeKnown, {
        ayanamsa: preferences.ayanamsa,
        nodeType: preferences.nodeType,
      });
      saved = false;
      editing = false;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Could not cast the chart.';
    }
  }

  // ── derived display data ──
  const GRAHA_ROWS: readonly GrahaKey[] = [
    'sun',
    'moon',
    'mars',
    'mercury',
    'jupiter',
    'venus',
    'saturn',
    'rahu',
    'ketu',
  ];

  function formatDeg(deg: number): string {
    let d = Math.floor(deg);
    let m = Math.round((deg - d) * 60);
    if (m === 60) {
      d += 1;
      m = 0;
    }
    return `${num(d)}°${num(String(m).padStart(2, '0'))}′`;
  }

  // Vimshottari, computed once per chart.
  const dasha = $derived.by(() => {
    if (!chart) return null;
    const moon = chart.grahas.find((g) => g.key === 'moon');
    if (!moon) return null;
    const periods = vimshottariMahadashas(chart.instant, moon.longitude);
    const now = new Date();
    const activeIdx = activeDashaIndex(periods, now);
    const active = activeIdx >= 0 ? periods[activeIdx] : null;
    const activeAntar = active
      ? antardashasOf(active).find((a) => now >= a.start && now < a.end)
      : null;
    return { periods, activeIdx, active, activeAntar };
  });

  function yearOf(d: Date): string {
    return num(d.getUTCFullYear());
  }

  function birthLine(): string {
    if (!chart) return '';
    const dateStr = new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-GB', {
      timeZone: chart.location.timezone,
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      numberingSystem: 'latn', // Latin digits → num() then applies the numeral preference
    }).format(chart.instant);
    const timeStr = timeKnownOf(chart)
      ? new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-GB', {
          timeZone: chart.location.timezone,
          hour: preferences.timeFormat === '12h' ? 'numeric' : '2-digit',
          minute: '2-digit',
          hour12: preferences.timeFormat === '12h',
          numberingSystem: 'latn',
        }).format(chart.instant)
      : null;
    const where =
      chart.location.name ??
      `${chart.location.latitude.toFixed(2)}, ${chart.location.longitude.toFixed(2)}`;
    return num(timeStr ? `${dateStr} · ${timeStr} · ${where}` : `${dateStr} · ${where}`);
  }

  // The chart object doesn't carry timeKnown; lagna===null is the signal.
  function timeKnownOf(c: BirthChart): boolean {
    return c.lagna !== null;
  }

  function reopen(): void {
    editing = true;
  }

  function dashaLordName(lord: GrahaKey): string {
    return grahaLabel(lord);
  }
</script>

<div class="jyotish-tabs" role="tablist" aria-label={lang === 'hi' ? 'ज्योतिष' : 'Jyotish'}>
  <button
    type="button"
    role="tab"
    id="tab-chart"
    aria-controls="panel-chart"
    aria-selected={mode === 'chart'}
    class:on={mode === 'chart'}
    onclick={() => (mode = 'chart')}
  >
    {lang === 'hi' ? 'जन्म कुण्डली' : 'Birth Chart'}
  </button>
  <button
    type="button"
    role="tab"
    id="tab-match"
    aria-controls="panel-match"
    aria-selected={mode === 'match'}
    class:on={mode === 'match'}
    onclick={() => (mode = 'match')}
  >
    {lang === 'hi' ? 'मिलान (गुण मिलान)' : 'Match (Milan)'}
  </button>
</div>

{#if mode === 'chart'}
  <div id="panel-chart" role="tabpanel" aria-labelledby="tab-chart" class="view stack stack--lg">
    {#if editing}
      <!-- ───────── birth-detail form ───────── -->
      <div class="card form-card">
        <h2>
          {lang === 'hi' ? 'कुण्डली' : 'Kundli'}
          <span class="deva">जन्म कुण्डली</span>
        </h2>
        <p class="desc">
          {lang === 'hi'
            ? 'जन्म की तिथि, समय और स्थान से लग्न, ग्रह स्थिति और विंशोत्तरी दशा।'
            : 'Lagna, planetary positions, and Vimshottari dasha from a birth date, time, and place.'}
        </p>

        {#if profiles.length > 0}
          <div class="saved">
            <div class="saved-lab">{lang === 'hi' ? 'सहेजी कुण्डलियाँ' : 'Saved charts'}</div>
            <div class="saved-chips">
              {#each profiles as p (p.id)}
                <span class="chip">
                  <button class="chip-load" type="button" onclick={() => loadProfile(p)}>
                    {p.name} <small class="num">· {num(p.date)}</small>
                  </button>
                  <button
                    class="chip-del"
                    type="button"
                    aria-label={lang === 'hi' ? 'हटाएँ' : 'Delete'}
                    onclick={() => removeProfile(p.id)}>×</button
                  >
                </span>
              {/each}
            </div>
          </div>
        {/if}

        <div class="fields stack">
          <label class="label">
            <span class="lab"
              >{lang === 'hi' ? 'नाम' : 'Name'}
              <span class="hint">{lang === 'hi' ? '(वैकल्पिक)' : '(optional)'}</span></span
            >
            <input
              class="input"
              type="text"
              bind:value={name}
              placeholder={lang === 'hi' ? 'स्वयं' : 'Self'}
            />
          </label>

          <div class="two-up">
            <label class="label">
              <span class="lab">{lang === 'hi' ? 'जन्म तिथि' : 'Date of birth'}</span>
              <input
                class="input"
                type="date"
                bind:value={date}
                max="2100-12-31"
                min="1800-01-01"
              />
            </label>
            <label class="label">
              <span class="lab">{lang === 'hi' ? 'जन्म समय' : 'Time of birth'}</span>
              <input class="input" type="time" bind:value={time} disabled={!timeKnown} />
            </label>
          </div>

          <label class="checkrow">
            <input
              type="checkbox"
              checked={!timeKnown}
              onchange={(e) => (timeKnown = !e.currentTarget.checked)}
            />
            <span>
              {lang === 'hi' ? 'जन्म समय ज्ञात नहीं है' : "I don't know the birth time"}
              <small
                >{lang === 'hi'
                  ? 'लग्न और भाव छोड़ दिए जाएँगे; राशि और दशा फिर भी मान्य।'
                  : 'Lagna & houses are omitted; rashis and dasha still hold.'}</small
              >
            </span>
          </label>

          <div class="label">
            <span class="lab">{lang === 'hi' ? 'जन्म स्थान' : 'Place of birth'}</span>
            <LocationPicker location={place} onChange={(loc) => (place = loc)} />
          </div>

          {#if error}<p class="form-error" role="alert">{error}</p>{/if}

          <div class="actions">
            {#if chart}
              <button class="btn btn--ghost" type="button" onclick={() => (editing = false)}>
                {lang === 'hi' ? 'वापस' : 'Back to chart'}
              </button>
            {/if}
            <button class="btn btn--primary" type="button" onclick={cast} disabled={!canCast}>
              {lang === 'hi' ? 'कुण्डली बनाएँ' : 'Cast Kundli'}
            </button>
          </div>
        </div>
      </div>
    {:else if chart}
      <!-- ───────── result ───────── -->
      <div class="bar-row">
        <button
          class="birth-bar"
          type="button"
          onclick={reopen}
          aria-label={lang === 'hi' ? 'विवरण संपादित करें' : 'Edit details'}
        >
          <div class="birth-bar__name">
            {name || (lang === 'hi' ? 'जन्म कुण्डली' : 'Birth chart')}
          </div>
          <div class="birth-bar__meta">{birthLine()}</div>
          <svg
            class="birth-bar__edit"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
        <button class="btn save-btn" type="button" onclick={saveCurrent} disabled={saved}>
          {saved ? (lang === 'hi' ? '✓ सहेजा' : '✓ Saved') : lang === 'hi' ? 'सहेजें' : 'Save'}
        </button>
      </div>

      <!-- hero: the three facts people ask for -->
      <div class="identity stagger">
        <div class="id-cell">
          <div class="id-lab">{lang === 'hi' ? 'लग्न' : 'Lagna'}</div>
          <div class="id-val">{chart.lagna ? rashiLabel(chart.lagna.rashi) : '—'}</div>
          <div class="id-sub">
            {chart.lagna
              ? formatDeg(chart.lagna.degInRashi)
              : lang === 'hi'
                ? 'समय अज्ञात'
                : 'time unknown'}
          </div>
        </div>
        <div class="id-cell">
          <div class="id-lab">{lang === 'hi' ? 'राशि' : 'Rashi'}</div>
          <div class="id-val">{rashiLabel(chart.moonRashi)}</div>
          <div class="id-sub">{lang === 'hi' ? 'चन्द्र राशि' : 'Moon sign'}</div>
        </div>
        <div class="id-cell">
          <div class="id-lab">{lang === 'hi' ? 'नक्षत्र' : 'Nakshatra'}</div>
          <div class="id-val">{nakshatraNameByIndex(chart.moonNakshatra.index, lang)}</div>
          <div class="id-sub">
            {lang === 'hi'
              ? `पाद ${num(chart.moonNakshatra.pada)}`
              : `Pada ${num(chart.moonNakshatra.pada)}`}
          </div>
        </div>
      </div>

      <!-- Naamakshar: the traditional name-starting syllable, from the Moon's
         nakshatra + pada. -->
      <div class="naamakshar" role="note">
        <span class="naam-lab">{lang === 'hi' ? 'नामाक्षर' : 'Name syllable'}</span>
        <span class="naam-val"
          >{nameSyllable(chart.moonNakshatra.index, chart.moonNakshatra.pada, lang)}</span
        >
        <span class="naam-hint"
          >{lang === 'hi'
            ? 'परंपरा से नाम इसी ध्वनि से आरम्भ होता है'
            : 'by tradition the name begins with this sound'}</span
        >
      </div>

      <!-- the chart, with a Rashi (D1) / Navamsa (D9) toggle -->
      <div
        class="varga-toggle"
        role="group"
        aria-label={lang === 'hi' ? 'कुण्डली प्रकार' : 'Chart type'}
      >
        <button
          class="vt"
          class:vt--on={vargaView === 1}
          type="button"
          onclick={() => (vargaView = 1)}
        >
          {lang === 'hi' ? 'राशि (D1)' : 'Rashi (D1)'}
        </button>
        <button
          class="vt"
          class:vt--on={vargaView === 9}
          type="button"
          onclick={() => (vargaView = 9)}
        >
          {lang === 'hi' ? 'नवांश (D9)' : 'Navamsa (D9)'}
        </button>
      </div>
      <KundliChart {chart} {lang} {numerals} varga={vargaView} />

      <!-- graha table -->
      <div>
        <div class="sec-head">
          <h2>{lang === 'hi' ? 'ग्रह' : 'Grahas'}</h2>
          <span class="deva-sm">नव ग्रह</span>
          <span class="fill"></span>
        </div>
        <div class="graha-table" role="table">
          <div class="gt-head" role="row">
            <span role="columnheader">{lang === 'hi' ? 'ग्रह' : 'Graha'}</span>
            <span role="columnheader">{lang === 'hi' ? 'राशि' : 'Rashi'}</span>
            <span role="columnheader" class="gt-deg">{lang === 'hi' ? 'अंश' : 'Degree'}</span>
            <span role="columnheader">{lang === 'hi' ? 'नक्षत्र' : 'Nakshatra'}</span>
            <span role="columnheader" class="gt-house">{lang === 'hi' ? 'भाव' : 'House'}</span>
          </div>
          {#each GRAHA_ROWS as key (key)}
            {@const g = chart.grahas.find((x) => x.key === key)}
            {#if g}
              <div class="gt-row" role="row">
                <span class="gt-name" role="cell">
                  {grahaLabel(key)}
                  {#if g.retrograde}<span
                      class="retro"
                      title={lang === 'hi' ? 'वक्री' : 'Retrograde'}>℞</span
                    >{/if}
                </span>
                <span role="cell">{rashiLabel(g.rashi)}</span>
                <span class="gt-deg num" role="cell">{formatDeg(g.degInRashi)}</span>
                <span role="cell"
                  >{nakshatraNameByIndex(g.nakshatra, lang)}
                  <small class="muted">({num(g.pada)})</small></span
                >
                <span class="gt-house num" role="cell">{g.house ? num(g.house) : '—'}</span>
              </div>
            {/if}
          {/each}
        </div>
      </div>

      <!-- vimshottari dasha -->
      {#if dasha}
        <div>
          <div class="sec-head">
            <h2>{lang === 'hi' ? 'विंशोत्तरी दशा' : 'Vimshottari Dasha'}</h2>
            <span class="deva-sm">{lang === 'hi' ? 'महादशा' : 'Mahadasha'}</span>
            <span class="fill"></span>
          </div>
          {#if dasha.active}
            <p class="dasha-now">
              {lang === 'hi' ? 'वर्तमान' : 'Running now'}:
              <b>{dashaLordName(dasha.active.lord)}</b>
              {#if dasha.activeAntar}<span class="muted">
                  · {lang === 'hi' ? 'अन्तर्दशा' : 'antardasha'}
                  {dashaLordName(dasha.activeAntar.lord)}</span
                >{/if}
            </p>
          {/if}
          <ol class="dasha-list">
            {#each dasha.periods as p, i (i)}
              <li class="dasha-row" class:active={i === dasha.activeIdx}>
                <span class="dr-lord">{dashaLordName(p.lord)}</span>
                <span class="dr-span num">{yearOf(p.start)} – {yearOf(p.end)}</span>
                <span class="dr-years num muted"
                  >{num(p.years)} {lang === 'hi' ? 'वर्ष' : 'yrs'}</span
                >
              </li>
            {/each}
          </ol>
        </div>
      {/if}

      <!-- methodology / honesty -->
      <p class="method-note">
        {lang === 'hi'
          ? `गणना: ${methodAyanamsa} अयनांश · ${methodNode} · पूर्ण-राशि भाव · ज्योतिष इंजन (पूर्वावलोकन)। जन्म समय में कुछ मिनटों का अंतर लग्न बदल सकता है।`
          : `Computed with ${methodAyanamsa} ayanamsa · ${methodNode} · whole-sign houses · jyotish engine (preview). A few minutes of birth-time uncertainty can shift the lagna near a cusp.`}
      </p>
    {/if}
  </div>
{:else}
  <div id="panel-match" role="tabpanel" aria-labelledby="tab-match"><Match /></div>
{/if}

<style>
  /* Understated segmented control: a soft track with a raised active pill —
     no saturated fill. */
  .jyotish-tabs {
    display: flex;
    width: fit-content;
    gap: 0.2rem;
    padding: 0.2rem;
    margin: 0 auto 1.25rem; /* centered */
    background: var(--paper-3);
    border-radius: var(--radius-pill, 999px);
  }
  .jyotish-tabs button {
    padding: 0.4rem 1.1rem;
    border: none;
    border-radius: var(--radius-pill, 999px);
    background: transparent;
    color: var(--ink-soft);
    font: inherit;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: color 0.15s;
  }
  .jyotish-tabs button.on {
    background: var(--paper);
    color: var(--ink);
    box-shadow: 0 1px 3px var(--shadow, rgba(0, 0, 0, 0.14));
  }
  .form-card {
    max-width: 560px;
    margin: 0 auto;
  }
  /* saved-chart chips */
  .saved {
    margin-bottom: 18px;
  }
  .saved-lab {
    font-size: 11px;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: var(--ink-soft);
    font-weight: 700;
    margin-bottom: 8px;
  }
  .saved-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .chip {
    display: inline-flex;
    align-items: stretch;
    border: 1px solid var(--line);
    border-radius: var(--radius-pill);
    background: var(--paper-3);
    overflow: hidden;
  }
  .chip-load {
    border: none;
    background: transparent;
    padding: 7px 6px 7px 14px;
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink);
    cursor: pointer;
  }
  .chip-load small {
    color: var(--ink-soft);
    font-weight: 500;
  }
  .chip-load:hover {
    color: var(--red);
  }
  .chip-del {
    border: none;
    background: transparent;
    padding: 0 11px;
    font-size: 16px;
    line-height: 1;
    color: var(--ink-faint);
    cursor: pointer;
  }
  .chip-del:hover {
    color: var(--red);
  }
  /* result top bar: editable detail bar + save */
  .bar-row {
    display: flex;
    gap: 10px;
    align-items: stretch;
  }
  .bar-row .birth-bar {
    flex: 1;
  }
  .save-btn {
    white-space: nowrap;
    align-self: stretch;
  }
  .fields {
    gap: var(--space-4);
  }
  .two-up {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
  }
  .checkrow {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 14px;
    color: var(--ink);
    cursor: pointer;
  }
  .checkrow input {
    margin-top: 3px;
    accent-color: var(--red);
    width: 16px;
    height: 16px;
  }
  .checkrow small {
    display: block;
    color: var(--ink-soft);
    font-size: 12px;
    margin-top: 2px;
  }
  .form-error {
    color: var(--red);
    font-size: 13px;
    margin: 0;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 4px;
  }

  /* birth detail bar (editable header on the result view) */
  .birth-bar {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-areas: 'name edit' 'meta edit';
    align-items: center;
    gap: 0 12px;
    text-align: left;
    padding: 14px 18px;
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    cursor: pointer;
  }
  .birth-bar:hover {
    background: var(--paper-3);
  }
  .birth-bar__name {
    grid-area: name;
    font-family: var(--font-serif);
    font-size: 20px;
    font-weight: 600;
    color: var(--ink);
  }
  .birth-bar__meta {
    grid-area: meta;
    font-size: 12.5px;
    color: var(--ink-soft);
    margin-top: 2px;
  }
  .birth-bar__edit {
    grid-area: edit;
    width: 18px;
    height: 18px;
    color: var(--red);
  }

  /* identity hero */
  .identity {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
  }
  .id-cell {
    text-align: center;
    padding: 18px 10px;
    border-right: 1px solid var(--line-2);
  }
  .id-cell:last-child {
    border-right: none;
  }
  .id-lab {
    font-size: 10.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--red);
    font-weight: 700;
  }
  .id-val {
    font-family: var(--font-serif);
    font-size: clamp(22px, 6vw, 30px);
    font-weight: 600;
    color: var(--ink);
    /* Devanagari nakshatra/rashi names (e.g. पूर्वाषाढ़ा with the नुक़्ता + ा) clip at
       1.1; 1.3 clears the above/below matras. */
    line-height: 1.3;
    margin-top: 4px;
  }
  .id-sub {
    font-size: 12px;
    color: var(--ink-soft);
    margin-top: 3px;
  }

  /* varga (D1/D9) toggle */
  .varga-toggle {
    display: flex;
    justify-content: center;
    gap: 4px;
    margin-bottom: 4px;
  }
  .vt {
    font-family: var(--font-serif);
    font-size: 13px;
    font-weight: 500;
    padding: 6px 16px;
    border: 1px solid var(--line);
    border-radius: var(--radius-pill);
    background: var(--paper-2);
    color: var(--ink-soft);
    cursor: pointer;
  }
  .vt--on {
    background: color-mix(in srgb, var(--red) 12%, var(--paper-2));
    color: var(--red);
    border-color: color-mix(in srgb, var(--red) 35%, var(--line));
    font-weight: 600;
  }

  /* Naamakshar callout */
  .naamakshar {
    display: flex;
    align-items: baseline;
    justify-content: center;
    flex-wrap: wrap;
    gap: 6px 12px;
    text-align: center;
    padding: 12px 16px;
    margin-top: -4px;
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--gold) 8%, var(--paper-2));
  }
  .naam-lab {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--gold);
    font-weight: 700;
  }
  .naam-val {
    font-family: var(--font-serif);
    font-size: 22px;
    font-weight: 600;
    color: var(--ink);
  }
  .naam-val::first-letter {
    color: var(--red);
  }
  .naam-hint {
    font-size: 12px;
    color: var(--ink-soft);
    font-style: italic;
  }

  /* graha table */
  .graha-table {
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    overflow: hidden;
  }
  .gt-head,
  .gt-row {
    display: grid;
    grid-template-columns: 1.3fr 1.1fr 0.9fr 1.4fr 0.6fr;
    gap: 8px;
    padding: 11px 14px;
    align-items: baseline;
    font-size: 14px;
  }
  .gt-head {
    background: var(--paper-3);
    font-size: 10.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-soft);
    font-weight: 700;
  }
  .gt-row {
    border-top: 1px solid var(--line-2);
    color: var(--ink);
  }
  .gt-row:nth-child(even) {
    background: color-mix(in srgb, var(--paper-3) 40%, transparent);
  }
  .gt-name {
    font-weight: 600;
  }
  .gt-deg {
    text-align: right;
  }
  .gt-house {
    text-align: center;
  }
  .retro {
    color: var(--red);
    font-weight: 700;
    margin-left: 2px;
  }

  /* dasha */
  .dasha-now {
    margin: 0 0 12px;
    font-size: 15px;
    color: var(--ink);
  }
  .dasha-now b {
    color: var(--red);
  }
  .dasha-list {
    list-style: none;
    margin: 0;
    padding: 0;
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    overflow: hidden;
  }
  .dasha-row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 14px;
    padding: 11px 16px;
    align-items: baseline;
    border-top: 1px solid var(--line-2);
    font-size: 14.5px;
  }
  .dasha-row:first-child {
    border-top: none;
  }
  .dasha-row.active {
    background: color-mix(in srgb, var(--red) 9%, var(--paper-2));
    box-shadow: inset 3px 0 0 var(--red);
  }
  .dr-lord {
    font-family: var(--font-serif);
    font-weight: 600;
    color: var(--ink);
  }
  .dasha-row.active .dr-lord {
    color: var(--red-deep);
  }
  .dr-span {
    color: var(--ink-soft);
  }
  .dr-years {
    font-size: 12.5px;
  }

  .method-note {
    font-size: 12px;
    color: var(--ink-soft);
    line-height: 1.6;
    border-top: 1px dashed var(--line);
    padding-top: 14px;
    margin: 0;
  }

  @media (max-width: 460px) {
    .two-up {
      grid-template-columns: 1fr;
    }
    .gt-head,
    .gt-row {
      grid-template-columns: 1.2fr 1fr 0.8fr 0.5fr;
    }
    /* drop the nakshatra column on very narrow screens */
    .gt-head span:nth-child(4),
    .gt-row span:nth-child(4) {
      display: none;
    }
  }
</style>
