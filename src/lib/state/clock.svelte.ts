// A single reactive "now", refreshed when the app regains focus or visibility.
// Views keyed on the current day (the Today card, the masthead samvat strip)
// read this so a backgrounded PWA reopened on a later day rolls over to the
// correct date instead of showing whatever day it was mounted on. We refresh on
// focus/visibility rather than polling, so there is no periodic re-render; and
// since panchanga cache keys are per-day, a same-day refresh is a cheap cache
// hit (only a real day change triggers a recompute).
let nowMs = $state(Date.now());

function sync(): void {
  nowMs = Date.now();
}

if (typeof window !== 'undefined') {
  window.addEventListener('focus', sync);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') sync();
  });
}

export const clock = {
  /** Current instant; reactive — re-reads when the app regains focus/visibility. */
  get now(): Date {
    // A fresh, immutable Date derived from the reactive nowMs — never stored or
    // mutated, so SvelteDate isn't needed here.
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    return new Date(nowMs);
  },
};
