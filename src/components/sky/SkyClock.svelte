<script lang="ts">
  // Shared time + speed widget used by both the Sky tab and the #/learn notebook.
  // Owns the time model (a capped rAF loop) and exposes the current moment via a
  // bindable `date` (and `speed`/`live` so a parent's per-cell "Run" buttons can
  // drive it). The clock is fixed-width with tabular figures so the date never
  // wobbles as it ticks or plays; the vāra (weekday) sits on its own line.
  import type { Snippet } from 'svelte';
  import { preferences } from '$lib/state/preferences.svelte';
  import { applyNumerals } from '$lib/format/numerals';

  let {
    date = $bindable(new Date()),
    speed = $bindable(0),
    live = $bindable(true),
    extra,
  }: { date?: Date; speed?: number; live?: boolean; extra?: Snippet } = $props();

  const lang = $derived(preferences.language);
  const num = (s: string | number) => applyNumerals(String(s), preferences.numerals);
  const hi = (h: string, e: string) => (lang === 'hi' ? h : e);

  // ── time model (capped ~30 fps; idle when paused; torn down on unmount) ─────
  $effect(() => {
    if (!live && speed === 0) return;
    let raf = 0;
    let last = performance.now();
    let liveAcc = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const dt = t - last;
      if (dt < 30) return;
      last = t;
      if (live) {
        liveAcc += dt;
        if (liveAcc >= 1000) {
          date = new Date();
          liveAcc = 0;
        }
      } else date = new Date(date.getTime() + speed * dt);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  const SPEEDS = [
    { key: 'pause', live: false, speed: 0, hi: 'रोकें', en: 'Pause' },
    { key: 'hour', live: false, speed: 3600, hi: '1 घं/से.', en: '1 hr/s' },
    { key: 'day', live: false, speed: 86400, hi: '1 दिन/से.', en: '1 day/s' },
    { key: 'week', live: false, speed: 604800, hi: '1 सप्ताह/से.', en: '1 wk/s' },
  ];
  const activeKey = $derived(
    live ? 'now' : (SPEEDS.find((s) => s.speed === speed)?.key ?? 'pause'),
  );
  function setSpeed(s: { live: boolean; speed: number }) {
    live = s.live;
    speed = s.speed;
  }
  function goNow() {
    live = true;
    speed = 0;
    date = new Date();
  }

  // "WED 24 Jun 2026, 16:01" — the weekday (vāra), uppercased, leads the date;
  // the day is 2-digit and figures are tabular so nothing shifts sideways as the
  // time ticks or plays — digits change in place.
  const wdFmt = $derived(
    new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-GB', {
      weekday: 'short',
      timeZone: preferences.location?.timezone,
    }),
  );
  const fmt = $derived(
    new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: preferences.timeFormat === '12h',
      numberingSystem: 'latn',
      timeZone: preferences.location?.timezone,
    }),
  );
  const clockLabel = $derived(`${wdFmt.format(date).toUpperCase()} ${num(fmt.format(date))}`);
</script>

<div class="timebar">
  <div class="clock">{clockLabel}</div>
  <div class="speeds" role="group" aria-label={hi('समय गति', 'Time speed')}>
    <button type="button" class:on={live} onclick={goNow}>● {hi('अभी', 'Now')}</button>
    {#each SPEEDS as s (s.key)}
      <button type="button" class:on={activeKey === s.key} onclick={() => setSpeed(s)}
        >{hi(s.hi, s.en)}</button
      >
    {/each}
  </div>
  {#if extra}<div class="extra">{@render extra()}</div>{/if}
  <p class="speed-hint">
    {hi('💡 समय की गति यहाँ टैप करके बढ़ाई जा सकती है', '💡 Tap a speed to fast-forward time')}
  </p>
</div>

<style>
  .timebar {
    position: sticky;
    top: 0;
    z-index: 20;
    text-align: center;
    margin-bottom: 1rem;
    padding: 0.5rem 0 0.6rem;
    background: color-mix(in srgb, var(--paper) 92%, transparent);
    backdrop-filter: blur(6px);
    border-bottom: 1px solid var(--line);
  }
  /* backdrop blur is a known jank source on mobile GPUs (continuously re-sampled
     while a wheel animates under the sticky bar) — drop it on touch / small screens */
  @media (hover: none), (max-width: 600px) {
    .timebar {
      backdrop-filter: none;
      background: var(--paper);
    }
  }
  /* fixed min-width + tabular figures so the date never wobbles as it ticks or
     plays — the digits change in place, nothing shifts sideways */
  .clock {
    display: inline-block;
    min-width: 15rem;
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    line-height: 1.5;
  }
  .speeds {
    display: inline-flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 2px;
    margin-top: 0.5rem;
    padding: 3px;
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: var(--radius-pill, 999px);
  }
  .speeds button {
    padding: 0.32rem 0.72rem;
    border: none;
    border-radius: var(--radius-pill, 999px);
    background: none;
    color: var(--ink-soft);
    font: inherit;
    font-size: 0.8rem;
    cursor: pointer;
    white-space: nowrap;
    transition:
      background 0.15s,
      color 0.15s;
  }
  @media (max-width: 460px) {
    .speeds {
      gap: 1px;
      padding: 2px;
    }
    .speeds button {
      padding: 0.3rem 0.5rem;
      font-size: 0.72rem;
    }
  }
  .speeds button:hover {
    color: var(--ink);
  }
  .speeds button.on {
    background: var(--red);
    color: var(--paper);
    font-weight: 600;
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.18);
  }
  .extra {
    margin-top: 0.5rem;
  }
  .speed-hint {
    margin: 0.55rem 0 0;
    font-size: 0.72rem;
    color: var(--ink-faint);
    line-height: 1.2;
    font-style: italic;
  }
</style>
