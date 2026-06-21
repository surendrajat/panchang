<script lang="ts">
  import { onMount } from 'svelte';
  import {
    hydratePreferences,
    preferences,
    updatePreferences,
    panchangaOptionsFrom,
  } from '$lib/state/preferences.svelte';
  import { swUpdate, applySwUpdate, dismissSwUpdate } from '$lib/state/sw-update.svelte';
  import { clock } from '$lib/state/clock.svelte';
  import Day from './routes/Day.svelte';
  import Month from './routes/Month.svelte';
  import Festivals from './routes/Festivals.svelte';
  import Settings from './routes/Settings.svelte';
  import Loading from '$components/Loading.svelte';
  import PetalArt from '$components/PetalArt.svelte';
  import { computePanchanga, type Panchanga } from '$lib/panchanga';
  import { t, type TranslationKey, samvatsaraNameByIndex } from '$lib/i18n';
  import { SAMVATSARA_NAMES } from '$lib/panchanga/names';
  import { applyNumerals } from '$lib/format/numerals';
  import { localYMD } from '$lib/format/time';
  import { evictStale } from '$lib/storage';
  import { prefetchFestivals } from '$lib/festival-loader';

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
  // ONE scroll position shared across every tab — the position carries over from
  // whatever tab you were last on, so switching tabs is seamless (no per-tab jump
  // to a separately-remembered spot). Scroll within a tab (e.g. paging days) is
  // preserved while you stay there, but is dropped once you switch away. Saved on
  // leave, restored on arrive; plain `let` (read imperatively in the effect).
  let sharedScrollY = 0;

  onMount(() => {
    hydratePreferences();
    void evictStale();
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    const handler = () => {
      sharedScrollY = window.scrollY; // capture where we're leaving from
      hash = location.hash;
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  });

  type ResolvedRoute =
    | { name: 'today' }
    | { name: 'day'; yyyymmdd: string }
    | { name: 'month'; yyyymm: string }
    | { name: 'festivals'; year: string }
    | { name: 'kundli' }
    | { name: 'sky' }
    | { name: 'learn' }
    | { name: 'settings' };

  const route = $derived<ResolvedRoute>(parseHash(hash));

  // On every route change, re-apply the shared scroll position. Within a tab
  // (day↔day, today↔day) the handler just saved the current Y, so this is a
  // no-op and the position is preserved; across tabs it carries the position
  // over (clamped if the new view is shorter). Two rAFs so the new view paints
  // first; a shorter view that clamped scrollY won't be over-restored.
  $effect(() => {
    void route; // re-run on any route change
    const y = sharedScrollY;
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => window.scrollTo(0, y));
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  });

  function parseHash(h: string): ResolvedRoute {
    const path = h.replace(/^#/, '').replace(/^\//, '');
    if (path === '' || path === 'today') return { name: 'today' };
    const day = path.match(/^day\/(\d{4}-\d{2}-\d{2})$/);
    if (day) return { name: 'day', yyyymmdd: day[1] };
    const month = path.match(/^month\/(\d{4}-\d{2})$/);
    if (month) return { name: 'month', yyyymm: month[1] };
    const festivals = path.match(/^festivals\/(\d{4})$/);
    if (festivals) return { name: 'festivals', year: festivals[1] };
    if (path === 'kundli') return { name: 'kundli' };
    if (path === 'sky') return { name: 'sky' };
    if (path === 'learn') return { name: 'learn' };
    if (path === 'settings') return { name: 'settings' };
    return { name: 'today' };
  }

  // Compute today's panchanga for the masthead samvat strip. Uses the same
  // options builder as the routes so the strip can't disagree with the Today card.
  const todayPanchanga = $derived.by<Panchanga | null>(() => {
    if (!preferences.location || !preferences.hydrated) return null;
    try {
      return computePanchanga(clock.now, preferences.location, panchangaOptionsFrom(preferences));
    } catch {
      return null;
    }
  });

  // Warm the festival cache for the current year in the background once prefs +
  // location are loaded, so the first Festivals open is instant even on a slow
  // phone (the ~year-long off-thread compute runs before the user navigates).
  // Fires once; deferred to idle so it never competes with first paint.
  let festivalsPrefetched = false;
  $effect(() => {
    if (festivalsPrefetched || !preferences.hydrated || !preferences.location) return;
    festivalsPrefetched = true;
    const loc = $state.snapshot(preferences.location);
    const opts = { ayanamsa: preferences.ayanamsa, monthSystem: preferences.monthSystem };
    const run = () => prefetchFestivals(new Date().getUTCFullYear(), loc, opts);
    if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 4000 });
    else setTimeout(run, 1500);
  });

  function currentYear(): number {
    return new Date().getUTCFullYear();
  }
  function currentYYYYMM(): string {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  // Today's YMD in the user's location — reactive (rolls over at midnight via
  // the shared clock store). The `today` route uses the same <Day> component
  // as `day`, just parameterised with this value, so navigating today↔day
  // does not unmount/remount the view (no flash, no .view animation re-fire).
  const liveTodayYMD = $derived(localYMD(clock.now, preferences.location?.timezone ?? 'UTC'));

  function toggleLanguage(): void {
    void updatePreferences({ language: preferences.language === 'hi' ? 'en' : 'hi' });
  }

  // For the location pill — pull the location's short name.
  const locShortName = $derived.by(() => {
    const loc = preferences.location;
    if (!loc?.name) return loc ? `${loc.latitude.toFixed(2)}, ${loc.longitude.toFixed(2)}` : '—';
    return loc.name.split(',')[0];
  });

  // Tab strip ref (declared here so the markup below can bind to it). The
  // auto-scroll effect lives just after `activeTab` is computed, since it
  // depends on that derived.
  let tabsEl = $state<HTMLElement | null>(null);

  // Which tab is the "current section" — Today and Day share the Today
  // tab since Day is conceptually a single-day variant of Today.
  // Settings does not match any tab; the strip stays visible so the
  // user has a one-click path back to the calendar.
  const activeTab = $derived<'today' | 'month' | 'festivals' | 'kundli' | 'sky' | 'learn' | null>(
    route.name === 'today' || route.name === 'day'
      ? 'today'
      : route.name === 'month'
        ? 'month'
        : route.name === 'festivals'
          ? 'festivals'
          : route.name === 'kundli'
            ? 'kundli'
            : route.name === 'sky'
              ? 'sky'
              : route.name === 'learn'
                ? 'learn'
                : null,
  );

  // On narrow phones the 5 tabs overflow horizontally; tabs to the right
  // (Kundli, Sky) can sit off-screen. Whenever the active tab changes, scroll
  // it into view (centred) so the selected section is always visible.
  $effect(() => {
    void activeTab; // tracked
    const nav = tabsEl;
    if (!nav) return;
    const el = nav.querySelector<HTMLElement>('.tab[aria-current="page"]');
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  });

  function tabHref(view: 'today' | 'month' | 'festivals' | 'kundli' | 'sky' | 'learn'): string {
    if (view === 'today') return '#/';
    if (view === 'month') return `#/month/${currentYYYYMM()}`;
    if (view === 'kundli') return '#/kundli';
    if (view === 'sky') return '#/sky';
    if (view === 'learn') return '#/learn';
    return `#/festivals/${currentYear()}`;
  }

  // Warm the lazy chunks on intent (hover / touch-start) so the tab is ready by
  // the time the click lands — Vite caches the import, so repeats are no-ops.
  function prefetchTab(view: string): void {
    if (view === 'kundli') import('./routes/Kundli.svelte').catch(() => {});
    else if (view === 'sky') import('./routes/Sky.svelte').catch(() => {});
    else if (view === 'learn') import('./routes/Learn.svelte').catch(() => {});
  }
</script>

<a class="skip-link" href="#main">{tr('nav.skipToContent')}</a>

<div class="wrap">
  {#if swUpdate.available}
    <div class="update-banner" role="status">
      <span class="update-banner__text">{tr('update.available')}</span>
      <button type="button" class="update-banner__reload" onclick={applySwUpdate}>
        {tr('update.reload')}
      </button>
      <button
        type="button"
        class="update-banner__dismiss"
        onclick={dismissSwUpdate}
        aria-label={tr('update.dismiss')}
      >
        ×
      </button>
    </div>
  {/if}
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
      <div class="sri-seal" aria-hidden="true">॥ श्री ॥</div>
      <div class="controls" role="group" aria-label="App controls">
        <button
          class="icon-btn lang-btn"
          type="button"
          onclick={toggleLanguage}
          title={tr('nav.switchLanguage')}
          aria-label={tr('nav.switchLanguage')}
        >
          {#if preferences.language === 'hi'}
            <svg class="lang-svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <text
                x="12"
                y="19"
                text-anchor="middle"
                font-family="Georgia, 'Palatino Linotype', serif"
                font-size="20"
                font-weight="700">A</text
              >
            </svg>
          {:else}
            <svg class="lang-svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <text
                x="12"
                y="19"
                text-anchor="middle"
                font-family="Georgia, 'Palatino Linotype', serif"
                font-size="20"
                font-weight="700">अ</text
              >
            </svg>
          {/if}
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
    <!-- Lotus-and-leaves garland under the title, between thin gold rules —
         a finishing ornament in the book-printing convention. -->
    <div class="title-ornament" aria-hidden="true">
      <span class="title-ornament__rule"></span>
      <PetalArt />
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
    <nav class="tabs" bind:this={tabsEl} aria-label="Primary views">
      {#each [{ id: 'today' as const, labelKey: 'tab.day' as const }, { id: 'month' as const, labelKey: 'tab.month' as const }, { id: 'festivals' as const, labelKey: 'tab.festivals' as const }, { id: 'kundli' as const, labelKey: 'tab.kundli' as const }, { id: 'sky' as const, labelKey: 'tab.sky' as const }, { id: 'learn' as const, labelKey: 'tab.learn' as const }] as tab (tab.id)}
        <a
          class="tab"
          aria-current={activeTab === tab.id ? 'page' : undefined}
          href={tabHref(tab.id)}
          onpointerenter={() => prefetchTab(tab.id)}
          onpointerdown={() => prefetchTab(tab.id)}
        >
          {tr(tab.labelKey)}
        </a>
      {/each}
    </nav>
  {/if}

  <main id="main">
    {#if route.name === 'today' || route.name === 'day'}
      <!-- Today and Day share one component instance, parameterised by the YMD.
           Same-section navigation (today↔day, day↔day) becomes a prop update —
           no remount, no .view mount-animation re-fire, no flash mid-transition. -->
      <Day yyyymmdd={route.name === 'today' ? liveTodayYMD : route.yyyymmdd} />
    {:else if route.name === 'month'}
      <Month yyyymm={route.yyyymm} />
    {:else if route.name === 'festivals'}
      <Festivals year={route.year} />
    {:else if route.name === 'kundli'}
      <!-- Lazy-loaded: panchang-only users never download the jyotish
           engine or the planet-position code paths. -->
      {#await import('./routes/Kundli.svelte')}
        <Loading label={tr('kundli.loading')} />
      {:then m}
        <m.default />
      {:catch}
        <p class="muted">
          {tr('route.loadError')}
          <button class="btn btn--pill" type="button" onclick={() => location.reload()}
            >{tr('update.reload')}</button
          >
        </p>
      {/await}
    {:else if route.name === 'sky'}
      <!-- The Sky view (local-sky dome + tonight's observation table); lazy-loaded (runs an animation loop). -->
      {#await import('./routes/Sky.svelte')}
        <Loading label={tr('sky.loading')} />
      {:then m}
        <m.default />
      {:catch}
        <p class="muted">
          {tr('route.loadError')}
          <button class="btn btn--pill" type="button" onclick={() => location.reload()}
            >{tr('update.reload')}</button
          >
        </p>
      {/await}
    {:else if route.name === 'learn'}
      <!-- The Learn guide (how the panchanga works); lazy-loaded (runs an animation loop). -->
      {#await import('./routes/Learn.svelte')}
        <Loading label={tr('learn.loading')} />
      {:then m}
        <m.default />
      {:catch}
        <p class="muted">
          {tr('route.loadError')}
          <button class="btn btn--pill" type="button" onclick={() => location.reload()}
            >{tr('update.reload')}</button
          >
        </p>
      {/await}
    {:else if route.name === 'settings'}
      <Settings />
    {/if}
  </main>

  <!-- Mirror the masthead's garland to mark the end of the page -->
  <div class="title-ornament title-ornament--end" aria-hidden="true">
    <span class="title-ornament__rule"></span>
    <PetalArt />
    <span class="title-ornament__rule"></span>
  </div>

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
    height: 44px;
    padding: 0 14px;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink);
    background: var(--paper-2);
    cursor: pointer;
    text-decoration: none;
    transition: background 0.15s;
    /* Prevent the pill from pushing the controls off-screen on narrow viewports */
    min-width: 0;
    max-width: 46vw;
    overflow: hidden;
  }
  .loc-pill:hover {
    background: var(--paper-3);
    text-decoration: none;
  }
  .loc-pill svg {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
  }
  .loc-pill span {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
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
    font-size: 17px;
    font-weight: 600;
    color: var(--red);
    letter-spacing: 0.1em;
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
  .lang-btn {
    color: var(--ink-soft);
  }
  .lang-btn .lang-svg {
    width: 22px;
    height: 22px;
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
  /* Garland: thin gold rules on either side of the lotus-and-leaves PetalArt. */
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
  /* The same garland repeated before the footer to mark page-end —
     book-printing convention (frontispiece at top, colophon ornament at bottom) */
  .title-ornament--end {
    margin-top: 56px;
    margin-bottom: 16px;
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
     the only italic treatment in the masthead, so it reads as a name
     rather than chrome. */
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
  /* Refined "raised tab" bar: a thin baseline rule the tabs sit on, the active
     tab lifted on a soft paper panel with rounded top + a red underline that
     meets the baseline (a bookmark/file-tab feel that suits the letterpress
     look). Horizontally scrollable on narrow screens. */
  .tabs {
    display: flex;
    gap: 2px;
    /* `safe center` centres when the row fits but falls back to start-aligned
       (instead of clipping the first tab) once it overflows and scrolls */
    justify-content: safe center;
    margin: 14px 0 24px;
    padding: 0 8px;
    overflow-x: auto;
    scrollbar-width: none;
    border-bottom: 1px solid var(--line);
  }
  .tabs::-webkit-scrollbar {
    display: none;
  }
  :global(.tab) {
    font-family: var(--font-serif);
    font-size: 17px;
    font-weight: 600;
    letter-spacing: 0.01em;
    padding: 8px 17px 9px;
    margin-bottom: -1px; /* overlap the baseline rule */
    color: var(--ink-soft);
    background: none;
    border: none;
    border-bottom: 2.5px solid transparent;
    border-radius: 7px 7px 0 0;
    cursor: pointer;
    white-space: nowrap;
    transition:
      color 0.18s,
      background 0.18s,
      border-color 0.18s;
    text-decoration: none;
  }
  :global(.tab:hover),
  :global(.tab:focus-visible) {
    color: var(--ink);
    background: color-mix(in srgb, var(--paper-2) 70%, transparent);
    text-decoration: none !important;
  }
  /* Active tab — lifted panel + red underline meeting the baseline. */
  :global(.tab[aria-current='page']) {
    color: var(--red);
    font-weight: 700;
    background: var(--paper-2);
    border-bottom-color: var(--red);
  }
  /* shrink the labels on phones so all five fit without scrolling on a
     typical ≥360px screen; horizontal scroll remains the fallback below that */
  @media (max-width: 460px) {
    :global(.tab) {
      padding: 7px 11px 9px;
      font-size: 14.5px;
    }
  }
  @media (max-width: 360px) {
    :global(.tab) {
      padding: 6px 8px 8px;
      font-size: 13px;
      letter-spacing: 0;
    }
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

  /* Service-worker "new version available" banner. */
  .update-banner {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 0.75rem;
    padding: 0.5rem 0.75rem;
    background: var(--red);
    color: var(--paper);
    border-radius: var(--radius-pill, 999px);
    font-size: 0.85rem;
  }
  .update-banner__text {
    flex: 1;
  }
  .update-banner__reload {
    flex: none;
    padding: 0.25rem 0.7rem;
    border: 1px solid var(--paper);
    border-radius: var(--radius-pill, 999px);
    background: transparent;
    color: var(--paper);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
  .update-banner__reload:hover {
    background: var(--paper);
    color: var(--red);
  }
  .update-banner__dismiss {
    flex: none;
    width: 1.6rem;
    height: 1.6rem;
    display: grid;
    place-items: center;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--paper);
    font-size: 1.2rem;
    line-height: 1;
    cursor: pointer;
  }
  .update-banner__dismiss:hover {
    background: rgba(255, 255, 255, 0.2);
  }
</style>
