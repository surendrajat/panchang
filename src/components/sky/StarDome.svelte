<script module lang="ts">
  let _uid = 0;
</script>

<script lang="ts">
  // The local sky as an all-sky dome (zenith at the centre, horizon at the rim;
  // N up, E left, S down, W right) — extracted from routes/Sky.svelte so the
  // #/learn guide can reuse it. Bright stars carry their Sanskrit names, many
  // of which ARE nakshatras (Rohini = Aldebaran, Chitra = Spica…), so the dome
  // doubles as a nakshatra map. Pass atmosphere={false} for a planetarium look
  // (always-dark sky → stars visible regardless of the local time of day).
  import { preferences } from '$lib/state/preferences.svelte';
  import { bodyAltAz, starAltAz, bodyArc, type SkyBody } from '$lib/astro';
  import { grahaLabel } from '$lib/labels';
  import { moonLitPath, BRIGHT_STARS, CONSTELLATIONS, POLARIS } from '$lib/sky';
  import BodyIcon from '../BodyIcon.svelte';

  let {
    date, // the moment to render
    illum, // Moon illumination 0..1 (for the phase shape)
    elong, // Sun→Moon elongation 0..360 (waxing/waning)
    controls = false, // show the gear + options menu
    grahas = true,
    labels = false,
    stars = true,
    atmosphere = true,
    paths = true,
    directions = true,
    caption,
  }: {
    date: Date;
    illum: number;
    elong: number;
    controls?: boolean;
    grahas?: boolean;
    labels?: boolean;
    stars?: boolean;
    atmosphere?: boolean;
    paths?: boolean;
    directions?: boolean;
    caption?: import('svelte').Snippet;
  } = $props();

  _uid += 1;
  const uid = `sd${_uid}`;

  const lang = $derived(preferences.language);
  const hi = (h: string, e: string) => (lang === 'hi' ? h : e);
  const tn = (dev: string, tr: string, en: string) =>
    lang === 'hi' ? dev : preferences.transliteration ? tr : en;

  // The gear menu (controls=true) flips internal toggles; without controls the
  // fixed props drive the view. Internal state is seeded from the same defaults
  // as the props (seeding from the props directly would only read once).
  let tGrahas = $state(true);
  let tLabels = $state(false);
  let tStars = $state(true);
  let tAtmo = $state(true);
  let tPaths = $state(true);
  let tDirs = $state(true);
  let menu = $state(false);
  const fGrahas = $derived(controls ? tGrahas : grahas);
  const fLabels = $derived(controls ? tLabels : labels);
  const fStars = $derived(controls ? tStars : stars);
  const fAtmo = $derived(controls ? tAtmo : atmosphere);
  const fPaths = $derived(controls ? tPaths : paths);
  const fDirs = $derived(controls ? tDirs : directions);

  // hover (desktop) / tap (phones) reveals one body or star name at a time
  let revealed = $state<string | null>(null);
  function revealable(node: SVGElement, key: string) {
    const toggle = () => (revealed = revealed === key ? null : key);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    };
    node.addEventListener('click', toggle);
    node.addEventListener('keydown', onKey);
    return {
      destroy() {
        node.removeEventListener('click', toggle);
        node.removeEventListener('keydown', onKey);
      },
    };
  }

  const DOME = 200;
  const DC = DOME / 2;
  const DR = 82;
  const craters = [
    [-3, -2, 2.4],
    [3, 1.5, 1.7],
    [0.5, 4, 1.3],
    [-4.5, 3, 1],
  ];

  function domePt(az: number, alt: number): [number, number] {
    const r = (DR * (90 - alt)) / 90; // zenith → centre, horizon → rim
    const a = (az * Math.PI) / 180;
    return [DC - r * Math.sin(a), DC - r * Math.cos(a)];
  }
  function domeTrack(body: SkyBody, centerMs: number, lat: number, lon: number): string {
    const pts: string[] = [];
    const arc = bodyArc(body, centerMs, lat, lon);
    if (arc) {
      const N = 64;
      for (let i = 0; i <= N; i++) {
        const t = new Date(arc.riseMs + ((arc.setMs - arc.riseMs) * i) / N);
        const { azimuth, altitude } = bodyAltAz(body, t, lat, lon);
        pts.push(
          domePt(azimuth, Math.max(0, altitude))
            .map((n) => n.toFixed(1))
            .join(','),
        );
      }
    } else {
      const N = 72;
      for (let i = 0; i <= N; i++) {
        const t = new Date(centerMs - 12 * 3_600_000 + (i * 24 * 3_600_000) / N);
        const { azimuth, altitude } = bodyAltAz(body, t, lat, lon);
        if (altitude >= 0)
          pts.push(
            domePt(azimuth, altitude)
              .map((n) => n.toFixed(1))
              .join(','),
          );
      }
    }
    return pts.join(' ');
  }

  const ms = $derived(date.getTime());
  const domeCenter = $derived(Math.floor(ms / 3_600_000) * 3_600_000);
  const domeTracks = $derived.by(() => {
    const loc = preferences.location;
    if (!loc) return null;
    return {
      sun: domeTrack('sun', domeCenter, loc.latitude, loc.longitude),
      moon: domeTrack('moon', domeCenter, loc.latitude, loc.longitude),
    };
  });
  const domeSunMoon = $derived.by(() => {
    const loc = preferences.location;
    if (!loc) return [];
    return (['sun', 'moon'] as const).map((body) => {
      const { azimuth, altitude } = bodyAltAz(body, date, loc.latitude, loc.longitude);
      return { body, azimuth, altitude, pt: domePt(azimuth, altitude) };
    });
  });
  const domePlanets = $derived.by(() => {
    const loc = preferences.location;
    if (!loc) return [];
    return (['mercury', 'venus', 'mars', 'jupiter', 'saturn'] as const).map((body) => {
      const { azimuth, altitude } = bodyAltAz(body, date, loc.latitude, loc.longitude);
      return { body, azimuth, altitude, pt: domePt(azimuth, altitude) };
    });
  });
  const domeNow = $derived(preferences.location ? [...domeSunMoon, ...domePlanets] : null);
  const domeLoc = $derived(preferences.location?.name?.split(',')[0] ?? '');
  const domeMoonHidden = $derived.by(() => {
    const sun = domeSunMoon[0];
    const moon = domeSunMoon[1];
    if (!sun || !moon || sun.altitude < 0) return false;
    return Math.hypot(sun.pt[0] - moon.pt[0], sun.pt[1] - moon.pt[1]) < 13;
  });
  // Planets are tiny points that genuinely vanish in daylight, so they fade out
  // via a whole-body opacity (1 while the Sun is down → fully opaque at night).
  const dayFade = $derived.by(() => {
    const sunAlt = domeSunMoon[0]?.altitude ?? -90;
    return !fAtmo || sunAlt <= 0 ? 1 : Math.max(0.45, 1 - sunAlt / 15);
  });
  const showStars = $derived(fStars && (!fAtmo || (domeSunMoon[0]?.altitude ?? -90) <= 0));

  function mixRGB(a: number[], b: number[], t: number): number[] {
    const k = Math.max(0, Math.min(1, t));
    return a.map((v, i) => Math.round(v + (b[i] - v) * k));
  }
  const toRGB = (a: number[]) => `rgb(${a.join(',')})`;
  const daySky = $derived.by(() => {
    const sunAlt = domeSunMoon[0]?.altitude ?? -90;
    const day = fAtmo ? Math.max(0, Math.min(1, (sunAlt + 6) / 12)) : 0;
    return {
      sunAlt,
      zen: mixRGB([22, 31, 68], [39, 82, 132], day),
      mid: mixRGB([39, 49, 92], [72, 122, 168], day),
      rim: mixRGB([106, 81, 96], [150, 182, 208], day),
    };
  });
  const domeSky = $derived({
    zen: toRGB(daySky.zen),
    mid: toRGB(daySky.mid),
    rim: toRGB(daySky.rim),
  });
  // The Moon never goes transparent — in daylight it stays fully OPAQUE (so it
  // always occludes whatever is behind it; you never see sky or planets through
  // it) and instead its colours wash toward the bright sky, reading as a pale
  // daytime Moon. wash is 0 while the Sun is below the horizon → true night
  // colours (dark limb solid #363842, lit limb cream).
  const moonColors = $derived.by(() => {
    const wash = !fAtmo || daySky.sunAlt <= 0 ? 0 : Math.min(0.42, daySky.sunAlt / 55);
    return {
      disc: toRGB(mixRGB([54, 56, 66], daySky.mid, wash)),
      lit: toRGB(mixRGB([241, 231, 203], daySky.mid, wash)),
      crater: toRGB(mixRGB([207, 199, 180], daySky.mid, wash)),
    };
  });

  const domeStars = $derived.by(() => {
    const loc = preferences.location;
    if (!loc || !showStars) return [];
    return BRIGHT_STARS.map((st) => {
      const { azimuth, altitude } = starAltAz(st.ra, st.dec, date, loc.latitude, loc.longitude);
      return { ra: st.ra, mag: st.mag, n: st.n, altitude, pt: domePt(azimuth, altitude) };
    }).filter((s) => s.altitude >= 0);
  });
  const domePolaris = $derived.by(() => {
    const loc = preferences.location;
    if (!loc || !showStars) return null;
    const { azimuth, altitude } = starAltAz(POLARIS.ra, POLARIS.dec, date, loc.latitude, loc.longitude);
    if (altitude < 0) return null;
    return { pt: domePt(azimuth, altitude) };
  });

  const domeConstellations = $derived.by(() => {
    const loc = preferences.location;
    if (!loc || !showStars) return [];
    return CONSTELLATIONS.map((con) => {
      const pts = con.stars.map(([ra, dec]) => {
        const { azimuth, altitude } = starAltAz(ra, dec, date, loc.latitude, loc.longitude);
        return { altitude, pt: domePt(azimuth, altitude) };
      });
      const up = pts.filter((p) => p.altitude >= 0);
      if (up.length < 3) return null;
      const segs = con.lines
        .filter(([a, b]) => pts[a].altitude >= 0 && pts[b].altitude >= 0)
        .map(([a, b]) => `${pts[a].pt.join(',')} ${pts[b].pt.join(',')}`);
      const cx = up.reduce((s, p) => s + p.pt[0], 0) / up.length;
      const cy = up.reduce((s, p) => s + p.pt[1], 0) / up.length;
      const ys = up.map((p) => p.pt[1]);
      const labelY = cy < DC ? Math.max(...ys) + 8 : Math.min(...ys) - 5;
      return { key: con.name.en, name: con.name, stars: up.map((p) => p.pt), segs, cx, cy, labelY };
    }).filter((c): c is NonNullable<typeof c> => c !== null);
  });
</script>

{#snippet ctrl(active: boolean, toggle: () => void, label: string)}
  <button type="button" class="chip" class:on={active} aria-pressed={active} onclick={toggle}>
    <span class="chip__dot"></span>{label}
  </button>
{/snippet}

{#if domeTracks && domeNow}
  <figure class="skydome">
    {#if controls}
      <button
        type="button"
        class="view-gear"
        class:on={menu}
        onclick={() => (menu = !menu)}
        aria-expanded={menu}
        aria-label={hi('आकाश विकल्प', 'Sky options')}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"
          ><path
            d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.21.08-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
          /></svg
        >
      </button>
      {#if menu}
        <button
          class="menu-backdrop"
          type="button"
          onclick={() => (menu = false)}
          aria-label={hi('बंद करें', 'Close')}
        ></button>
        <div class="view-menu" role="group" aria-label={hi('आकाश विकल्प', 'Sky options')}>
          <p class="view-menu__title">{hi('आकाश', 'Sky')}</p>
          {@render ctrl(tGrahas, () => (tGrahas = !tGrahas), hi('ग्रह', 'Planets'))}
          {@render ctrl(tLabels, () => (tLabels = !tLabels), hi('नाम', 'Labels'))}
          {@render ctrl(tStars, () => (tStars = !tStars), hi('तारे', 'Stars'))}
          {@render ctrl(tAtmo, () => (tAtmo = !tAtmo), hi('वायुमंडल', 'Atmosphere'))}
          {@render ctrl(tPaths, () => (tPaths = !tPaths), hi('पथ', 'Paths'))}
          {@render ctrl(tDirs, () => (tDirs = !tDirs), hi('दिशाएँ', 'Directions'))}
        </div>
      {/if}
    {/if}
    <svg
      class:labels-shown={fLabels}
      viewBox="12 12 {DOME - 24} {DOME - 24}"
      role="img"
      aria-label={hi(
        'आज आपके आकाश में सूर्य, चन्द्र व ग्रह',
        'The Sun, Moon and planets in your sky',
      )}
    >
      <defs>
        <radialGradient id="{uid}-grad" cx="50%" cy="38%" r="64%">
          <stop offset="0%" stop-color={domeSky.zen} />
          <stop offset="66%" stop-color={domeSky.mid} />
          <stop offset="100%" stop-color={domeSky.rim} />
        </radialGradient>
        <radialGradient id="{uid}-depth" cx="50%" cy="44%" r="60%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.06)" />
          <stop offset="62%" stop-color="rgba(0,0,0,0)" />
          <stop offset="100%" stop-color="rgba(0,0,0,0.22)" />
        </radialGradient>
        <radialGradient id="{uid}-sunglow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fff3c0" stop-opacity="0.98" />
          <stop offset="34%" stop-color="#ffd24d" stop-opacity="0.7" />
          <stop offset="62%" stop-color="#ffab35" stop-opacity="0.26" />
          <stop offset="100%" stop-color="#ff9824" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="{uid}-sun" cx="38%" cy="36%" r="68%">
          <stop offset="0%" stop-color="#fff8d8" />
          <stop offset="48%" stop-color="#ffce3a" />
          <stop offset="100%" stop-color="#f08a00" />
        </radialGradient>
        <clipPath id="{uid}-clip"><circle cx={DC} cy={DC} r={DR} /></clipPath>
      </defs>
      <circle cx={DC} cy={DC} r={DR} fill="url(#{uid}-grad)" />
      <circle cx={DC} cy={DC} r={DR} fill="url(#{uid}-depth)" />
      <g clip-path="url(#{uid}-clip)">
        {#each domeConstellations as con (con.key)}
          <g class="dome-con" class:revealed={revealed === con.key}>
            <circle
              cx={con.cx}
              cy={con.cy}
              r="10"
              class="dome-hit"
              role="button"
              tabindex="0"
              aria-label={tn(con.name.hi, con.name.tr, con.name.en)}
              use:revealable={con.key}
            />
            {#each con.segs as seg (seg)}
              <polyline points={seg} class="dome-con-line" />
            {/each}
            {#each con.stars as st (`${st[0]},${st[1]}`)}
              <circle cx={st[0]} cy={st[1]} r="1" class="dome-con-star" />
            {/each}
            <text x={con.cx} y={con.labelY} class="dome-con-name" text-anchor="middle"
              >{tn(con.name.hi, con.name.tr, con.name.en)}</text
            >
          </g>
        {/each}
        {#each domeStars as s (s.ra)}
          <g class="dome-con" class:revealed={revealed === 'star-' + s.ra}>
            <circle
              cx={s.pt[0]}
              cy={s.pt[1]}
              r="4.5"
              class="dome-hit"
              role="button"
              tabindex="0"
              aria-label={tn(s.n.hi, s.n.tr, s.n.en)}
              use:revealable={'star-' + s.ra}
            />
            <circle
              cx={s.pt[0]}
              cy={s.pt[1]}
              r={Math.min(2, Math.max(0.6, 1.4 - s.mag * 0.3))}
              class="dome-star"
            />
            <text
              x={s.pt[0]}
              y={s.pt[1] < DC ? s.pt[1] + 8 : s.pt[1] - 5}
              class="dome-star-name"
              text-anchor="middle">{tn(s.n.hi, s.n.tr, s.n.en)}</text
            >
          </g>
        {/each}
        {#if domePolaris}
          <g class="dome-con" class:revealed={revealed === 'polaris'}>
            <circle
              cx={domePolaris.pt[0]}
              cy={domePolaris.pt[1]}
              r="4.5"
              class="dome-hit"
              role="button"
              tabindex="0"
              aria-label={tn(POLARIS.n.hi, POLARIS.n.tr, POLARIS.n.en)}
              use:revealable={'polaris'}
            />
            <circle cx={domePolaris.pt[0]} cy={domePolaris.pt[1]} r="3" class="dome-polaris-halo" />
            <circle cx={domePolaris.pt[0]} cy={domePolaris.pt[1]} r="1.5" class="dome-polaris" />
            <text
              x={domePolaris.pt[0]}
              y={domePolaris.pt[1] < DC ? domePolaris.pt[1] + 9 : domePolaris.pt[1] - 6}
              class="dome-con-name"
              text-anchor="middle">{tn(POLARIS.n.hi, POLARIS.n.tr, POLARIS.n.en)}</text
            >
          </g>
        {/if}
        {#if fPaths && domeTracks.sun}
          <polyline points={domeTracks.sun} class="dome-path dome-path--sun" />
        {/if}
        {#if fPaths && domeTracks.moon}
          <polyline points={domeTracks.moon} class="dome-path dome-path--moon" />
        {/if}
        {#if fGrahas}
          {#each domePlanets as b (b.body)}
            {#if b.altitude >= -14}
              <g class="dome-body" class:revealed={revealed === b.body} opacity={dayFade}>
                <circle
                  cx={b.pt[0]}
                  cy={b.pt[1]}
                  r="6"
                  class="dome-hit"
                  role="button"
                  tabindex="0"
                  aria-label={grahaLabel(b.body)}
                  use:revealable={b.body}
                />
                <BodyIcon kind={b.body} cx={b.pt[0]} cy={b.pt[1]} r={5.5} />
                <text
                  x={b.pt[0]}
                  y={b.pt[1] < DC ? b.pt[1] + 11 : b.pt[1] - 7.5}
                  class="dome-label"
                  text-anchor="middle">{grahaLabel(b.body)}</text
                >
              </g>
            {/if}
          {/each}
        {/if}
        {#if domeSunMoon[1] && domeSunMoon[1].altitude >= -14 && !domeMoonHidden}
          {@const m = domeSunMoon[1]}
          {@const litD = moonLitPath(m.pt[0], m.pt[1], 8, illum, elong)}
          <g class="dome-body" class:revealed={revealed === 'moon'}>
            <circle
              cx={m.pt[0]}
              cy={m.pt[1]}
              r="9"
              class="dome-hit"
              role="button"
              tabindex="0"
              aria-label={grahaLabel('moon')}
              use:revealable={'moon'}
            />
            <circle
              cx={m.pt[0]}
              cy={m.pt[1]}
              r="8"
              fill={moonColors.disc}
              stroke="rgba(255,255,255,0.4)"
              stroke-width="0.6"
            />
            <path d={litD} fill={moonColors.lit} />
            <clipPath id="{uid}-moonclip"><path d={litD} /></clipPath>
            <g clip-path="url(#{uid}-moonclip)">
              {#each craters as [dx, dy, cr] (`${dx},${dy}`)}
                <circle
                  cx={m.pt[0] + dx * 0.67}
                  cy={m.pt[1] + dy * 0.67}
                  r={cr * 0.67}
                  class="crater"
                  fill={moonColors.crater}
                />
              {/each}
            </g>
            <text
              x={m.pt[0]}
              y={m.pt[1] < DC ? m.pt[1] + 17 : m.pt[1] - 15}
              class="dome-label"
              text-anchor="middle">{grahaLabel('moon')}</text
            >
          </g>
        {/if}
        {#if domeSunMoon[0] && domeSunMoon[0].altitude >= -14}
          {@const sn = domeSunMoon[0]}
          <g class="dome-body" class:revealed={revealed === 'sun'}>
            <circle
              cx={sn.pt[0]}
              cy={sn.pt[1]}
              r="9"
              class="dome-hit"
              role="button"
              tabindex="0"
              aria-label={grahaLabel('sun')}
              use:revealable={'sun'}
            />
            <circle cx={sn.pt[0]} cy={sn.pt[1]} r="19" fill="url(#{uid}-sunglow)" />
            <circle cx={sn.pt[0]} cy={sn.pt[1]} r="8" fill="url(#{uid}-sun)" />
            <text
              x={sn.pt[0]}
              y={sn.pt[1] < DC ? sn.pt[1] + 18 : sn.pt[1] - 14}
              class="dome-label"
              text-anchor="middle">{grahaLabel('sun')}</text
            >
          </g>
        {/if}
      </g>
      <circle cx={DC} cy={DC} r={DR} class="dome-horizon" />
      {#if fDirs}
        <text x={DC} y={DC - DR + 5} class="dome-card" text-anchor="middle">{hi('उ', 'N')}</text>
        <text x={DC} y={DC + DR - 1} class="dome-card" text-anchor="middle">{hi('द', 'S')}</text>
        <text x={DC - DR + 5} y={DC + 3} class="dome-card" text-anchor="middle"
          >{hi('पू', 'E')}</text
        >
        <text x={DC + DR - 5} y={DC + 3} class="dome-card" text-anchor="middle">{hi('प', 'W')}</text
        >
      {/if}
    </svg>
    {#if caption}
      <figcaption>{@render caption()}</figcaption>
    {:else}
      <figcaption>
        {hi(
          `यदि आप ${domeLoc ? domeLoc + ' में ' : ''}दक्षिण की ओर मुख करके ऊपर देखें — केंद्र सिर के ऊपर, किनारा क्षितिज; पूर्व बाएँ, पश्चिम दाएँ।`,
          `As if you stood${domeLoc ? ' in ' + domeLoc : ''} facing south and looked up — the centre is overhead, the rim is the horizon, east on the left and west on the right.`,
        )}
      </figcaption>
    {/if}
  </figure>
{/if}

<style>
  .skydome {
    position: relative;
    margin: 0 auto;
    max-width: 460px;
    text-align: center;
  }
  .skydome > svg {
    width: 100%;
    height: auto;
    overflow: visible;
  }
  .dome-horizon {
    fill: none;
    stroke: rgba(255, 255, 255, 0.45);
    stroke-width: 1.25;
  }
  .dome-star {
    fill: rgba(255, 255, 255, 0.9);
  }
  .dome-con-line {
    fill: none;
    stroke: rgba(150, 180, 235, 0.5);
    stroke-width: 0.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .dome-con-star {
    fill: rgba(214, 228, 255, 0.95);
  }
  .dome-con-name {
    font-size: 5px;
    fill: rgba(180, 200, 240, 0.62);
    letter-spacing: 0.3px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.14s ease;
  }
  .dome-star-name {
    font-size: 5px;
    fill: rgba(205, 218, 248, 0.62);
    letter-spacing: 0.2px;
    pointer-events: none;
    opacity: 0;
    paint-order: stroke;
    stroke: rgba(8, 12, 28, 0.6);
    stroke-width: 0.6px;
    transition: opacity 0.14s ease;
  }
  .dome-polaris {
    fill: #ffffff;
  }
  .dome-polaris-halo {
    fill: rgba(255, 255, 255, 0.16);
  }
  .dome-card {
    font-size: 6px;
    font-weight: 500;
    fill: rgba(214, 224, 248, 0.5);
  }
  .dome-path {
    fill: none;
    stroke-width: 0.8;
    stroke-linecap: round;
    stroke-linejoin: round;
    opacity: 0.9;
  }
  .dome-path--sun {
    stroke: #ffcb52;
    stroke-dasharray: 0.5 2.5;
  }
  .dome-path--moon {
    stroke: #aeb9d8;
    stroke-dasharray: 2.5 2.5;
  }
  .dome-label {
    font-size: 5px;
    font-weight: 600;
    fill: rgba(255, 255, 255, 0.82);
    paint-order: stroke;
    stroke: rgba(10, 14, 30, 0.55);
    stroke-width: 1.5px;
    stroke-linejoin: round;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.14s ease;
  }
  .dome-body:hover .dome-label,
  .dome-con:hover .dome-con-name,
  .dome-con:hover .dome-star-name,
  .dome-body.revealed .dome-label,
  .dome-con.revealed .dome-con-name,
  .dome-con.revealed .dome-star-name {
    opacity: 1;
  }
  /* the Labels toggle shows body + constellation names; individual bright-star
     names stay hover-only (revealed one at a time) so the dome isn't a wall of text */
  .labels-shown .dome-label,
  .labels-shown .dome-con-name {
    opacity: 1;
  }
  /* Only the invisible .dome-hit target should be interactive — not the Sun's
     wide glow, the discs, the planet icons or the labels (otherwise the Sun's
     ~19px glow becomes the hit/hover area instead of its ~9px disc). :where()
     carries zero specificity so the .dome-hit rule below still wins. */
  .dome-body :where(circle, path, text, g) {
    pointer-events: none;
  }
  .dome-hit {
    fill: transparent;
    pointer-events: all;
    cursor: pointer;
    outline: none;
    -webkit-tap-highlight-color: transparent;
  }
  /* keyboard focus ring for the tappable bodies/stars (mirrors EclipticWheel) */
  .dome-hit:focus-visible {
    stroke: var(--gold);
    stroke-width: 2;
  }
  .crater {
    opacity: 0.8;
  }
  .skydome figcaption {
    font-size: 12.5px;
    color: var(--ink-soft);
    margin-top: 8px;
    line-height: 1.5;
  }

  /* gear + options menu (only when controls) */
  .view-gear {
    position: absolute;
    top: 4px;
    right: 4px;
    z-index: 5;
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    padding: 0;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--paper);
    box-shadow: 0 1px 4px var(--shadow);
    color: var(--ink-soft);
    cursor: pointer;
    transition:
      color 0.15s,
      border-color 0.15s,
      transform 0.2s;
  }
  .view-gear svg {
    width: 23px;
    height: 23px;
    fill: currentColor;
  }
  .view-gear:hover,
  .view-gear.on {
    color: var(--ink);
    border-color: var(--ink-soft);
  }
  .view-gear.on {
    transform: rotate(60deg);
  }
  .menu-backdrop {
    position: fixed;
    inset: 0;
    z-index: 30;
    background: transparent;
    border: none;
    padding: 0;
    cursor: default;
  }
  .view-menu {
    position: absolute;
    top: 38px;
    right: 4px;
    z-index: 31;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px;
    background: var(--paper);
    border: 1px solid var(--line);
    border-radius: 12px;
    box-shadow: 0 8px 24px var(--shadow);
  }
  .view-menu__title {
    margin: 0 0 2px;
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.42em;
    width: 100%;
    justify-content: flex-start;
    padding: 0.28rem 0.72rem;
    border: 1px solid var(--line);
    border-radius: var(--radius-pill, 999px);
    background: var(--paper);
    color: var(--ink-soft);
    font: inherit;
    font-size: 0.82rem;
    cursor: pointer;
    transition:
      background 0.15s,
      border-color 0.15s,
      color 0.15s;
  }
  .chip__dot {
    width: 0.6em;
    height: 0.6em;
    border-radius: 50%;
    border: 1.5px solid var(--ink-faint, #aaa);
    transition:
      background 0.15s,
      border-color 0.15s;
  }
  .chip.on {
    background: color-mix(in srgb, var(--gold, #b8860b) 16%, var(--paper));
    border-color: var(--gold, #b8860b);
    color: var(--ink);
  }
  .chip.on .chip__dot {
    background: var(--gold, #b8860b);
    border-color: var(--gold, #b8860b);
  }
</style>
