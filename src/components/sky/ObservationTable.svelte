<script lang="ts">
  // "Tonight's sky" — a practical observing table: for the Moon and the five
  // naked-eye planets, when each rises and sets (tonight, local), where it is
  // right now (height above the horizon + compass direction), and how bright it
  // is. Rows currently above the horizon are highlighted. Rise/set + magnitude
  // recompute only when the civil day changes; only the live alt/az updates per
  // frame, so this stays light.
  import { preferences } from '$lib/state/preferences.svelte';
  import { bodyArc, bodyAltAz, bodyMagnitude, type SkyBody } from '$lib/astro';
  import { grahaLabel } from '$lib/labels';
  import { applyNumerals } from '$lib/format/numerals';
  import BodyIcon from '../BodyIcon.svelte';

  let { date }: { date: Date } = $props();

  const lang = $derived(preferences.language);
  const num = (s: string | number) => applyNumerals(String(s), preferences.numerals);
  const hi = (h: string, e: string) => (lang === 'hi' ? h : e);

  const BODIES: SkyBody[] = ['moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
  const DIRS_EN = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const DIRS_HI = ['उ', 'उ-पू', 'पू', 'द-पू', 'द', 'द-प', 'प', 'उ-प'];
  const DAY = 86_400_000;

  const timeFmt = $derived(
    new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: preferences.timeFormat === '12h',
      numberingSystem: 'latn',
      timeZone: preferences.location?.timezone,
    }),
  );
  const fmtTime = (ms: number) => num(timeFmt.format(new Date(ms)));
  const compass = (az: number) =>
    (lang === 'hi' ? DIRS_HI : DIRS_EN)[Math.round((((az % 360) + 360) % 360) / 45) % 8];

  const loc = $derived(preferences.location);
  const locName = $derived(loc?.name?.split(',')[0] ?? '');

  // ── rise/set + magnitude: recompute only when the civil day changes ─────────
  // anchored on the day's noon (NOT `date`), so this derived ignores per-frame ticks
  const dayKey = $derived(Math.floor(date.getTime() / DAY));
  const sun = $derived.by(() => {
    if (!loc) return null;
    return bodyArc('sun', dayKey * DAY + DAY / 2, loc.latitude, loc.longitude);
  });
  const rows = $derived.by(() => {
    if (!loc) return [];
    const anchor = dayKey * DAY + DAY / 2;
    return BODIES.map((body) => ({
      body,
      arc: bodyArc(body, anchor, loc.latitude, loc.longitude),
      mag: bodyMagnitude(body, new Date(anchor)),
    }));
  });
  // ── live position: cheap, updates per frame ─────────────────────────────────
  const positions = $derived.by(() => {
    if (!loc) return {} as Record<string, { alt: number; az: number }>;
    const m: Record<string, { alt: number; az: number }> = {};
    for (const body of BODIES) {
      const { altitude, azimuth } = bodyAltAz(body, date, loc.latitude, loc.longitude);
      m[body] = { alt: altitude, az: azimuth };
    }
    return m;
  });
</script>

{#if loc}
  <figure class="obs">
    <figcaption class="obs__cap">
      <span class="obs__title">{hi('आज रात का आकाश', 'Tonight’s sky')}</span>
      <span class="obs__sub">
        {locName}{#if sun}
          · {hi('सूर्यास्त', 'Sun sets')}
          {fmtTime(sun.setMs)} · {hi('उदय', 'rises')}
          {fmtTime(sun.riseMs)}{/if}
      </span>
    </figcaption>
    <table class="obs__table">
      <thead>
        <tr>
          <th class="l">{hi('पिंड', 'Body')}</th>
          <th>{hi('उदय', 'Rise')}</th>
          <th>{hi('अस्त', 'Set')}</th>
          <th>{hi('अभी', 'Now')}</th>
          <th>{hi('कांति', 'Mag')}</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as r (r.body)}
          {@const pos = positions[r.body]}
          {@const up = !!pos && pos.alt > 0}
          <tr class:up>
            <td class="obs__body l">
              <svg viewBox="0 0 28 28" class="obs__icon" aria-hidden="true">
                <BodyIcon kind={r.body} cx={14} cy={14} r={7} />
              </svg>
              {grahaLabel(r.body)}
            </td>
            <td>{r.arc ? fmtTime(r.arc.riseMs) : '—'}</td>
            <td>{r.arc ? fmtTime(r.arc.setMs) : '—'}</td>
            <td class="obs__now"
              >{up
                ? `${num(Math.round(pos.alt))}° ${compass(pos.az)}`
                : hi('क्षितिज नीचे', 'below')}</td
            >
            <td class="obs__mag">{num(r.mag.toFixed(1))}</td>
          </tr>
        {/each}
      </tbody>
    </table>
    <p class="obs__note">
      {hi(
        '“अभी” = इस समय क्षितिज से ऊँचाई व दिशा; ऊपर वाले अभी दिख सकते हैं। कांति कम = अधिक चमकीला।',
        '“Now” = current height above the horizon + direction; highlighted rows are up now. Lower magnitude = brighter.',
      )}
    </p>
  </figure>
{/if}

<style>
  .obs {
    margin: 1.5rem auto 0;
    max-width: 460px;
  }
  .obs__cap {
    text-align: center;
    margin-bottom: 0.6rem;
  }
  .obs__title {
    display: block;
    font-family: var(--font-serif);
    font-size: 1.15rem;
    font-weight: 600;
    color: var(--ink);
  }
  .obs__sub {
    font-size: 0.8rem;
    color: var(--ink-soft);
    font-variant-numeric: tabular-nums;
  }
  .obs__table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.86rem;
    font-variant-numeric: tabular-nums;
  }
  .obs__table th {
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 700;
    color: var(--ink-faint);
    text-align: center;
    padding: 0 0.3rem 0.35rem;
  }
  .obs__table th.l {
    text-align: left;
  }
  .obs__table td {
    text-align: center;
    padding: 0.4rem 0.3rem;
    border-top: 1px solid var(--line-2);
    color: var(--ink);
    white-space: nowrap;
  }
  .obs__table td.l {
    text-align: left;
  }
  .obs__body {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-weight: 600;
  }
  .obs__icon {
    width: 20px;
    height: 20px;
    flex: none;
  }
  .obs__now {
    color: var(--ink-soft);
  }
  .obs__mag {
    color: var(--ink-soft);
  }
  /* a body that's above the horizon right now — observable */
  .obs__table tr.up td {
    background: color-mix(in srgb, var(--gold) 12%, transparent);
  }
  .obs__table tr.up .obs__now {
    color: var(--ink);
    font-weight: 600;
  }
  .obs__note {
    margin: 0.6rem 0 0;
    font-size: 0.76rem;
    color: var(--ink-faint);
    line-height: 1.45;
  }
</style>
