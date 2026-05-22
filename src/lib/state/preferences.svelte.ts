// Reactive preferences store. Svelte 5 runes — one shared $state.
//
// Initial values match DEFAULT_PREFERENCES so first render is non-blocking;
// we then hydrate from IndexedDB and persist on every change.

import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  patchPreferences,
  type Preferences,
} from '$lib/storage';
import { browserTimezone } from '$lib/location/timezone';
import { CITIES } from '$lib/location/cities';
import type { Location } from '$lib/panchanga';
import { setLanguage, type Language } from '$lib/i18n';

// Default location: New Delhi when nothing else fits. If the user's
// browser tz matches an India city, prefer New Delhi (the canonical
// Purnimanta reference). For non-IST users, pick the first city whose
// tz matches; fall back to New Delhi if none.
function defaultLocation(): Location {
  const tz = browserTimezone();
  const newDelhi = CITIES.find((c) => c.name === 'New Delhi, India');

  if (tz === 'Asia/Kolkata' && newDelhi) return newDelhi;

  const tzMatch = CITIES.find((c) => c.timezone === tz);
  if (tzMatch) return tzMatch;

  return newDelhi ?? CITIES[0];
}

interface PreferencesState extends Preferences {
  hydrated: boolean;
}

export const preferences = $state<PreferencesState>({
  ...DEFAULT_PREFERENCES,
  location: defaultLocation(),
  hydrated: false,
});

export async function hydratePreferences(): Promise<void> {
  try {
    const loaded = await loadPreferences();
    Object.assign(preferences, loaded);
    if (!preferences.location) preferences.location = defaultLocation();
  } catch {
    // IndexedDB may be unavailable (private mode, locked file). Continue
    // with defaults; user can still use the app for the session.
  } finally {
    preferences.hydrated = true;
    applyTheme(preferences.theme);
    setLanguage(preferences.language as Language);
  }
}

export async function updatePreferences(patch: Partial<Preferences>): Promise<void> {
  // Numerals are an independent preference — switching language does
  // not flip the numeral system. Latin-script digits (1, 2, 3) stay
  // the default; users opt into Devanagari (१, २, ३) via Settings
  // explicitly. (Both are Hindu numerals; the difference is script.)
  Object.assign(preferences, patch);
  if (patch.theme !== undefined) applyTheme(patch.theme);
  if (patch.language !== undefined) setLanguage(patch.language as Language);
  try {
    await patchPreferences(patch);
  } catch {
    // Persistence failed — UI state is still updated; the next session
    // will fall back to defaults.
  }
}

function applyTheme(theme: 'auto' | 'light' | 'dark'): void {
  if (typeof document === 'undefined') return;
  if (theme === 'auto') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}
