<script lang="ts">
  import { onMount } from 'svelte';
  import {
    hydratePreferences,
    preferences,
    updatePreferences,
  } from '$lib/state/preferences.svelte';
  import Today from './routes/Today.svelte';
  import Day from './routes/Day.svelte';
  import Month from './routes/Month.svelte';
  import Festivals from './routes/Festivals.svelte';
  import Settings from './routes/Settings.svelte';
  import { computePanchanga, type Panchanga } from '$lib/panchanga';
  import { t, type TranslationKey, samvatsaraNameByIndex } from '$lib/i18n';
  import { SAMVATSARA_NAMES } from '$lib/panchanga/names';
  import { applyNumerals } from '$lib/format/numerals';

  // Component-local translator that picks up the user's active language
  // reactively (preferences is $state). Pass through to the pure t().
  const tr = (k: TranslationKey, vars?: Record<string, string | number>) =>
    t(k, vars, preferences.language);
  // Convert any digits in a built string to the active numeral system.
  const num = (text: string) => applyNumerals(text, preferences.numerals);

  // Hash-based router — five logical routes, but the masthead shows
  // tabs for the three primary views (Today / Month / Festivals).
  // Settings lives behind a dedicated icon button.

  let hash = $state(typeof location !== 'undefined' ? location.hash : '');

  onMount(() => {
    hydratePreferences();
    const handler = () => (hash = location.hash);
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  });

  type ResolvedRoute =
    | { name: 'today' }
    | { name: 'day'; yyyymmdd: string }
    | { name: 'month'; yyyymm: string }
    | { name: 'festivals'; year: string }
    | { name: 'settings' };

  const route = $derived<ResolvedRoute>(parseHash(hash));

  function parseHash(h: string): ResolvedRoute {
    const path = h.replace(/^#/, '').replace(/^\//, '');
    if (path === '' || path === 'today') return { name: 'today' };
    const day = path.match(/^day\/(\d{4}-\d{2}-\d{2})$/);
    if (day) return { name: 'day', yyyymmdd: day[1] };
    const month = path.match(/^month\/(\d{4}-\d{2})$/);
    if (month) return { name: 'month', yyyymm: month[1] };
    const festivals = path.match(/^festivals\/(\d{4})$/);
    if (festivals) return { name: 'festivals', year: festivals[1] };
    if (path === 'settings') return { name: 'settings' };
    return { name: 'today' };
  }

  // Compute today's panchanga for the masthead samvat strip.
  const todayPanchanga = $derived.by<Panchanga | null>(() => {
    if (!preferences.location || !preferences.hydrated) return null;
    try {
      return computePanchanga(new Date(), preferences.location, {
        ayanamsa: preferences.ayanamsa,
        monthSystem: preferences.monthSystem,
      });
    } catch {
      return null;
    }
  });

  function currentYear(): number {
    return new Date().getUTCFullYear();
  }
  function currentYYYYMM(): string {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  function cycleTheme(): void {
    const order: ('auto' | 'light' | 'dark')[] = ['auto', 'light', 'dark'];
    const idx = order.indexOf(preferences.theme);
    const next = order[(idx + 1) % order.length];
    void updatePreferences({ theme: next });
  }

  function toggleNumerals(): void {
    void updatePreferences({
      numerals: preferences.numerals === 'latin' ? 'devanagari' : 'latin',
    });
  }

  // Determine the icon glyph for the theme button.
  const themeGlyph = $derived(
    preferences.theme === 'dark' ? '☀' : preferences.theme === 'light' ? '☾' : '◐',
  );
  const themeLabel = $derived(
    preferences.theme === 'dark'
      ? tr('nav.themeDark')
      : preferences.theme === 'light'
        ? tr('nav.themeLight')
        : tr('nav.themeAuto'),
  );

  // For the location pill — pull the location's short name.
  const locShortName = $derived.by(() => {
    const loc = preferences.location;
    if (!loc?.name) return loc ? `${loc.latitude.toFixed(2)}, ${loc.longitude.toFixed(2)}` : '—';
    return loc.name.split(',')[0];
  });

  // Which tab is the "current section" — Today and Day share the Today
  // tab since Day is conceptually a single-day variant of Today.
  // Settings does not match any tab; the strip stays visible so the
  // user has a one-click path back to the calendar.
  const activeTab = $derived<'today' | 'month' | 'festivals' | null>(
    route.name === 'today' || route.name === 'day'
      ? 'today'
      : route.name === 'month'
        ? 'month'
        : route.name === 'festivals'
          ? 'festivals'
          : null,
  );

  function tabHref(view: 'today' | 'month' | 'festivals'): string {
    if (view === 'today') return '#/';
    if (view === 'month') return `#/month/${currentYYYYMM()}`;
    return `#/festivals/${currentYear()}`;
  }
</script>

<a class="skip-link" href="#main">{tr('nav.skipToContent')}</a>

<div class="wrap">
  <header class="masthead">
    <div class="toprow">
      <a class="loc-pill" href="#/settings" aria-label={tr('nav.location')}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path d="M12 21s-7-6.3-7-11a7 7 0 0114 0c0 4.7-7 11-7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
        <span>{locShortName}</span>
      </a>
      <!-- "|| श्री ||" — the traditional Hindu auspicious invocation
           rendered at the masthead center. Centered absolutely so the
           toprow's flex justify-content keeps the location pill and
           controls clamped to the edges. -->
      <div class="sri-seal" aria-hidden="true">|| श्री ||</div>
      <div class="controls" role="group" aria-label="App controls">
        <button
          class="icon-btn"
          type="button"
          onclick={toggleNumerals}
          aria-pressed={preferences.numerals === 'devanagari'}
          title={tr('nav.toggleNumerals')}
          aria-label={tr('nav.toggleNumerals')}
        >
          {preferences.numerals === 'devanagari' ? '12' : '१२'}
        </button>
        <button
          class="icon-btn"
          type="button"
          onclick={cycleTheme}
          title={themeLabel}
          aria-label={themeLabel}
        >
          {themeGlyph}
        </button>
        <a
          class="icon-btn icon-btn--link"
          href="#/settings"
          title={tr('nav.openSettings')}
          aria-label={tr('nav.openSettings')}
          aria-current={route.name === 'settings' ? 'page' : undefined}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" />
            <path
              d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
            />
          </svg>
        </a>
      </div>
    </div>

    <h1 class="title">
      <!-- The kicker swaps language per `masthead.kicker`: English mode
           shows the Devanagari word, Hindi mode shows the Latin
           transliteration. The main title is always in the active
           language. -->
      <span class="deva">{tr('masthead.kicker')}</span>
      <span class="title__english">{tr('masthead.title')}</span>
    </h1>
    <!-- Petal garland under the title — book-printing convention for
         frontispieces, three small fleurons spaced with thin dividers
         instead of a single ornament. Reads as a finishing rule
         beneath the title rather than a stray glyph. -->
    <div class="title-ornament" aria-hidden="true">
      <span class="title-ornament__rule"></span>
      <span class="title-ornament__petal">❀</span>
      <span class="title-ornament__petal">❦</span>
      <span class="title-ornament__petal">❀</span>
      <span class="title-ornament__rule"></span>
    </div>
    {#if todayPanchanga}
      <div class="subline">
        {tr('masthead.vikram')} <b class="num">{num(String(todayPanchanga.samvat.vikrama))}</b> ·
        {tr('masthead.shaka')}
        <b class="num">{num(String(todayPanchanga.samvat.shaka))}</b>
        {#if todayPanchanga.samvat.yearName}
          {@const idx = SAMVATSARA_NAMES.indexOf(todayPanchanga.samvat.yearName)}
          ·
          <em class="subline__yearname"
            >{idx >= 0
              ? samvatsaraNameByIndex(idx, preferences.language)
              : todayPanchanga.samvat.yearName}</em
          >{/if}
      </div>
    {:else}
      <div class="subline subline--placeholder">&nbsp;</div>
    {/if}
  </header>

  <hr class="rule-double" />

  {#if route.name === 'settings'}
    <!-- Settings is not a sibling section; show a back link instead of
         the primary tab strip, returning to whatever the user was last
         viewing. Falls back to today if there's no history entry. -->
    <nav class="settings-nav" aria-label="Settings navigation">
      <button
        class="back-link"
        type="button"
        onclick={() => {
          if (history.length > 1) history.back();
          else location.hash = '/';
        }}
        aria-label={tr('nav.back')}
      >
        <svg
          class="back-link__chev"
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
        <span>{tr('nav.back')}</span>
      </button>
    </nav>
  {:else}
    <nav class="tabs" aria-label="Primary views">
      {#each [{ id: 'today' as const, labelKey: 'tab.day' as const }, { id: 'month' as const, labelKey: 'tab.month' as const }, { id: 'festivals' as const, labelKey: 'tab.festivals' as const }] as tab (tab.id)}
        <a
          class="tab"
          aria-current={activeTab === tab.id ? 'page' : undefined}
          href={tabHref(tab.id)}
        >
          {tr(tab.labelKey)}
        </a>
      {/each}
    </nav>
  {/if}

  <main id="main">
    {#if route.name === 'today'}
      <Today />
    {:else if route.name === 'day'}
      <Day yyyymmdd={route.yyyymmdd} />
    {:else if route.name === 'month'}
      <Month yyyymm={route.yyyymm} />
    {:else if route.name === 'festivals'}
      <Festivals year={route.year} />
    {:else if route.name === 'settings'}
      <Settings />
    {/if}
  </main>

  <footer class="footer-note">
    {tr('footer.method')}<br />
    {tr('footer.privacy')}
    <a href="https://www.gnu.org/licenses/agpl-3.0.html" rel="noopener" target="_blank">AGPL-3.0</a
    >.
  </footer>
</div>

<style>
  /* ───────── masthead ───────── */
  .masthead {
    text-align: center;
    padding: 30px 0 14px;
    position: relative;
  }
  .toprow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    /* More vertical breathing room between the controls row and the
       big title beneath it — the seal previously sat too close to the
       title, reading like a subtitle. */
    margin-bottom: 30px;
    gap: 12px;
    position: relative;
  }
  .loc-pill {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 7px 14px;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink);
    background: var(--paper-2);
    cursor: pointer;
    text-decoration: none;
    transition: background 0.15s;
  }
  .loc-pill:hover {
    background: var(--paper-3);
    text-decoration: none;
  }
  .loc-pill svg {
    width: 13px;
    height: 13px;
  }
  .controls {
    display: flex;
    gap: 8px;
  }
  /* Sri seal — vertically centered with the location pill and icon
     buttons (their visual midline), not pinned to the top of the
     masthead. Absolute positioning keeps it on the optical center
     regardless of how wide the flanking elements grow. */
  .sri-seal {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    font-family: var(--font-serif);
    font-size: 16px;
    font-weight: 500;
    color: var(--red);
    letter-spacing: 0.06em;
    white-space: nowrap;
    pointer-events: none;
  }
  .icon-btn--link {
    text-decoration: none;
  }
  .icon-btn--link svg {
    width: 17px;
    height: 17px;
    stroke-width: 1.75;
  }

  .title {
    font-family: var(--font-serif);
    font-optical-sizing: auto;
    font-weight: 600;
    font-size: clamp(38px, 9vw, 58px);
    letter-spacing: -0.02em;
    line-height: 0.95;
    color: var(--ink);
  }
  .title .deva {
    display: block;
    font-size: 0.46em;
    color: var(--red);
    font-weight: 500;
    letter-spacing: 0.04em;
    /* Generous spacing between the small kicker and the main display
       title — the previous 2px collapsed them visually together. */
    margin-bottom: 10px;
  }
  .title__english {
    display: block;
  }
  /* Petal garland: thin gold rules on either side of three fleurons.
     Reads as a finishing ornament under the title rather than a
     standalone glyph. */
  .title-ornament {
    margin-top: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: var(--gold);
    line-height: 1;
    text-shadow: 0 1px 0 color-mix(in srgb, var(--gold) 30%, transparent);
  }
  .title-ornament__petal {
    font-size: 14px;
  }
  .title-ornament__petal:nth-child(3) {
    font-size: 16px;
  }
  .title-ornament__rule {
    flex: 0 0 36px;
    height: 1px;
    background: linear-gradient(
      to right,
      transparent,
      color-mix(in srgb, var(--gold) 55%, transparent),
      transparent
    );
  }
  .subline {
    margin-top: 12px;
    font-size: 12.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink-soft);
    font-weight: 600;
  }
  .subline b {
    color: var(--red);
    font-weight: 700;
  }
  /* The 60-year Jovian cycle name (Vishvavasu, Parabhava…) gets
     italic Fraunces — the only italic in the masthead, so it reads as
     a name rather than chrome. */
  .subline__yearname {
    font-family: var(--font-serif);
    font-style: italic;
    text-transform: none;
    letter-spacing: 0;
    font-size: 14px;
    color: var(--gold);
    font-weight: 500;
  }
  .subline--placeholder {
    visibility: hidden;
  }

  /* ───────── tabs ───────── */
  .tabs {
    display: flex;
    gap: 4px;
    justify-content: center;
    margin: 4px 0 26px;
  }
  :global(.tab) {
    font-family: var(--font-serif);
    font-size: 17px;
    font-weight: 500;
    padding: 7px 20px 9px;
    color: var(--ink-soft);
    background: none;
    border: none;
    cursor: pointer;
    border-bottom: 2.5px solid transparent;
    transition:
      color 0.2s,
      border-color 0.2s;
    text-decoration: none;
  }
  /* Active tab gets the red underline back — earlier removal was a
     misread of the user's "remove underline" feedback (which was
     about the spurious hyperlink underline, not this indicator).
     `!important` defends against the global a:hover { underline }
     rule in reset.css. */
  :global(.tab[aria-current='page']) {
    color: var(--red);
    font-weight: 600;
    border-bottom-color: var(--red);
  }
  :global(.tab:hover),
  :global(.tab:focus-visible) {
    color: var(--ink);
    text-decoration: none !important;
  }

  /* Settings header — back link replaces the tab strip while inside
     the Settings overlay, so the Settings route still has a clear way
     out without taking up section-tab real estate. */
  .settings-nav {
    display: flex;
    margin: 4px 0 26px;
  }
  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-serif);
    font-size: 16px;
    font-weight: 500;
    color: var(--ink-soft);
    padding: 6px 14px 7px 10px;
    border: 1px solid var(--line);
    border-radius: var(--radius-pill);
    background: var(--paper-2);
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s;
  }
  .back-link__chev {
    width: 16px;
    height: 16px;
    color: var(--red);
  }
  .back-link:hover {
    color: var(--ink);
    background: var(--paper-3);
  }
  .back-link:hover .back-link__chev {
    color: var(--red-deep);
  }

  .footer-note {
    margin-top: 50px;
    text-align: center;
    font-size: 11.5px;
    color: var(--ink-soft);
    line-height: 1.6;
  }
  .footer-note :global(a) {
    color: var(--red);
  }
</style>
