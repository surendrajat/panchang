<script lang="ts">
  // EXPERIMENTAL — "The Sky Right Now". A live geocentric ecliptic wheel with
  // Hindu-style rashi icons + curved names, the real Moon on the wheel and its
  // phase in the side view, the other planets on demand, upcoming events, a
  // sidereal/tropical toggle, and tap-to-learn — built for someone learning
  // where the panchanga comes from. Every value is the real engine.

  import { preferences } from '$lib/state/preferences.svelte';
  import {
    dateToJulian,
    julianToDate,
    sunLongitudeAtJD,
    moonLongitudeAtJD,
    sunMoonElongationAtJD,
    ayanamsa,
    norm360,
  } from '$lib/astro';
  import { grahaSiderealLongitude } from '$lib/jyotish';
  import type { GrahaKey } from '$lib/jyotish';
  import { RASHI_LORDS } from '$lib/jyotish/names';
  import { RASHI_ELEMENT, ELEMENT_LABEL } from '$lib/jyotish/rashi-art';
  // Sign / planet marks: real glyphs from the bundled 'Panchang Symbols' font.
  import { SIGN_GLYPH, SUN_GLYPH, MOON_GLYPH, PLANET_GLYPH } from '$lib/jyotish/glyphs';
  // The lunar month + Gregorian span while the Sun sits in each sign (for the
  // tap-to-learn card), bilingual. Index 0 = Mesha.
  type MonInfo = { mon: { en: string; hi: string }; greg: { en: string; hi: string } };
  const SIGN_MONTH: readonly MonInfo[] = [
    { mon: { en: 'Vaiśākha', hi: 'वैशाख' }, greg: { en: 'Apr–May', hi: 'अप्रैल–मई' } },
    { mon: { en: 'Jyeṣṭha', hi: 'ज्येष्ठ' }, greg: { en: 'May–Jun', hi: 'मई–जून' } },
    { mon: { en: 'Āṣāḍha', hi: 'आषाढ़' }, greg: { en: 'Jun–Jul', hi: 'जून–जुलाई' } },
    { mon: { en: 'Śrāvaṇa', hi: 'श्रावण' }, greg: { en: 'Jul–Aug', hi: 'जुलाई–अगस्त' } },
    { mon: { en: 'Bhādrapada', hi: 'भाद्रपद' }, greg: { en: 'Aug–Sep', hi: 'अगस्त–सितंबर' } },
    { mon: { en: 'Āśvina', hi: 'आश्विन' }, greg: { en: 'Sep–Oct', hi: 'सितंबर–अक्तूबर' } },
    { mon: { en: 'Kārtika', hi: 'कार्तिक' }, greg: { en: 'Oct–Nov', hi: 'अक्तूबर–नवंबर' } },
    { mon: { en: 'Mārgaśīrṣa', hi: 'मार्गशीर्ष' }, greg: { en: 'Nov–Dec', hi: 'नवंबर–दिसंबर' } },
    { mon: { en: 'Pauṣa', hi: 'पौष' }, greg: { en: 'Dec–Jan', hi: 'दिसंबर–जनवरी' } },
    { mon: { en: 'Māgha', hi: 'माघ' }, greg: { en: 'Jan–Feb', hi: 'जनवरी–फरवरी' } },
    { mon: { en: 'Phālguna', hi: 'फाल्गुन' }, greg: { en: 'Feb–Mar', hi: 'फरवरी–मार्च' } },
    { mon: { en: 'Chaitra', hi: 'चैत्र' }, greg: { en: 'Mar–Apr', hi: 'मार्च–अप्रैल' } },
  ];

  import { nakshatraNameByIndex, tithiNameByIndex, yogaNameByIndex, rashiNameByIndex } from '$lib/i18n';
  import { rashiLabel, grahaLabel } from '$lib/labels';
  import { applyNumerals } from '$lib/format/numerals';
  import MoonPhase from '../components/MoonPhase.svelte';

  const lang = $derived(preferences.language);
  const num = (s: string | number) => applyNumerals(String(s), preferences.numerals);
  const hi = (h: string, e: string) => (lang === 'hi' ? h : e);
  // Respects the transliteration preference (Mesha vs Aries) — see lib/labels.
  const signName = (i: number) => rashiLabel(i);

  // ── Time model (capped ~30 fps; idle when paused; torn down on unmount) ─────
  let simMs = $state(Date.now());
  let speed = $state(0);
  let live = $state(true);
  let showGrahas = $state(false);
  let tropical = $state(false);
  let showAngles = $state(false);

  $effect(() => {
    if (!live && speed === 0) return;
    let raf = 0;
    let last = performance.now();
    let liveAcc = 0;
    let evAcc = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const dt = t - last;
      if (dt < 30) return;
      last = t;
      if (live) {
        liveAcc += dt;
        if (liveAcc >= 250) {
          simMs = Date.now();
          liveAcc = 0;
        }
      } else simMs += speed * dt;
      evAcc += dt;
      if (evAcc >= 400) {
        eventsBaseMs = simMs;
        evAcc = 0;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  const SPEEDS = [
    { key: 'pause', live: false, speed: 0, n: '', hi: 'रोकें', en: 'Pause' },
    { key: 'hour', live: false, speed: 3600, n: '1', hi: 'घंटा/से', en: 'hour/s' },
    { key: 'day', live: false, speed: 86400, n: '1', hi: 'दिन/से', en: 'day/s' },
    { key: 'week', live: false, speed: 604800, n: '1', hi: 'सप्ताह/से', en: 'week/s' },
  ];
  const activeSpeedKey = $derived(live ? 'now' : (SPEEDS.find((s) => s.speed === speed)?.key ?? 'pause'));
  function setSpeed(s: { live: boolean; speed: number }) {
    live = s.live;
    speed = s.speed;
    eventsBaseMs = simMs;
  }
  function goNow() {
    live = true;
    speed = 0;
    simMs = Date.now();
    eventsBaseMs = simMs;
  }

  // ── Derived astronomy ───────────────────────────────────────────────────────
  const simDate = $derived(new Date(simMs));
  const jd = $derived(dateToJulian(simDate));
  const ayan = $derived(ayanamsa(jd, preferences.ayanamsa));
  const sunSid = $derived(norm360(sunLongitudeAtJD(jd) - ayan));
  const moonSid = $derived(norm360(moonLongitudeAtJD(jd) - ayan));
  const elong = $derived(sunMoonElongationAtJD(jd));

  const NAK_ARC = 360 / 27;
  const tithiNum = $derived(Math.floor(elong / 12) + 1);
  const tithiFrac = $derived((elong % 12) / 12);
  const paksha = $derived(elong < 180 ? hi('शुक्ल', 'Shukla') : hi('कृष्ण', 'Krishna'));
  const nakNum = $derived(Math.floor(moonSid / NAK_ARC) + 1);
  const yogaNum = $derived(Math.floor(norm360(sunSid + moonSid) / NAK_ARC) + 1);
  const illum = $derived((1 - Math.cos((elong * Math.PI) / 180)) / 2);

  // Sidereal vs tropical is only a zodiac reference shift: the bodies stay put,
  // the sign boundaries rotate by the ayanamsa. So the displayed SIGN of a body
  // shifts, illustrating why the two zodiacs disagree.
  const ringShift = $derived(tropical ? ayan : 0);
  const displaySign = (sidLon: number) => Math.floor(norm360(sidLon + ringShift) / 30);
  const sunRashi = $derived(displaySign(sunSid));
  const moonRashi = $derived(displaySign(moonSid));

  const GRAHA_META: { key: GrahaKey; hi: string; en: string }[] = [
    { key: 'mars', hi: 'मं', en: 'Ma' },
    { key: 'mercury', hi: 'बु', en: 'Me' },
    { key: 'jupiter', hi: 'गु', en: 'Ju' },
    { key: 'venus', hi: 'शु', en: 'Ve' },
    { key: 'saturn', hi: 'श', en: 'Sa' },
    { key: 'rahu', hi: 'रा', en: 'Ra' },
    { key: 'ketu', hi: 'के', en: 'Ke' },
  ];
  const grahaPositions = $derived.by(() =>
    showGrahas
      ? GRAHA_META.map((g) => ({ ...g, lon: grahaSiderealLongitude(g.key, jd, preferences.ayanamsa, preferences.nodeType) }))
      : [],
  );

  const simLabel = $derived.by(() => {
    const fmt = new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: preferences.timeFormat === '12h',
      numberingSystem: 'latn',
      timeZone: preferences.location?.timezone,
    });
    return num(fmt.format(simDate));
  });

  // ── Upcoming events (throttled to ~2.5 Hz) ──────────────────────────────────
  function refineCrossing(estJd: number, fn: (j: number) => number, target: number): number {
    let lo = estJd - 1.6;
    let hi = estJd + 1.6;
    for (let i = 0; i < 32; i++) {
      const m = (lo + hi) / 2;
      const d = ((fn(m) - target + 540) % 360) - 180;
      if (d < 0) lo = m;
      else hi = m;
    }
    return (lo + hi) / 2;
  }
  function nextElongJd(fromJd: number, target: number): number {
    const e = sunMoonElongationAtJD(fromJd);
    let days = (((target - e) % 360) + 360) % 360 / 12.19;
    if (days < 0.08) days += 360 / 12.19;
    return refineCrossing(fromJd + days, sunMoonElongationAtJD, target);
  }
  function eventWhen(j: number, fromJd: number): string {
    const ds = new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      numberingSystem: 'latn',
      timeZone: preferences.location?.timezone,
    }).format(julianToDate(j));
    const days = Math.max(0, Math.round(j - fromJd));
    const inDays = days === 0 ? hi('आज', 'today') : days === 1 ? hi('कल', '1 day') : `${num(days)} ${hi('दिन', 'days')}`;
    return `${num(ds)} · ${inDays}`;
  }
  let eventsBaseMs = $state(Date.now());
  const events = $derived.by(() => {
    const fromJd = dateToJulian(new Date(eventsBaseMs));
    const dayJd = dateToJulian(new Date(Math.floor(eventsBaseMs / 86_400_000) * 86_400_000));
    const sunSidAt = (j: number) => norm360(sunLongitudeAtJD(j) - ayanamsa(j, preferences.ayanamsa));
    const moonSidAt = (j: number) => norm360(moonLongitudeAtJD(j) - ayanamsa(j, preferences.ayanamsa));
    const sunNow = sunSidAt(dayJd);
    const nextSign = (Math.floor(sunNow / 30) + 1) % 12;
    const sankrJd = refineCrossing(dayJd + ((((nextSign * 30) % 360) - sunNow + 360) % 360 || 30) / 0.9856, sunSidAt, (nextSign * 30) % 360);
    const pJd = nextElongJd(dayJd, 180);
    const aJd = nextElongJd(dayJd, 360);
    const ekJd = Math.min(nextElongJd(dayJd, 120), nextElongJd(dayJd, 300));
    // lon = where on the zodiac the event lands (the Moon's place, or the sign
    // boundary for a sankranti) — used for the markers around the wheel.
    return [
      { key: 'purnima', hi: 'पूर्णिमा', en: 'Full moon', jd: pJd, lon: moonSidAt(pJd) },
      { key: 'amavasya', hi: 'अमावस्या', en: 'New moon', jd: aJd, lon: moonSidAt(aJd) },
      { key: 'ekadashi', hi: 'एकादशी', en: 'Ekadashi', jd: ekJd, lon: moonSidAt(ekJd) },
      { key: 'sankranti', hi: `${rashiNameByIndex(nextSign, 'hi')} संक्रांति`, en: `${rashiLabel(nextSign)} sankranti`, jd: sankrJd, lon: (nextSign * 30) % 360 },
    ]
      .sort((a, b) => a.jd - b.jd)
      .map((ev) => ({ ...ev, when: eventWhen(ev.jd, fromJd) }));
  });

  // ── Tap-to-learn ────────────────────────────────────────────────────────────
  type Selected = { type: 'rashi' | 'sun' | 'moon' | 'graha'; i?: number; key?: GrahaKey } | null;
  let selected = $state<Selected>(null);
  const learn = $derived.by(() => {
    const s = selected;
    if (!s) return null;
    if (s.type === 'sun')
      return {
        title: hi('सूर्य', 'The Sun'),
        body: hi(
          'सूर्य की राशि से मास और ऋतु तय होते हैं। यह हर ~30 दिन में एक राशि बदलता है — हर बार संक्रांति।',
          'The Sun’s sign sets the month and the season. It moves one sign (~30°) every ~30 days — each crossing is a sankranti.',
        ),
      };
    if (s.type === 'moon')
      return {
        title: hi('चन्द्र', 'The Moon'),
        body: hi(
          'चन्द्र सूर्य से जितना आगे है (अंतर) ÷ 12° = तिथि। यह हर ~सवा दो दिन में नक्षत्र बदलता है।',
          'How far the Moon is ahead of the Sun (the gap) ÷ 12° = the tithi. It changes nakshatra every ~2.3 days.',
        ),
      };
    if (s.type === 'graha') {
      const k = s.key!;
      const node = k === 'rahu' || k === 'ketu';
      return {
        title: grahaLabel(k),
        body: node
          ? hi(
              'चन्द्रपथ का संधि-बिंदु (राहु/केतु) — यहीं ग्रहण होते हैं। यह सदा वक्री चलता है।',
              'A lunar node (Rahu/Ketu) — where eclipses happen. It always moves retrograde.',
            )
          : hi(
              'एक ग्रह — राशियों में इसकी स्थिति कुंडली बनाती है। तेज़ गति पर इसे वक्री होते देखें।',
              'A graha (planet) — its position among the signs shapes the kundli. Speed it up to watch it go retrograde.',
            ),
      };
    }
    const i = s.i!;
    const lord = grahaLabel(RASHI_LORDS[i]);
    const el = ELEMENT_LABEL[RASHI_ELEMENT[i]][lang === 'hi' ? 'hi' : 'en'];
    const m = SIGN_MONTH[i];
    return {
      title: signName(i),
      body: hi(
        `तत्व: ${el} · स्वामी ग्रह: ${lord}। सूर्य जब इस राशि में हो (~${m.greg.hi}) तब ${m.mon.hi} मास होता है।`,
        `Element: ${el} · ruled by ${lord}. When the Sun is in this sign (~${m.greg.en}), it's the ${m.mon.en} month.`,
      ),
    };
  });

  // ── Wheel geometry ─────────────────────────────────────────────────────────
  const SIZE = 380;
  const C = SIZE / 2;
  const R_OUT = 184;
  const R_IN = 138;
  const R_NAME = 170; // curved sign names (outer)
  const R_ICON = 149; // sign icon, tucked inside the name
  const R_BODY = 116; // Sun / Moon (clear of the ring and the grahas)
  const R_GRAHA = 84; // other planets
  const R_ARC = 54; // elongation arc (small, central)

  function pt(deg: number, r: number): [number, number] {
    const a = (deg * Math.PI) / 180;
    return [C + r * Math.cos(a), C - r * Math.sin(a)];
  }
  const ptStr = (deg: number, r: number) => pt(deg, r).map((n) => n.toFixed(2)).join(' ');
  function sector(s: number, e: number): string {
    return `M ${ptStr(s, R_IN)} L ${ptStr(s, R_OUT)} A ${R_OUT} ${R_OUT} 0 0 0 ${ptStr(e, R_OUT)} L ${ptStr(e, R_IN)} A ${R_IN} ${R_IN} 0 0 1 ${ptStr(s, R_IN)} Z`;
  }
  // Arc path for a curved sign name, oriented so the text stays upright around
  // the whole circle (top half on the outer side, bottom half reversed).
  function namePath(i: number): string {
    const m = i * 30 + 15;
    const sp = 13;
    const up = Math.sin((m * Math.PI) / 180) >= 0;
    return up
      ? `M ${ptStr(m + sp, R_NAME)} A ${R_NAME} ${R_NAME} 0 0 1 ${ptStr(m - sp, R_NAME)}`
      : `M ${ptStr(m - sp, R_NAME)} A ${R_NAME} ${R_NAME} 0 0 0 ${ptStr(m + sp, R_NAME)}`;
  }

  const elongPath = $derived(`M ${ptStr(sunSid, R_ARC)} A ${R_ARC} ${R_ARC} 0 ${elong > 180 ? 1 : 0} 0 ${ptStr(moonSid, R_ARC)}`);
  // Angle-measurement overlay: longitudes are measured CCW from sidereal 0°
  // (Mesha start, due east). Each arc sweeps from there to the body's angle.
  const R_SUN_ARC = 30; // angle arcs sit close to Earth (centre)
  const R_MOON_ARC = 40;
  const angleArc = (deg: number, r: number) => `M ${ptStr(0, r)} A ${r} ${r} 0 ${deg > 180 ? 1 : 0} 0 ${ptStr(deg, r)}`;
  const sunAnglePath = $derived(angleArc(sunSid, R_SUN_ARC));
  const moonAnglePath = $derived(angleArc(moonSid, R_MOON_ARC));
  const rashis = Array.from({ length: 12 }, (_, i) => i);
  const nakTicks = Array.from({ length: 27 }, (_, i) => i * NAK_ARC);
  const rayAngles = Array.from({ length: 12 }, (_, i) => (i * 360) / 12);
  const sunPt = $derived(pt(sunSid, R_BODY));
  const moonPt = $derived(pt(moonSid, R_BODY));
  // Realistic Moon craters (offsets within the disc, fixed look — not a phase).
  const craters = [
    [-3, -2, 2.4],
    [3, 1.5, 1.7],
    [0.5, 4, 1.3],
    [-4.5, 3, 1],
  ];

  // ── Physical Sun–Earth–Moon side view ──────────────────────────────────────
  const OW = 360;
  const OH = 190;
  const EARTH = { x: 232, y: OH / 2 };
  const SUNX = 52;
  const ORB = 62;
  const moonOrb = $derived.by(() => {
    const a = ((180 + elong) * Math.PI) / 180;
    return { x: EARTH.x + ORB * Math.cos(a), y: EARTH.y - ORB * Math.sin(a) };
  });
  const litHalf = (cx: number, cy: number, r: number) => `M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} Z`;
</script>

<section class="sky">
  <header class="sky__head">
    <h2>{hi('आकाश — अभी', 'The Sky — Right Now')} <span class="exp">{hi('प्रयोग', 'experimental')}</span></h2>
    <p class="desc">
      {hi(
        'पूरा पंचांग सिर्फ़ दो कोणों से बनता है — सूर्य और चन्द्र की राशि-स्थिति। उनके बीच का अंतर ही तिथि है।',
        'The whole panchanga comes from just two angles — where the Sun and Moon sit on the zodiac. The gap between them is the tithi.',
      )}
    </p>
  </header>

  <div class="timebar">
    <div class="clock">{simLabel}</div>
    <div class="speeds" role="group" aria-label={hi('समय गति', 'Time speed')}>
      <button type="button" class:on={activeSpeedKey === 'now'} onclick={goNow}>● {hi('अभी', 'Now')}</button>
      {#each SPEEDS as s (s.key)}
        <button type="button" class:on={activeSpeedKey === s.key} onclick={() => setSpeed(s)}>{s.n ? num(s.n) + ' ' : ''}{lang === 'hi' ? s.hi : s.en}</button>
      {/each}
    </div>
    <div class="toggles">
      <label><input type="checkbox" bind:checked={showGrahas} /> {hi('सभी ग्रह', 'All planets')}</label>
      <label><input type="checkbox" bind:checked={tropical} /> {hi('सायन (पाश्चात्य)', 'Tropical zodiac')}</label>
      <label><input type="checkbox" bind:checked={showAngles} /> {hi('कोण दिखाएँ', 'Show angles')}</label>
    </div>
  </div>

  <div class="sky__grid">
    <svg class="wheel" viewBox="0 0 {SIZE} {SIZE}" role="img" aria-label={hi('आकाश चक्र', 'Ecliptic wheel')}>
      <defs>
        <radialGradient id="sun-grad" cx="38%" cy="36%" r="68%"><stop offset="0%" stop-color="#fff8d8" /><stop offset="48%" stop-color="#ffce3a" /><stop offset="100%" stop-color="#f08a00" /></radialGradient>
        <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#ffcf4d" stop-opacity="0.4" /><stop offset="100%" stop-color="#ffcf4d" stop-opacity="0" /></radialGradient>
        <radialGradient id="earth-grad" cx="36%" cy="32%" r="75%"><stop offset="0%" stop-color="#8ec3ee" /><stop offset="60%" stop-color="#3f7ab3" /><stop offset="100%" stop-color="#255a8c" /></radialGradient>
        <radialGradient id="moon-grad" cx="38%" cy="36%" r="70%"><stop offset="0%" stop-color="#f2efe6" /><stop offset="100%" stop-color="#d9d2c2" /></radialGradient>
      </defs>

      <!-- ZODIAC RING (rotates by the ayanamsa in tropical mode) -->
      <g transform="rotate({ringShift} {C} {C})">
        {#each rashis as i (i)}
          {@const isSun = i === sunRashi}
          {@const isMoon = i === moonRashi}
          {@const [ix, iy] = pt(i * 30 + 15, R_ICON)}
          <path
            d={sector(i * 30, (i + 1) * 30)}
            class="rashi"
            class:rashi--alt={i % 2 === 1}
            class:rashi--sun={isSun}
            class:rashi--moon={isMoon && !isSun}
            class:rashi--selected={selected?.type === 'rashi' && selected.i === i}
            role="button"
            tabindex="0"
            aria-label={signName(i)}
            onclick={() => (selected = { type: 'rashi', i })}
            onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (selected = { type: 'rashi', i })}
          />
          <defs><path id="rname-{i}" d={namePath(i)} fill="none" /></defs>
          <text class="rashi-name" class:on={isSun || isMoon}><textPath href="#rname-{i}" startOffset="50%" text-anchor="middle">{signName(i)}</textPath></text>
          <text class="rashi-glyph zsym" class:on={isSun || isMoon} x={ix} y={iy} text-anchor="middle" dominant-baseline="central" pointer-events="none">{SIGN_GLYPH[i]}</text>
        {/each}
        {#each nakTicks as deg (deg)}
          <line x1={pt(deg, R_IN)[0]} y1={pt(deg, R_IN)[1]} x2={pt(deg, R_IN - 5)[0]} y2={pt(deg, R_IN - 5)[1]} class="nak-tick" />
        {/each}
      </g>

      <!-- elongation arc + radii (bodies are fixed; only the ring rotates) -->
      <path d={elongPath} class="elong-arc" fill="none" />
      <line x1={C} y1={C} x2={sunPt[0]} y2={sunPt[1]} class="ray ray--sun" />
      <line x1={C} y1={C} x2={moonPt[0]} y2={moonPt[1]} class="ray ray--moon" />

      <!-- angle-measurement overlay (toggle): base line at 0° + arc to each body -->
      {#if showAngles}
        {@const b = pt(0, 48)}
        <line x1={C} y1={C} x2={b[0]} y2={b[1]} class="angle-base" />
        <path d={sunAnglePath} class="angle-arc angle-arc--sun" fill="none" />
        <path d={moonAnglePath} class="angle-arc angle-arc--moon" fill="none" />
      {/if}

      {#each grahaPositions as g (g.key)}
        {@const [gx, gy] = pt(g.lon, R_GRAHA)}
        {@const sel = selected?.type === 'graha' && selected.key === g.key}
        <g class="body" role="button" tabindex="0" aria-label={grahaLabel(g.key)} onclick={() => (selected = { type: 'graha', key: g.key })} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (selected = { type: 'graha', key: g.key })}>
          {#if sel}<circle cx={gx} cy={gy} r="12" class="sel-glow" />{/if}
          <circle cx={gx} cy={gy} r="9.5" class="graha" />
          <text x={gx} y={gy} class="graha-glyph zsym" text-anchor="middle" dominant-baseline="central">{PLANET_GLYPH[g.key]}</text>
          <text x={gx} y={gy - 12.5} class="body-label" text-anchor="middle">{grahaLabel(g.key)}</text>
        </g>
      {/each}

      <!-- Earth (center reference) -->
      <g class="body">
        <circle cx={C} cy={C} r="13" fill="url(#earth-grad)" stroke="var(--paper)" stroke-width="1.5" />
        <path d="M{C - 9} {C - 4} q3 -3 7 -1 q2 2 0 4 q-3 2 -7 1 q-2 -2 0 -4Z M{C + 2} {C + 1} q4 -1 5 3 q0 3 -3 4 q-3 0 -3 -3 q-1 -3 1 -4Z M{C - 6} {C + 5} q3 -1 4 2 q0 2 -3 2 q-2 0 -1 -4Z" class="earth-land" />
        <ellipse cx={C - 4} cy={C - 5} rx="4" ry="2.6" class="earth-shine" />
        <text x={C} y={C - 19} class="body-label" text-anchor="middle">{hi('पृथ्वी', 'Earth')}</text>
      </g>

      <!-- Moon: realistic cratered disc (the PHASE is shown in the side view) -->
      <g class="body" role="button" tabindex="0" aria-label={hi('चन्द्र', 'Moon')} onclick={() => (selected = { type: 'moon' })} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (selected = { type: 'moon' })}>
        {#if selected?.type === 'moon'}<circle cx={moonPt[0]} cy={moonPt[1]} r="15" class="sel-glow" />{/if}
        <circle cx={moonPt[0]} cy={moonPt[1]} r="12" fill="url(#moon-grad)" stroke="var(--ink-soft)" stroke-width="1" />
        {#each craters as [dx, dy, r] (dx + '-' + dy)}
          <circle cx={moonPt[0] + dx} cy={moonPt[1] + dy} r={r} class="crater" />
        {/each}
        <text x={moonPt[0]} y={moonPt[1] - 16} class="body-label" text-anchor="middle">{hi('चन्द्र', 'Moon')}</text>
      </g>

      <!-- Sun: glow + straight rays + gradient disc -->
      <g class="body" role="button" tabindex="0" aria-label={hi('सूर्य', 'Sun')} onclick={() => (selected = { type: 'sun' })} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (selected = { type: 'sun' })}>
        {#if selected?.type === 'sun'}<circle cx={sunPt[0]} cy={sunPt[1]} r="20" class="sel-glow" />{/if}
        <circle cx={sunPt[0]} cy={sunPt[1]} r="16" fill="url(#sun-glow)" />
        {#each rayAngles as a (a)}
          {@const cos = Math.cos((a * Math.PI) / 180)}
          {@const sin = Math.sin((a * Math.PI) / 180)}
          <line x1={sunPt[0] + cos * 13} y1={sunPt[1] - sin * 13} x2={sunPt[0] + cos * 19} y2={sunPt[1] - sin * 19} class="sun-ray" />
        {/each}
        <circle cx={sunPt[0]} cy={sunPt[1]} r="11.5" fill="url(#sun-grad)" stroke="#e07b00" stroke-width="0.75" />
        <text x={sunPt[0]} y={sunPt[1] - 19} class="body-label" text-anchor="middle">{hi('सूर्य', 'Sun')}</text>
      </g>

      <!-- upcoming events, marked where they land on the zodiac (hover for name) -->
      {#each events as ev (ev.key)}
        {@const [mx, my] = pt(ev.lon, R_IN - 5)}
        {@const [lx, ly] = pt(ev.lon, R_IN - 14)}
        <g class="body">
          <circle cx={mx} cy={my} r="3.3" class="event-mark event-mark--{ev.key}" />
          <text x={lx} y={ly} class="body-label" text-anchor="middle">{lang === 'hi' ? ev.hi : ev.en}</text>
        </g>
      {/each}
    </svg>

    <div class="readout">
      <dl class="vals">
        <div class="val"><dt class="dt-body"><span class="zsym g--sun body-ic">{SUN_GLYPH}</span>{hi('सूर्य', 'Sun')}</dt><dd>{signName(sunRashi)} <span class="muted">{num(sunSid.toFixed(1))}°</span></dd></div>
        <div class="val"><dt class="dt-body"><span class="zsym g--moon body-ic">{MOON_GLYPH}</span>{hi('चन्द्र', 'Moon')}</dt><dd>{signName(moonRashi)} <span class="muted">{num(moonSid.toFixed(1))}°</span></dd></div>
        <div class="val val--hero">
          <dt>{hi('अंतर', 'Gap')} (<span class="zsym g--moon body-ic">{MOON_GLYPH}</span>−<span class="zsym g--sun body-ic">{SUN_GLYPH}</span>) ÷ 12°</dt>
          <dd>
            <span class="hero-num">{num(elong.toFixed(1))}° → <b>{hi('तिथि', 'Tithi')} {tithiNameByIndex(tithiNum, lang)}</b></span>
            <span class="hero-tithi muted">{paksha} · {num((tithiFrac * 100).toFixed(0))}%</span>
          </dd>
        </div>
        <div class="val"><dt>{hi('नक्षत्र', 'Nakshatra')}</dt><dd>{nakshatraNameByIndex(nakNum, lang)}</dd></div>
        <div class="val"><dt>{hi('योग', 'Yoga')}</dt><dd>{yogaNameByIndex(yogaNum, lang)}</dd></div>
        <div class="val"><dt>{hi('चन्द्र कला', 'Moon phase')}</dt><dd>{num((illum * 100).toFixed(0))}% {hi('प्रकाशित', 'lit')} <span class="muted">({paksha})</span></dd></div>
      </dl>
      {#if tropical}
        <p class="zodiac-note">{hi(`सायन राशियाँ — तारों से ~${num(ayan.toFixed(1))}° खिसकी हुई (अयनांश)। पंचांग स्वयं निरयन है।`, `Tropical signs — drifted ~${num(ayan.toFixed(1))}° from the stars (ayanāṁśa). The panchanga itself uses sidereal.`)}</p>
      {/if}
    </div>
  </div>

  {#if learn}
    <aside class="learn">
      <button class="learn__close" type="button" onclick={() => (selected = null)} aria-label={hi('बंद करें', 'Close')}>×</button>
      <h3>{learn.title}</h3>
      <p>{learn.body}</p>
    </aside>
  {:else}
    <p class="tap-hint">{hi('💡 चक्र में किसी राशि, सूर्य या चन्द्र पर टैप करके जानें', '💡 Tap any sign, the Sun or the Moon on the wheel to learn about it')}</p>
  {/if}

  <div class="events">
    <span class="events__label">{hi('आगामी', 'Upcoming')}</span>
    {#each events as ev (ev.key)}
      <div class="event"><span class="event__name"><span class="event-swatch event-mark--{ev.key}"></span>{lang === 'hi' ? ev.hi : ev.en}</span><span class="event__when">{ev.when}</span></div>
    {/each}
  </div>

  <!-- Side view: the geometry, and the phase we actually see -->
  <figure class="orbital">
    <svg viewBox="0 0 {OW} {OH}" role="img" aria-label={hi('सूर्य–पृथ्वी–चन्द्र', 'Sun, Earth and Moon')}>
      {#each [-20, 0, 20] as dy (dy)}
        <line x1={SUNX + 26} y1={EARTH.y + dy} x2={EARTH.x - 16} y2={EARTH.y + dy * 0.4} class="sunlight" />
      {/each}
      <!-- Sun: same look as the wheel — glow + straight rays + gradient disc -->
      <circle cx={SUNX} cy={EARTH.y} r="26" fill="url(#sun-glow)" />
      {#each rayAngles as a (a)}
        {@const cos = Math.cos((a * Math.PI) / 180)}
        {@const sin = Math.sin((a * Math.PI) / 180)}
        <line x1={SUNX + cos * 21} y1={EARTH.y - sin * 21} x2={SUNX + cos * 28} y2={EARTH.y - sin * 28} class="sun-ray" />
      {/each}
      <circle cx={SUNX} cy={EARTH.y} r="18" fill="url(#sun-grad)" stroke="#e07b00" stroke-width="0.75" />
      <text x={SUNX} y={EARTH.y + 40} class="orb-label" text-anchor="middle">{hi('सूर्य', 'Sun')}</text>
      <circle cx={EARTH.x} cy={EARTH.y} r={ORB} class="orbit" />
      <line x1={EARTH.x} y1={EARTH.y} x2={moonOrb.x} y2={moonOrb.y} class="sight" />
      <!-- Earth: same icon as the wheel -->
      <circle cx={EARTH.x} cy={EARTH.y} r="12" fill="url(#earth-grad)" stroke="var(--paper)" stroke-width="1.5" />
      <path d="M{EARTH.x - 8} {EARTH.y - 4} q3 -3 6 -1 q2 2 0 4 q-3 2 -6 1 q-2 -2 0 -4Z M{EARTH.x + 2} {EARTH.y + 1} q3 -1 4 3 q0 3 -3 3 q-2 0 -2 -3 q-1 -2 1 -3Z" class="earth-land" />
      <ellipse cx={EARTH.x - 3} cy={EARTH.y - 4} rx="3.5" ry="2.3" class="earth-shine" />
      <text x={EARTH.x} y={EARTH.y + 28} class="orb-label" text-anchor="middle">{hi('पृथ्वी', 'Earth')}</text>
      <circle cx={moonOrb.x} cy={moonOrb.y} r="9" class="orb-moon-dark" />
      <path d={litHalf(moonOrb.x, moonOrb.y, 9)} class="orb-moon-lit" />
      <circle cx={moonOrb.x} cy={moonOrb.y} r="9" class="orb-moon-ring" />
    </svg>
    <div class="phase-side">
      <MoonPhase illumination={illum} phaseAngle={elong} phaseName={paksha} size={76} />
      <span class="phase-side__cap">{hi('हम जो देखते हैं', 'What we see')}</span>
    </div>
    <figcaption>
      {hi(
        'चन्द्र का सूर्य-मुखी आधा भाग सदा प्रकाशित; पृथ्वी से हम उसे एक कोण पर देखते हैं — वही अंतर चन्द्र की कला है।',
        "The Moon's sunward half is always lit; from Earth we see it at an angle — and that gap is the Moon's phase.",
      )}
    </figcaption>
  </figure>

  <p class="hint">
    {hi(
      'गति बढ़ाएँ और देखें — हर 12° पर नई तिथि, 180° पर पूर्णिमा। ग्रह चालू करें तो तेज़ गति पर वक्री गति भी दिखती है।',
      'Speed it up — every 12° is a new tithi, 180° is the full moon. Turn on the planets and watch one go retrograde at speed.',
    )}
    <a href="https://github.com/surendrajat/panchang/tree/main/docs/guide" target="_blank" rel="noopener">{hi('यह कैसे काम करता है →', 'How this works →')}</a>
  </p>
</section>

<style>
  .sky {
    max-width: 800px;
    margin: 0 auto;
  }
  .sky__head h2 {
    margin: 0;
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }
  .exp {
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--paper);
    background: var(--gold, #b8860b);
    padding: 0.1rem 0.4rem;
    border-radius: var(--radius-pill, 999px);
  }
  .desc {
    color: var(--ink-soft);
    margin: 0.4rem 0 0.9rem;
    font-size: 0.95rem;
  }

  .timebar {
    text-align: center;
    margin-bottom: 1rem;
  }
  .clock {
    display: inline-block;
    min-width: 13rem;
    font-size: 1.25rem;
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
    gap: 0.3rem;
    margin-top: 0.45rem;
  }
  .speeds button {
    padding: 0.3rem 0.8rem;
    border: 1px solid var(--line);
    border-radius: var(--radius-pill, 999px);
    background: var(--paper-2);
    color: var(--ink);
    font: inherit;
    font-size: 0.82rem;
    cursor: pointer;
    white-space: nowrap;
  }
  .speeds button.on {
    background: var(--red);
    color: var(--paper);
    border-color: var(--red);
  }
  .toggles {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.4rem 1.1rem;
    margin-top: 0.6rem;
    font-size: 0.85rem;
    color: var(--ink-soft);
  }
  .toggles label {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    cursor: pointer;
  }

  .sky__grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1.5rem;
    align-items: center;
    justify-content: center;
  }
  .wheel {
    flex: 1 1 360px;
    max-width: 460px;
  }
  /* fixed-width readout so changing values never reflow the wheel */
  .readout {
    flex: 0 0 270px;
    max-width: 100%;
  }

  .rashi {
    fill: var(--paper-2);
    stroke: var(--line);
    stroke-width: 1;
    cursor: pointer;
    transition: fill 0.15s;
  }
  .rashi--alt {
    fill: var(--paper-3);
  }
  .rashi:hover {
    fill: color-mix(in srgb, var(--gold, #b8860b) 14%, var(--paper-2));
  }
  .rashi--sun {
    fill: color-mix(in srgb, #f0a000 36%, var(--paper));
    stroke: #e07b00;
  }
  .rashi--moon {
    fill: color-mix(in srgb, #6f9fd0 34%, var(--paper));
    stroke: #4a79a8;
  }
  /* selection: a soft tint + a thin gold edge (visible, but not a hard border) */
  .rashi--selected {
    fill: color-mix(in srgb, var(--gold, #b8860b) 30%, var(--paper-2));
    stroke: var(--gold, #b8860b);
    stroke-width: 1.5;
  }
  .wheel :focus {
    outline: none;
  }
  .rashi-name {
    font-size: 11.5px;
    fill: var(--ink-soft);
    font-weight: 600;
    letter-spacing: 0.02em;
  }
  .rashi-name.on {
    fill: var(--ink);
    font-weight: 700;
  }
  /* Real Unicode astrological / planet glyphs, forced to the line (text) form —
     a Nerd Font if the device has one, else the system symbol fonts. */
  .zsym {
    /* bundled local subsets (see tokens.css) — identical on every device */
    font-family: 'Panchang Symbols', 'Apple Symbols', 'Segoe UI Symbol', serif;
  }
  .rashi-glyph {
    font-size: 15px;
    fill: var(--ink-soft);
  }
  .rashi-glyph.on {
    fill: var(--ink);
  }
  .graha-glyph {
    font-size: 12px;
    fill: var(--ink);
  }
  /* body hover label — name appears on hover/focus, not always */
  .body[role='button'] {
    cursor: pointer;
  }
  .body-label {
    font-size: 10px;
    font-weight: 600;
    fill: var(--ink);
    paint-order: stroke;
    stroke: var(--paper);
    stroke-width: 2.5px;
    stroke-linejoin: round;
    opacity: 0;
    transition: opacity 0.12s;
    pointer-events: none;
  }
  .body:hover .body-label,
  .body:focus-visible .body-label {
    opacity: 1;
  }
  /* subtle glow behind a tapped body */
  .sel-glow {
    fill: var(--gold, #e0a000);
    opacity: 0.3;
  }
  .event-mark {
    stroke: var(--paper);
    stroke-width: 0.8;
  }
  /* fill = wheel dot (SVG), background = strip swatch (HTML) — one source */
  .event-mark--purnima {
    fill: #e0a82e;
    background: #e0a82e;
  }
  .event-mark--amavasya {
    fill: var(--ink-soft);
    background: var(--ink-soft);
  }
  .event-mark--ekadashi {
    fill: #5a7fa8;
    background: #5a7fa8;
  }
  .event-mark--sankranti {
    fill: var(--red);
    background: var(--red);
  }
  .event-swatch {
    display: inline-block;
    width: 0.5em;
    height: 0.5em;
    border-radius: 50%;
    margin-right: 0.35em;
    vertical-align: 0.02em;
  }
  .nak-tick {
    stroke: var(--line);
    stroke-width: 1;
    opacity: 0.5;
  }
  .elong-arc {
    stroke: var(--red);
    stroke-width: 4;
    stroke-linecap: round;
    opacity: 0.9;
  }
  .ray {
    stroke-width: 1;
    opacity: 0.22;
  }
  .ray--sun {
    stroke: #f0a000;
  }
  .ray--moon {
    stroke: var(--ink-soft);
  }
  /* angle-measurement overlay — very subtle dotted lines */
  .angle-base {
    stroke: var(--ink-faint, #aaa);
    stroke-width: 1;
    stroke-dasharray: 1.5 3;
  }
  .angle-arc {
    stroke-width: 1.5;
    stroke-dasharray: 1.5 3;
    stroke-linecap: round;
  }
  .angle-arc--sun {
    stroke: #e0951a;
  }
  .angle-arc--moon {
    stroke: #5a7fa8;
  }
  .sun-ray {
    stroke: #f5a623;
    stroke-width: 1.6;
    stroke-linecap: round;
  }
  .crater {
    fill: #cfc7b4;
    opacity: 0.8;
  }
  .graha {
    fill: var(--paper);
    stroke: var(--ink-faint, #999);
    stroke-width: 1;
  }
  .earth-land {
    fill: #4e9a5b;
    opacity: 0.9;
  }
  .earth-shine {
    fill: #ffffff;
    opacity: 0.22;
  }
  .orb-label {
    font-size: 9.5px;
    fill: var(--ink-faint, #999);
  }

  .vals {
    margin: 0;
    display: grid;
    gap: 0.5rem;
  }
  .val {
    border-bottom: 1px solid var(--line);
    padding-bottom: 0.38rem;
  }
  .val dt {
    font-size: 0.8rem;
    color: var(--ink-soft);
  }
  /* icon-bearing labels: flex with a controlled gap (the nerd-font glyph's own
     advance width is absorbed by a fixed-width centred box) */
  .dt-body {
    display: flex;
    align-items: center;
    gap: 0.3em;
  }
  .body-ic {
    display: inline-block;
    width: 1.25em;
    text-align: center;
    vertical-align: -0.1em;
    font-size: 1.05em;
  }
  .val dd {
    margin: 0.12rem 0 0;
    font-size: 1.02rem;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  /* fixed two lines so the tithi line can't wrap unpredictably (no wheel jump) */
  .val--hero dd {
    white-space: normal;
  }
  .hero-num {
    display: block;
    font-size: 1.04rem;
  }
  .hero-tithi {
    display: block;
    font-size: 0.86rem;
  }
  .val--hero b {
    color: var(--red);
  }
  .g--sun {
    color: #d98008;
  }
  .g--moon {
    color: var(--ink-soft);
  }
  .muted {
    color: var(--ink-faint, #888);
    font-size: 0.85em;
  }
  .zodiac-note {
    margin: 0.7rem 0 0;
    font-size: 0.8rem;
    color: var(--ink-soft);
    line-height: 1.45;
  }

  .learn,
  .tap-hint {
    margin: 1rem 0 0;
  }
  .tap-hint {
    text-align: center;
    color: var(--ink-soft);
    font-size: 0.9rem;
  }
  .learn {
    position: relative;
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-left: 3px solid var(--red);
    border-radius: var(--radius, 8px);
    padding: 0.8rem 2rem 0.8rem 0.9rem;
  }
  .learn h3 {
    margin: 0 0 0.3rem;
    font-size: 1.05rem;
  }
  .learn p {
    margin: 0;
    color: var(--ink-soft);
    font-size: 0.92rem;
    line-height: 1.55;
  }
  .learn__close {
    position: absolute;
    top: 0.4rem;
    right: 0.5rem;
    border: none;
    background: none;
    color: var(--ink-soft);
    font-size: 1.4rem;
    line-height: 1;
    cursor: pointer;
  }

  .events {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 0.9rem;
    margin: 1.1rem 0;
    padding: 0.65rem 0.85rem;
    background: var(--paper-2);
    border-radius: var(--radius, 8px);
  }
  .events__label {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-faint, #999);
  }
  .event {
    display: flex;
    flex-direction: column;
    min-width: 96px;
  }
  .event__name {
    font-size: 0.86rem;
    font-weight: 600;
    color: var(--ink);
  }
  .event__when {
    font-size: 0.76rem;
    color: var(--ink-soft);
    font-variant-numeric: tabular-nums;
  }

  .orbital {
    margin: 1.25rem 0 0;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem 1.25rem;
  }
  .orbital svg {
    flex: 1 1 300px;
    max-width: 380px;
  }
  .phase-side {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
  }
  .phase-side__cap {
    font-size: 0.76rem;
    color: var(--ink-soft);
  }
  .orbital figcaption {
    flex: 1 1 100%;
    color: var(--ink-soft);
    font-size: 0.84rem;
    line-height: 1.5;
  }
  .sunlight {
    stroke: #f5c54a;
    stroke-width: 1.5;
    stroke-dasharray: 2 4;
    opacity: 0.6;
  }
  .orbit {
    fill: none;
    stroke: var(--line);
    stroke-dasharray: 3 3;
  }
  .sight {
    stroke: var(--ink-faint, #aaa);
    stroke-width: 1;
    stroke-dasharray: 2 3;
  }
  .orb-moon-dark {
    fill: var(--paper-3);
  }
  .orb-moon-lit {
    fill: #f1ecdd;
  }
  .orb-moon-ring {
    fill: none;
    stroke: var(--ink-soft);
    stroke-width: 1;
  }

  .hint {
    color: var(--ink-soft);
    font-size: 0.88rem;
    line-height: 1.5;
    margin-top: 1rem;
  }
  .hint a {
    color: var(--red);
    white-space: nowrap;
  }
</style>
