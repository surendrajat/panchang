<script lang="ts">
  import SettingsPanel from '$components/SettingsPanel.svelte';
  import LocationPicker from '$components/LocationPicker.svelte';
  import { preferences, updatePreferences } from '$lib/state/preferences.svelte';
  import { clearAll, DEFAULT_PREFERENCES } from '$lib/storage';
  import { t, type TranslationKey, type Language } from '$lib/i18n';

  const tr = (k: TranslationKey, vars?: Record<string, string | number>) =>
    t(k, vars, preferences.language);

  let clearedAt = $state<Date | null>(null);
  let resetAt = $state<Date | null>(null);

  async function clearCache(): Promise<void> {
    await clearAll();
    clearedAt = new Date();
  }

  async function resetDefaults(): Promise<void> {
    if (!confirm(tr('settings.resetConfirm'))) return;
    // Preserve the user's current location across reset — clearing it
    // would land them on "0.00, 0.00 (UTC)" and break all computation
    // until they reselect a city. The other preferences fall back to
    // documented defaults.
    const { id: _id, location: _loc, ...rest } = DEFAULT_PREFERENCES;
    await updatePreferences(rest);
    resetAt = new Date();
  }
</script>

<section class="view stack stack--lg">
  <h1 class="page-title">{tr('settings.title')}</h1>

  <div class="card">
    <h2>
      {tr('settings.location')}
      <span class="deva">{tr('kicker.location')}</span>
    </h2>
    <div class="desc">{tr('settings.locationDesc')}</div>
    <LocationPicker
      location={preferences.location}
      onChange={(loc) => updatePreferences({ location: loc })}
    />
  </div>

  <!-- Display before Calculation: language / theme / numerals are the
       knobs a casual user is most likely to touch on first visit;
       ayanamsa + month system are far rarer adjustments. -->
  <div class="card">
    <h2>
      {tr('settings.display')}
      <span class="deva">{tr('kicker.display')}</span>
    </h2>
    <div class="stack">
      <label class="label">
        <span class="lab">{tr('settings.language')}</span>
        <select
          class="select"
          value={preferences.language}
          onchange={(e) =>
            updatePreferences({
              language: (e.currentTarget as HTMLSelectElement).value as Language,
            })}
        >
          <option value="en">{tr('settings.langEnglish')}</option>
          <option value="hi">{tr('settings.langHindi')}</option>
        </select>
      </label>
      <label class="label">
        <span class="lab">{tr('settings.numerals')}</span>
        <select
          class="select"
          value={preferences.numerals}
          onchange={(e) =>
            updatePreferences({
              numerals: (e.currentTarget as HTMLSelectElement).value as 'latin' | 'devanagari',
            })}
        >
          <option value="latin">{tr('settings.numeralsLatin')}</option>
          <option value="devanagari">{tr('settings.numeralsDevanagari')}</option>
        </select>
      </label>
      <label class="label">
        <span class="lab">{tr('settings.timeFormat')}</span>
        <select
          class="select"
          value={preferences.timeFormat}
          onchange={(e) =>
            updatePreferences({
              timeFormat: (e.currentTarget as HTMLSelectElement).value as '12h' | '24h',
            })}
        >
          <option value="24h">{tr('settings.timeFormat24')}</option>
          <option value="12h">{tr('settings.timeFormat12')}</option>
        </select>
      </label>
      <label class="label">
        <span class="lab">{tr('settings.theme')}</span>
        <select
          class="select"
          value={preferences.theme}
          onchange={(e) =>
            updatePreferences({
              theme: (e.currentTarget as HTMLSelectElement).value as 'auto' | 'light' | 'dark',
            })}
        >
          <option value="auto">{tr('settings.themeAuto')}</option>
          <option value="light">{tr('settings.themeLight')}</option>
          <option value="dark">{tr('settings.themeDark')}</option>
        </select>
      </label>
      <label class="label">
        <span class="lab">{tr('settings.weekStart')}</span>
        <select
          class="select"
          value={preferences.weekStart}
          onchange={(e) =>
            updatePreferences({
              weekStart: (e.currentTarget as HTMLSelectElement).value as 'sunday' | 'monday',
            })}
        >
          <option value="sunday">{tr('settings.weekSunday')}</option>
          <option value="monday">{tr('settings.weekMonday')}</option>
        </select>
      </label>
    </div>
  </div>

  <div class="card">
    <h2>
      {tr('settings.calculation')}
      <span class="deva">{tr('kicker.calculation')}</span>
    </h2>
    <div class="desc">{tr('settings.calculationDesc')}</div>
    <SettingsPanel />
  </div>

  <div class="card">
    <h2>
      {tr('settings.dataPrivacy')}
      <span class="deva">{tr('kicker.dataPrivacy')}</span>
    </h2>
    <div class="desc">{tr('settings.dataPrivacyDesc')}</div>
    <div class="btn-row">
      <button class="btn" type="button" onclick={clearCache}>{tr('settings.clearCache')}</button>
      <button class="btn btn--danger" type="button" onclick={resetDefaults}
        >{tr('settings.resetDefaults')}</button
      >
      {#if clearedAt}
        <span class="muted small"
          >{tr('settings.cacheClearedAt', { time: clearedAt.toLocaleTimeString() })}</span
        >
      {/if}
      {#if resetAt}
        <span class="muted small"
          >{tr('settings.resetAt', { time: resetAt.toLocaleTimeString() })}</span
        >
      {/if}
    </div>
  </div>

  <div class="card">
    <h2>
      {tr('settings.about')}
      <span class="deva">{tr('kicker.about')}</span>
    </h2>
    <div class="about-row">
      <span class="k">{tr('settings.aboutMethod')}</span><span class="v"
        >Drik · Lahiri · geocentric</span
      >
    </div>
    <div class="about-row">
      <span class="k">{tr('settings.aboutEphemeris')}</span><span class="v"
        >astronomy-engine 2.1</span
      >
    </div>
    <div class="about-row">
      <span class="k">{tr('settings.aboutLicense')}</span><span class="v">AGPL-3.0-or-later</span>
    </div>
    <div class="about-row">
      <span class="k">{tr('settings.aboutMethodology')}</span>
      <span class="v"
        ><a
          href="https://github.com/surendrajat/panchang/tree/main/docs/guide"
          rel="noopener"
          target="_blank">{tr('settings.methodologyLink')}</a
        ></span
      >
    </div>
    <div class="about-row">
      <span class="k">{tr('settings.aboutSource')}</span>
      <span class="v"
        ><a href="https://github.com/surendrajat/panchang" rel="noopener" target="_blank"
          >{tr('settings.sourceLink')}</a
        ></span
      >
    </div>
  </div>
</section>

<style>
  .page-title {
    font-family: var(--font-serif);
    font-weight: 600;
    font-size: 40px;
    letter-spacing: -0.02em;
    margin-bottom: 6px;
  }
  .btn-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
  }
  .small {
    font-size: 12px;
  }
  .about-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 11px 0;
    border-top: 1px solid var(--line-2);
    font-size: 14px;
  }
  .about-row:first-of-type {
    border-top: none;
  }
  .about-row .k {
    color: var(--ink-soft);
  }
  .about-row .v {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .about-row .v :global(a) {
    color: var(--red);
    text-decoration: none;
  }
</style>
