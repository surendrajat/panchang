<script lang="ts">
  import { preferences, updatePreferences } from '$lib/state/preferences.svelte';
  import type { AyanamsaSystem, MonthSystem } from '$lib/panchanga';
  import { t, type TranslationKey } from '$lib/i18n';

  const tr = (k: TranslationKey) => t(k, undefined, preferences.language);

  const ayanamsaOptions: { value: AyanamsaSystem; key: TranslationKey }[] = [
    { value: 'lahiri', key: 'ayanamsa.lahiri' },
    { value: 'true_chitra', key: 'ayanamsa.trueChitra' },
    { value: 'raman', key: 'ayanamsa.raman' },
    { value: 'kp', key: 'ayanamsa.kp' },
    { value: 'yukteshwar', key: 'ayanamsa.yukteshwar' },
  ];

  const monthOptions: { value: MonthSystem; key: TranslationKey }[] = [
    { value: 'amanta', key: 'monthSystem.amanta' },
    { value: 'purnimanta', key: 'monthSystem.purnimanta' },
  ];

  const lagnaOptions: { value: 'swiss' | 'drik'; key: TranslationKey }[] = [
    { value: 'swiss', key: 'lagnaMethod.swiss' },
    { value: 'drik', key: 'lagnaMethod.drik' },
  ];
</script>

<div class="stack">
  <label class="label">
    <span class="lab">{tr('settings.ayanamsa')}</span>
    <select
      class="select"
      value={preferences.ayanamsa}
      onchange={(e) =>
        updatePreferences({
          ayanamsa: (e.currentTarget as HTMLSelectElement).value as AyanamsaSystem,
        })}
    >
      {#each ayanamsaOptions as o (o.value)}
        <option value={o.value}>{tr(o.key)}</option>
      {/each}
    </select>
  </label>

  <label class="label">
    <span class="lab">{tr('settings.monthSystem')}</span>
    <select
      class="select"
      value={preferences.monthSystem}
      onchange={(e) =>
        updatePreferences({
          monthSystem: (e.currentTarget as HTMLSelectElement).value as MonthSystem,
        })}
    >
      {#each monthOptions as o (o.value)}
        <option value={o.value}>{tr(o.key)}</option>
      {/each}
    </select>
  </label>

  <label class="label">
    <span class="lab"
      >{tr('settings.lagnaMethod')}
      <span class="hint">{tr('settings.lagnaMethodHint')}</span></span
    >
    <select
      class="select"
      value={preferences.lagnaMethod}
      onchange={(e) =>
        updatePreferences({
          lagnaMethod: (e.currentTarget as HTMLSelectElement).value as 'swiss' | 'drik',
        })}
    >
      {#each lagnaOptions as o (o.value)}
        <option value={o.value}>{tr(o.key)}</option>
      {/each}
    </select>
  </label>
</div>
