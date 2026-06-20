// Service-worker update state. main.ts's vite-plugin-pwa registration calls
// `onSwUpdateReady` when a new build's service worker is waiting; the App shows
// a banner and calls `applySwUpdate` to activate it and reload.

export const swUpdate = $state<{ available: boolean }>({ available: false });

let reload: (() => void) | null = null;

// Called from the SW registration's onNeedRefresh. Stores the reload action
// (updateSW(true)) and flips the banner on.
export function onSwUpdateReady(doReload: () => void): void {
  reload = doReload;
  swUpdate.available = true;
}

export function applySwUpdate(): void {
  reload?.();
}

export function dismissSwUpdate(): void {
  swUpdate.available = false;
}
