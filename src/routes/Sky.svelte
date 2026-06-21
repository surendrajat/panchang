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
    moonIlluminationAtJD,
    civilMidnightInZone,
    ayanamsa,
    norm360,
  } from '$lib/astro';
  import { grahaSiderealLongitude } from '$lib/jyotish';
  import type { GrahaKey } from '$lib/jyotish';
  import { tithiIndexFromElongation } from '$lib/jyotish/sky-math';
  import { RASHI_LORDS } from '$lib/jyotish/names';
  import { RASHI_ELEMENT, ELEMENT_LABEL } from '$lib/jyotish/rashi-art';
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

  // What each graha signifies (for the tap-to-learn card).
  const PLANET_INFO: Record<GrahaKey, { en: string; hi: string }> = {
    sun: { en: 'The soul, vitality and the self.', hi: 'आत्मा, ओज और स्वत्व।' },
    moon: { en: 'The mind, emotion and nourishment.', hi: 'मन, भावना और पोषण।' },
    mars: {
      en: 'Energy, courage and drive — lord of Mesha & Vrishchika.',
      hi: 'ऊर्जा, साहस, कर्म — मेष व वृश्चिक का स्वामी।',
    },
    mercury: {
      en: 'Intellect, speech and commerce — lord of Mithuna & Kanya.',
      hi: 'बुद्धि, वाणी, व्यापार — मिथुन व कन्या का स्वामी।',
    },
    jupiter: {
      en: 'Wisdom, growth and fortune — lord of Dhanu & Meena.',
      hi: 'ज्ञान, विस्तार, भाग्य — धनु व मीन का स्वामी।',
    },
    venus: {
      en: 'Love, beauty and the arts — lord of Vrishabha & Tula.',
      hi: 'प्रेम, सौन्दर्य, कला — वृषभ व तुला का स्वामी।',
    },
    saturn: {
      en: 'Discipline, time and karma — lord of Makara & Kumbha.',
      hi: 'अनुशासन, समय, कर्मफल — मकर व कुम्भ का स्वामी।',
    },
    rahu: {
      en: 'A shadow-graha, not a real body — the north point where the Moon’s path crosses the Sun’s. Eclipses happen here; it stands for ambition and the unconventional.',
      hi: 'छाया-ग्रह (कोई वास्तविक पिंड नहीं) — चन्द्रपथ का सूर्यपथ से उत्तर संधि-बिंदु। यहीं ग्रहण होते हैं; महत्वाकांक्षा व अपरंपरा।',
    },
    ketu: {
      en: 'A shadow-graha, not a real body — the south crossing point, always opposite Rahu. Detachment, insight and liberation.',
      hi: 'छाया-ग्रह (कोई वास्तविक पिंड नहीं) — दक्षिण संधि-बिंदु, सदा राहु के सम्मुख। वैराग्य, अंतर्दृष्टि व मोक्ष।',
    },
  };

  import {
    nakshatraNameByIndex,
    tithiNameByIndex,
    yogaNameByIndex,
    rashiNameByIndex,
  } from '$lib/i18n';
  import { rashiLabel, grahaLabel } from '$lib/labels';
  import { applyNumerals } from '$lib/format/numerals';
  import MoonPhase from '../components/MoonPhase.svelte';
  import CelestialMark from '../components/CelestialMark.svelte';
  // Shared sky visuals (also used by the #/learn notebook) — one source so both
  // pages draw the identical wheel, orbital diagram and dome.
  import EclipticWheel from '../components/sky/EclipticWheel.svelte';
  import OrbitalView from '../components/sky/OrbitalView.svelte';
  import StarDome from '../components/sky/StarDome.svelte';

  const lang = $derived(preferences.language);
  const num = (s: string | number) => applyNumerals(String(s), preferences.numerals);
  const hi = (h: string, e: string) => (lang === 'hi' ? h : e);
  // 3-way name: Devanagari in Hindi; otherwise the Sanskrit transliteration or
  // plain English per the transliteration preference (like grahaLabel/rashiLabel).
  const tn = (dev: string, tr: string, en: string) =>
    lang === 'hi' ? dev : preferences.transliteration ? tr : en;
  // Respects the transliteration preference (Mesha vs Aries) — see lib/labels.
  const signName = (i: number) => rashiLabel(i);
  // Earth isn't a graha, so it has no grahaLabel — mirror the transliteration by hand.
  const earthLabel = $derived(tn('पृथ्वी', 'Prithvi', 'Earth'));

  // ── Time model (capped ~30 fps; idle when paused; torn down on unmount) ─────
  let simMs = $state(Date.now());
  let speed = $state(0);
  let live = $state(true);
  // Per-view display options. The wheel and the dome each have their own local
  // controls (and their own defaults); the orbital model has none — its labels
  // show on hover/tap only.
  let wheelGrahas = $state(false);
  let wheelLabels = $state(false);
  let tropical = $state(false);
  let showAngles = $state(false);
  // the wheel's options live behind a gear in its corner (the dome's own
  // controls now live inside the StarDome component)
  let wheelMenu = $state(false);
  $effect(() => {
    if (!live && speed === 0) return;
    let raf = 0;
    let last = performance.now();
    let liveAcc = 0;
    let evAcc = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const dt = t - last;
      // Cap at ~30fps everywhere; the 1 Hz live gate below keeps the at-rest
      // view idle, and scrubbing stays smooth (lower caps read as jitter).
      if (dt < 30) return;
      last = t;
      if (live) {
        // Real time barely moves between frames and nothing on the wheel shifts
        // visibly — 1 Hz is plenty and keeps the ephemeris/derived work idle.
        liveAcc += dt;
        if (liveAcc >= 1000) {
          simMs = Date.now();
          liveAcc = 0;
        }
      } else simMs += speed * dt;
      // The events (4 boundary bisections) only change when the simulated DAY
      // changes, so refresh their base then rather than every 400 ms.
      evAcc += dt;
      if (evAcc >= 400) {
        evAcc = 0;
        if (Math.floor(simMs / 86_400_000) !== Math.floor(eventsBaseMs / 86_400_000)) {
          eventsBaseMs = simMs;
        }
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  const SPEEDS = [
    { key: 'pause', live: false, speed: 0, n: '', hi: 'रोकें', en: 'Pause' },
    // "से." with the trailing dot — abbreviation of "सेकंड" (second), so it
    // doesn't read as "से" (the postposition meaning "from")
    { key: 'hour', live: false, speed: 3600, n: '1', hi: 'घंटा/से.', en: 'hour/s' },
    { key: 'day', live: false, speed: 86400, n: '1', hi: 'दिन/से.', en: 'day/s' },
    { key: 'week', live: false, speed: 604800, n: '1', hi: 'सप्ताह/से.', en: 'week/s' },
  ];
  const activeSpeedKey = $derived(
    live ? 'now' : (SPEEDS.find((s) => s.speed === speed)?.key ?? 'pause'),
  );
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
  const tithiNum = $derived(tithiIndexFromElongation(elong));
  const tithiFrac = $derived((elong % 12) / 12);
  const paksha = $derived(elong < 180 ? hi('शुक्ल', 'Shukla') : hi('कृष्ण', 'Krishna'));
  const nakNum = $derived(Math.floor(moonSid / NAK_ARC) + 1);
  const yogaNum = $derived(Math.floor(norm360(sunSid + moonSid) / NAK_ARC) + 1);
  // Engine's true phase fraction (same source as the Day card), not the
  // elongation approximation — so Sky and the Day card show the same "% lit".
  const illum = $derived(moonIlluminationAtJD(jd));

  // Sidereal vs tropical is only a zodiac reference shift: the bodies stay put,
  // the sign boundaries rotate by the ayanamsa. So the displayed SIGN of a body
  // shifts, illustrating why the two zodiacs disagree.
  const ringShift = $derived(tropical ? ayan : 0);
  const displaySign = (sidLon: number) => Math.floor(norm360(sidLon + ringShift) / 30);
  const sunRashi = $derived(displaySign(sunSid));
  const moonRashi = $derived(displaySign(moonSid));

  const GRAHA_KEYS: readonly GrahaKey[] = [
    'mars',
    'mercury',
    'jupiter',
    'venus',
    'saturn',
    'rahu',
    'ketu',
  ];
  const grahaPositions = $derived.by(() =>
    wheelGrahas
      ? GRAHA_KEYS.map((key) => ({
          key,
          lon: grahaSiderealLongitude(key, jd, preferences.ayanamsa, preferences.nodeType),
        }))
      : [],
  );

  // Build the formatter only when locale/timezone/format change — not every
  // animation frame (constructing Intl.DateTimeFormat is comparatively costly).
  const simLabelFmt = $derived(
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
  const simLabel = $derived(num(simLabelFmt.format(simDate)));

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
    let days = ((((target - e) % 360) + 360) % 360) / 12.19;
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
    const inDays =
      days === 0
        ? hi('आज', 'today')
        : days === 1
          ? hi('कल', '1 day')
          : `${num(days)} ${hi('दिन', 'days')}`;
    return `${num(ds)} · ${inDays}`;
  }
  let eventsBaseMs = $state(Date.now());
  const events = $derived.by(() => {
    const fromJd = dateToJulian(new Date(eventsBaseMs));
    // Seed the "next event" search from the location's civil midnight (not UTC
    // midnight), so the search window matches the panchanga's day boundary.
    const dayJd = dateToJulian(
      civilMidnightInZone(new Date(eventsBaseMs), preferences.location?.timezone ?? 'UTC'),
    );
    const sunSidAt = (j: number) =>
      norm360(sunLongitudeAtJD(j) - ayanamsa(j, preferences.ayanamsa));
    const moonSidAt = (j: number) =>
      norm360(moonLongitudeAtJD(j) - ayanamsa(j, preferences.ayanamsa));
    const sunNow = sunSidAt(dayJd);
    const nextSign = (Math.floor(sunNow / 30) + 1) % 12;
    const sankrJd = refineCrossing(
      dayJd + ((((nextSign * 30) % 360) - sunNow + 360) % 360 || 30) / 0.9856,
      sunSidAt,
      (nextSign * 30) % 360,
    );
    const pJd = nextElongJd(dayJd, 180);
    const aJd = nextElongJd(dayJd, 360);
    const ekJd = Math.min(nextElongJd(dayJd, 120), nextElongJd(dayJd, 300));
    // lon = where on the zodiac the event lands (the Moon's place, or the sign
    // boundary for a sankranti) — used for the markers around the wheel.
    return [
      { key: 'purnima', hi: 'पूर्णिमा', en: 'Purnima', jd: pJd, lon: moonSidAt(pJd) },
      { key: 'amavasya', hi: 'अमावस्या', en: 'Amavasya', jd: aJd, lon: moonSidAt(aJd) },
      { key: 'ekadashi', hi: 'एकादशी', en: 'Ekadashi', jd: ekJd, lon: moonSidAt(ekJd) },
      {
        key: 'sankranti',
        hi: `${rashiNameByIndex(nextSign, 'hi')} संक्रांति`,
        en: `${rashiLabel(nextSign)} Sankranti`,
        jd: sankrJd,
        lon: (nextSign * 30) % 360,
      },
    ]
      .sort((a, b) => a.jd - b.jd)
      .map((ev) => ({ ...ev, when: eventWhen(ev.jd, fromJd) }));
  });
  // Event markers for the wheel component: position (sidereal lon) + localized label.
  const wheelEvents = $derived(
    events.map((ev) => ({ key: ev.key, lon: ev.lon, label: lang === 'hi' ? ev.hi : ev.en })),
  );

  // ── Tap-to-learn ────────────────────────────────────────────────────────────
  type Selected = {
    type: 'rashi' | 'sun' | 'moon' | 'earth' | 'graha' | 'nakshatra';
    i?: number;
    key?: GrahaKey;
  } | null;
  let selected = $state<Selected>(null);
  const learn = $derived.by(() => {
    const s = selected;
    if (!s) return null;
    if (s.type === 'earth')
      return {
        title: earthLabel,
        body: hi(
          'आप यहाँ हैं — यह भूकेन्द्रित दृष्टि है। चक्र दिखाता है कि पृथ्वी से देखने पर सूर्य, चन्द्र और ग्रह किस राशि में हैं।',
          'You are here — this is the geocentric view. The wheel shows which sign the Sun, Moon and planets sit in as seen from Earth.',
        ),
      };
    if (s.type === 'sun')
      return {
        title: hi('सूर्य', 'The Sun'),
        body: hi(
          'सूर्य की राशि से मास और ऋतु तय होते हैं। यह हर ~30 दिन में एक राशि बदलता है — हर बार संक्रांति।',
          'The Sun’s sign sets the month and the season. It moves one sign (~30°) every ~30 days — each crossing is a sankranti.',
        ),
      };
    if (s.type === 'nakshatra')
      return {
        title: hi('नक्षत्र', 'Nakshatra'),
        body: hi(
          `भीतरी वलय की 27 लकीरें = 27 नक्षत्र (चन्द्रपथ के 27 भाग)। चन्द्र लगभग हर दिन एक नक्षत्र पार करता है। अभी: ${nakshatraNameByIndex(nakNum, 'hi')}।`,
          `The 27 ticks on the inner ring are the 27 nakshatras — equal segments of the Moon's path. The Moon crosses one about every day. Now: ${nakshatraNameByIndex(nakNum, 'en')}.`,
        ),
      };
    if (s.type === 'moon')
      return {
        title: hi('चन्द्र', 'The Moon'),
        body: hi(
          'चन्द्र सूर्य से जितना आगे है (अंतर) ÷ 12° = तिथि। यह लगभग हर दिन एक नक्षत्र (भीतरी वलय की 27 लकीरें) पार करता है।',
          'How far the Moon is ahead of the Sun (the gap) ÷ 12° = the tithi. It crosses one nakshatra (the 27 inner-ring ticks) about every day.',
        ),
      };
    if (s.type === 'graha') {
      const k = s.key!;
      const gp = grahaPositions.find((g) => g.key === k);
      const sign = gp ? signName(displaySign(gp.lon)) : '';
      const loc = gp ? hi(`${sign} में · `, `In ${sign} · `) : '';
      return {
        title: grahaLabel(k),
        body: loc + PLANET_INFO[k][lang === 'hi' ? 'hi' : 'en'],
      };
    }
    const i = s.i!;
    const lord = grahaLabel(RASHI_LORDS[i]);
    const elName = ELEMENT_LABEL[RASHI_ELEMENT[i]];
    const el = tn(elName.hi, elName.tr, elName.en);
    const m = SIGN_MONTH[i];
    return {
      title: signName(i),
      body: hi(
        `तत्व: ${el} · स्वामी ग्रह: ${lord}। सूर्य जब इस राशि में हो (~${m.greg.hi}) तब ${m.mon.hi} मास होता है।`,
        `Element: ${el} · ruled by ${lord}. When the Sun is in this sign (~${m.greg.en}), it's the ${m.mon.en} month.`,
      ),
    };
  });

</script>

<!-- a small toggle chip, reused by the per-view control rows -->
{#snippet ctrl(active: boolean, toggle: () => void, label: string)}
  <button type="button" class="chip" class:on={active} aria-pressed={active} onclick={toggle}>
    <span class="chip__dot"></span>{label}
  </button>
{/snippet}

<!-- a gear button that sits in a view's corner and opens its options menu -->
{#snippet gear(open: boolean, toggle: () => void, label: string)}
  <button
    type="button"
    class="view-gear"
    class:on={open}
    onclick={toggle}
    aria-expanded={open}
    aria-label={label}
  >
    <svg viewBox="0 0 24 24" aria-hidden="true"
      ><path
        d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.21.08-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
      /></svg
    >
  </button>
{/snippet}

<section class="sky">
  <header class="sky__head">
    <h2>{hi('आकाश दृश्य', 'The Sky View')}</h2>
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
      <button type="button" class:on={activeSpeedKey === 'now'} onclick={goNow}
        >● {hi('अभी', 'Now')}</button
      >
      {#each SPEEDS as s (s.key)}
        <button type="button" class:on={activeSpeedKey === s.key} onclick={() => setSpeed(s)}
          >{s.n ? num(s.n) + ' ' : ''}{lang === 'hi' ? s.hi : s.en}</button
        >
      {/each}
    </div>
    <p class="speed-hint">
      {hi(
        '💡 ग्रहों की गति यहाँ टैप करके बढ़ाई जा सकती है',
        '💡 The speed of planets can be increased by tapping here',
      )}
    </p>
  </div>

  <div class="sky__grid">
    <div class="view-frame">
      <EclipticWheel
        sunLon={sunSid}
        moonLon={moonSid}
        {ayan}
        {tropical}
        grahas={grahaPositions}
        show={{
          earth: true,
          nakRing: true,
          nakBand: true,
          elong: true,
          angles: showAngles,
          grahas: wheelGrahas,
        }}
        labelsShown={wheelLabels}
        events={wheelEvents}
        {selected}
        onpick={(p) => (selected = p)}
        label={hi('आकाश चक्र', 'Ecliptic wheel')}
      />
      {@render gear(wheelMenu, () => (wheelMenu = !wheelMenu), hi('चक्र विकल्प', 'Wheel options'))}
      {#if wheelMenu}
        <button
          class="menu-backdrop"
          type="button"
          onclick={() => (wheelMenu = false)}
          aria-label={hi('बंद करें', 'Close')}
        ></button>
        <div class="view-menu" role="group" aria-label={hi('चक्र विकल्प', 'Wheel options')}>
          <p class="view-menu__title">{hi('चक्र', 'Wheel')}</p>
          {@render ctrl(wheelGrahas, () => (wheelGrahas = !wheelGrahas), hi('ग्रह', 'Planets'))}
          {@render ctrl(wheelLabels, () => (wheelLabels = !wheelLabels), hi('नाम', 'Labels'))}
          {@render ctrl(tropical, () => (tropical = !tropical), hi('सायन', 'Tropical'))}
          {@render ctrl(showAngles, () => (showAngles = !showAngles), hi('कोण', 'Angles'))}
        </div>
      {/if}
    </div>

    <div class="readout">
      <dl class="vals">
        <div class="val">
          <dt class="dt-body">
            <span class="ic--sun"><CelestialMark body="sun" size={15} /></span>{grahaLabel('sun')}
          </dt>
          <dd>{signName(sunRashi)} <span class="muted">{num(sunSid.toFixed(1))}°</span></dd>
        </div>
        <div class="val">
          <dt class="dt-body">
            <span class="ic--moon"><CelestialMark body="moon" size={15} /></span>{hi(
              'चन्द्र',
              'Moon',
            )}
          </dt>
          <dd>{signName(moonRashi)} <span class="muted">{num(moonSid.toFixed(1))}°</span></dd>
        </div>
        <div class="val val--hero">
          <dt class="dt-gap">
            <span>{hi('अंतर', 'Gap')} (</span><span class="ic--moon"
              ><CelestialMark body="moon" size={14} /></span
            ><span>−</span><span class="ic--sun"><CelestialMark body="sun" size={14} /></span><span
              >) ÷ 12°</span
            >
          </dt>
          <dd>
            <span class="hero-num"
              >{num(elong.toFixed(1))}° →
              <b>{hi('तिथि', 'Tithi')} {tithiNameByIndex(tithiNum, lang)}</b></span
            >
            <span class="hero-tithi muted">{paksha} · {num((tithiFrac * 100).toFixed(0))}%</span>
          </dd>
        </div>
        <div class="val">
          <dt>{hi('नक्षत्र', 'Nakshatra')}</dt>
          <dd>{nakshatraNameByIndex(nakNum, lang)}</dd>
        </div>
        <div class="val">
          <dt>{hi('योग', 'Yoga')}</dt>
          <dd>{yogaNameByIndex(yogaNum, lang)}</dd>
        </div>
        <div class="val">
          <dt>{hi('चन्द्र कला', 'Moon phase')}</dt>
          <dd>
            {num((illum * 100).toFixed(0))}% {hi('प्रकाशित', 'lit')}
            <span class="muted">({paksha})</span>
          </dd>
        </div>
      </dl>
      {#if tropical}
        <p class="zodiac-note">
          {hi(
            `सायन राशियाँ — तारों से ~${num(ayan.toFixed(1))}° खिसकी हुई (अयनांश)। पंचांग स्वयं निरयन है।`,
            `Tropical signs — drifted ~${num(ayan.toFixed(1))}° from the stars (ayanāṁśa). The panchanga itself uses sidereal.`,
          )}
        </p>
      {/if}
    </div>
  </div>

  {#if learn}
    <aside class="learn">
      <button
        class="learn__close"
        type="button"
        onclick={() => (selected = null)}
        aria-label={hi('बंद करें', 'Close')}>×</button
      >
      <h3>{learn.title}</h3>
      <p>{learn.body}</p>
    </aside>
  {:else}
    <p class="tap-hint">
      {hi(
        '💡 चक्र में किसी राशि, ग्रह, सूर्य/चन्द्र/पृथ्वी या नक्षत्र-वलय पर टैप करके जानें',
        '💡 Tap any sign, planet, the Sun, Moon, Earth or the nakshatra ring on the wheel to learn about it',
      )}
    </p>
  {/if}

  <p class="hint">
    {hi(
      'गति बढ़ाएँ और देखें — हर 12° पर नई तिथि, 180° पर पूर्णिमा। ग्रह चालू करें तो तेज़ गति पर वक्री गति भी दिखती है।',
      'Speed it up — every 12° is a new tithi, 180° is the full moon. Turn on the planets and watch one go retrograde at speed.',
    )}
    <a
      href="https://github.com/surendrajat/panchang/tree/main/docs/guide"
      target="_blank"
      rel="noopener">{hi('यह कैसे काम करता है →', 'How this works →')}</a
    >
  </p>

  <div class="events">
    <span class="events__label">{hi('आगामी घटनाएँ', 'Upcoming events')}</span>
    {#each events as ev (ev.key)}
      <div class="event">
        <span class="event__name"
          ><span class="event-swatch event-mark--{ev.key}"></span>{lang === 'hi'
            ? ev.hi
            : ev.en}</span
        ><span class="event__when">{ev.when}</span>
      </div>
    {/each}
  </div>

  <!-- Side view: the model on the left, the phase we actually see on the right -->
  <div class="what-we-see">
    <figure class="orbital">
      <OrbitalView {elong} {earthLabel} labelMode="hover" />
      <figcaption>
        {hi(
          'चन्द्र का सूर्य-मुखी आधा भाग सदा प्रकाशित; पृथ्वी से हम उसे एक कोण पर देखते हैं — वही अंतर चन्द्र की कला है।',
          "The Moon's sunward half is always lit; from Earth we see it at an angle — and that gap is the Moon's phase.",
        )}
      </figcaption>
    </figure>

    <figure class="moonphase">
      <MoonPhase illumination={illum} phaseAngle={elong} phaseName={paksha} size={120} />
      <figcaption>
        {hi('चन्द्र हमें कैसा दिखता है', 'How the Moon looks to us')} —
        <strong>{num((illum * 100).toFixed(0))}% {hi('प्रकाशित', 'lit')}</strong>, {paksha}
        {tithiNameByIndex(tithiNum, lang)}
      </figcaption>
    </figure>
  </div>

  <StarDome date={simDate} {illum} {elong} controls />
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
  .desc {
    color: var(--ink-soft);
    margin: 0.4rem 0 0.9rem;
    font-size: 0.95rem;
  }

  /* keep the date + speed controls in view while scrolling the long Sky page */
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
     while the wheel animates under the sticky bar) — drop it on touch / small
     screens and make the bar fully opaque instead. */
  @media (hover: none), (max-width: 600px) {
    .timebar {
      backdrop-filter: none;
      background: var(--paper);
    }
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
  /* speed: a segmented control — connected pills in a soft track, active filled */
  .speeds {
    display: inline-flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 2px;
    margin-top: 0.55rem;
    padding: 3px;
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: var(--radius-pill, 999px);
  }
  /* small italic affordance under the speed control — the segmented buttons
     don't immediately read as "time controls," so this names them */
  .speed-hint {
    margin: 0.75rem 0 0;
    font-size: 0.72rem;
    color: var(--ink-faint);
    line-height: 1.2;
    font-style: italic;
  }
  .speeds button {
    padding: 0.32rem 0.78rem;
    border: none;
    border-radius: var(--radius-pill, 999px);
    background: none;
    color: var(--ink-soft);
    font: inherit;
    font-size: 0.82rem;
    cursor: pointer;
    white-space: nowrap;
    transition:
      background 0.15s,
      color 0.15s;
  }
  /* keep the speed control on one row on phones */
  @media (max-width: 460px) {
    .speeds {
      gap: 1px;
      padding: 2px;
    }
    .speeds button {
      padding: 0.3rem 0.46rem;
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
  /* display options: toggle chips with a fill-dot, clearer than checkboxes */
  .chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.4rem;
    margin-top: 0.55rem;
  }
  /* a view (wheel / dome) and its in-corner gear + options popover */
  .view-frame {
    position: relative;
    flex: 1 1 360px;
    max-width: 460px;
  }
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
    background: color-mix(in srgb, var(--paper) 90%, transparent);
    color: var(--ink-soft);
    box-shadow: 0 1px 4px var(--shadow);
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
  .view-menu .chip {
    width: 100%;
    justify-content: flex-start;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.42em;
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

  .sky__grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1.5rem;
    align-items: center;
    justify-content: center;
  }
  .wheel {
    width: 100%;
  }
  /* fixed-width readout so changing values never reflow the wheel */
  .readout {
    flex: 0 0 270px;
    max-width: 100%;
  }

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
  /* icon-bearing label + the gap formula: flex so the SVG marks centre
     exactly against the text and operators (no baseline guesswork) */
  .dt-body {
    display: flex;
    align-items: center;
    gap: 0.4em;
  }
  .dt-gap {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.2em;
  }
  /* the Sun/Moon SVG marks (shared with the day card) */
  .ic--sun {
    color: #d98008;
    display: inline-flex;
  }
  .ic--moon {
    color: #4a79a8;
    display: inline-flex;
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

  /* "what we see": the Sun–Earth–Moon model on the left, the phase on the right */
  .what-we-see {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 1rem 1.75rem;
    margin-top: 1.5rem;
  }
  .orbital {
    flex: 1 1 300px;
    max-width: 400px;
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.6rem;
  }
  .orbital svg {
    width: 100%;
    max-width: 360px;
  }
  /* sky dome — a dark twilight all-sky view of the local sky */
  .moonphase {
    flex: 0 1 200px;
    margin: 0;
    text-align: center;
  }
  .moonphase figcaption {
    margin-top: 12px;
    font-size: 13.5px;
    color: var(--ink-soft);
    line-height: 1.5;
  }
  .moonphase figcaption strong {
    color: var(--ink);
  }
  .orbital figcaption {
    flex: 1 1 100%;
    color: var(--ink-soft);
    font-size: 0.84rem;
    line-height: 1.5;
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
