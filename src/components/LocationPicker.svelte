<script lang="ts">
  import type { Location } from '$lib/panchanga';
  import { searchCities, nearestCityWithDistance, type City } from '$lib/location/cities';
  import { requestGeolocation } from '$lib/location/geolocation';
  import { browserTimezone } from '$lib/location/timezone';

  // If GPS fix is within this radius of a known city, label it with the
  // city name; otherwise show bare coordinates (avoids misleading "Paris
  // (near)" when the user is actually in rural Burgundy or eastern Turkey).
  const NEAR_CITY_THRESHOLD_KM = 50;

  function formatCoords(lat: number, lon: number): string {
    const ns = lat >= 0 ? 'N' : 'S';
    const ew = lon >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(2)}°${ns}, ${Math.abs(lon).toFixed(2)}°${ew}`;
  }
  import { preferences } from '$lib/state/preferences.svelte';
  import { t, type TranslationKey } from '$lib/i18n';

  const tr = (k: TranslationKey) => t(k, undefined, preferences.language);

  interface PropsInner {
    // Nullable: on first run (or after a reset bug) the preference
    // store may not yet hold a location; we render a "no location"
    // affordance instead of the spurious "0.00, 0.00 (UTC)" line.
    location: Location | null;
    onChange: (loc: Location) => void;
  }
  let { location, onChange }: PropsInner = $props();

  let query = $state('');
  let results = $derived(query ? searchCities(query, 8) : []);
  let busy = $state(false);
  let error: string | null = $state(null);

  function pick(c: City): void {
    onChange({
      name: c.name,
      latitude: c.latitude,
      longitude: c.longitude,
      altitude: c.altitude,
      timezone: c.timezone,
    });
    query = '';
  }

  async function useMyLocation(): Promise<void> {
    error = null;
    busy = true;
    try {
      const pos = await requestGeolocation();
      const { city, distanceKm } = nearestCityWithDistance(pos.latitude, pos.longitude);
      // Use the browser's own IANA timezone (device setting) — more
      // accurate than deriving from nearest-city distance, especially
      // near timezone boundaries. Fall back to nearest city's zone if
      // the browser returns nothing meaningful.
      const tz = browserTimezone() || city.timezone;
      // Only name after the nearest city when the GPS fix is actually
      // close to it; otherwise show coordinates to avoid misleading labels.
      const name =
        distanceKm <= NEAR_CITY_THRESHOLD_KM
          ? `${city.name} (near)`
          : formatCoords(pos.latitude, pos.longitude);
      onChange({
        name,
        latitude: pos.latitude,
        longitude: pos.longitude,
        altitude: pos.altitude ?? city.altitude,
        timezone: tz,
      });
    } catch (e) {
      error = e instanceof Error ? e.message : 'Could not determine your location.';
    } finally {
      busy = false;
    }
  }
</script>

<div class="location-picker stack stack--sm">
  <!-- Placeholder ("Search a city…" / "नगर खोजें…") is sufficient
       affordance; the redundant "Search" label above was noise. -->
  <label class="label">
    <span class="visually-hidden">{tr('settings.searchCity')}</span>
    <input
      class="input"
      type="search"
      autocomplete="off"
      placeholder={tr('settings.searchCity')}
      bind:value={query}
    />
  </label>
  {#if results.length > 0}
    <ul class="results" role="listbox">
      {#each results as c (c.searchKey)}
        <li>
          <button class="result-row" type="button" onclick={() => pick(c)}>
            <span class="serif">{c.name}</span>
            <span class="muted">· {c.timezone}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
  <div class="loc-row">
    <button class="btn" type="button" onclick={useMyLocation} disabled={busy}>
      {busy ? tr('settings.locating') : tr('settings.useMyLocation')}
    </button>
    {#if location}
      <span class="cur">
        {tr('settings.currentLocation')}
        <b>{location.name ?? `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`}</b
        >
        <span class="muted">({location.timezone})</span>
      </span>
    {:else}
      <span class="cur muted">{tr('settings.noLocation')}</span>
    {/if}
  </div>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
</div>

<style>
  .results {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 16rem;
    overflow-y: auto;
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--paper-3);
  }
  .result-row {
    width: 100%;
    padding: 10px 14px;
    text-align: left;
    background: transparent;
    border: 0;
    border-bottom: 1px solid var(--line-2);
    font-size: 14px;
    cursor: pointer;
    color: var(--ink);
  }
  .result-row:last-child {
    border-bottom: 0;
  }
  .result-row:hover {
    background: var(--paper-2);
  }
  .loc-row {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    margin-top: 12px;
  }
  .cur {
    color: var(--ink-soft);
    font-size: 14px;
  }
  .cur b {
    color: var(--ink);
  }
  .error {
    color: var(--red);
    font-size: 13px;
  }
</style>
