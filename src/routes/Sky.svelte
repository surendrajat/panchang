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
    bodyAltAz,
    starAltAz,
    bodyArc,
    type SkyBody,
    ayanamsa,
    norm360,
  } from '$lib/astro';
  import { grahaSiderealLongitude } from '$lib/jyotish';
  import type { GrahaKey } from '$lib/jyotish';
  import { tithiIndexFromElongation } from '$lib/jyotish/sky-math';
  import { RASHI_LORDS } from '$lib/jyotish/names';
  import { RASHI_ELEMENT, ELEMENT_LABEL } from '$lib/jyotish/rashi-art';
  // Sign / planet marks: real glyphs from the bundled 'Panchang Symbols' font.
  import { SIGN_GLYPH } from '$lib/jyotish/glyphs';
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
  import BodyIcon from '../components/BodyIcon.svelte';

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
  let domeGrahas = $state(true);
  let domeLabels = $state(false);
  let domeStarsOn = $state(true);
  let domeAtmosphere = $state(true);
  let domePaths = $state(true);
  let domeDirections = $state(true);
  // each view's options live behind a gear in its own corner
  let wheelMenu = $state(false);
  let domeMenu = $state(false);
  // Hover (desktop) or tap (phones, where there's no hover) a body to reveal its
  // label even when labels are off — one body at a time. Action attaches the
  // tap/keyboard toggle so the template stays free of inline handlers.
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
    { key: 'hour', live: false, speed: 3600, n: '1', hi: 'घंटा/से', en: 'hour/s' },
    { key: 'day', live: false, speed: 86400, n: '1', hi: 'दिन/से', en: 'day/s' },
    { key: 'week', live: false, speed: 604800, n: '1', hi: 'सप्ताह/से', en: 'week/s' },
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

  // ── Wheel geometry ─────────────────────────────────────────────────────────
  const SIZE = 380;
  const C = SIZE / 2;
  const R_OUT = 184;
  const R_IN = 138;
  const R_NAME = 170; // curved sign names (outer)
  const R_ICON = 149; // sign icon, tucked inside the name
  const R_BODY = 116; // Sun / Moon (clear of the ring and the grahas)
  const R_ARC = 54; // elongation arc (small, central)

  // Stagger grahas that bunch up in longitude (inner planets crowd the Sun) onto
  // slightly different radii so their globes + names don't collide into a mash.
  // Fixed per-graha radius. The radius is purely visual (it carries no
  // astronomical meaning — only the angle = sidereal longitude does), so giving
  // each graha its own ring keeps them from piling up AND makes motion smooth:
  // only the angle animates, so there are no cluster-tier jumps.
  const GRAHA_RADIUS: Record<GrahaKey, number> = {
    sun: R_BODY,
    moon: R_BODY,
    ketu: 58,
    mercury: 65,
    venus: 72,
    rahu: 79,
    mars: 86,
    saturn: 93,
    jupiter: 100,
  };
  const grahaLayout = $derived(grahaPositions.map((g) => ({ ...g, r: GRAHA_RADIUS[g.key] })));

  function pt(deg: number, r: number): [number, number] {
    const a = (deg * Math.PI) / 180;
    return [C + r * Math.cos(a), C - r * Math.sin(a)];
  }
  const ptStr = (deg: number, r: number) =>
    pt(deg, r)
      .map((n) => n.toFixed(2))
      .join(' ');
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

  const elongPath = $derived(
    `M ${ptStr(sunSid, R_ARC)} A ${R_ARC} ${R_ARC} 0 ${elong > 180 ? 1 : 0} 0 ${ptStr(moonSid, R_ARC)}`,
  );
  // Angle-measurement overlay: longitudes are measured CCW from sidereal 0°
  // (Mesha start, due east). Each arc sweeps from there to the body's angle.
  const R_SUN_ARC = 30; // angle arcs sit close to Earth (centre)
  const R_MOON_ARC = 40;
  const angleArc = (deg: number, r: number) =>
    `M ${ptStr(0, r)} A ${r} ${r} 0 ${deg > 180 ? 1 : 0} 0 ${ptStr(deg, r)}`;
  const sunAnglePath = $derived(angleArc(sunSid, R_SUN_ARC));
  const moonAnglePath = $derived(angleArc(moonSid, R_MOON_ARC));
  const rashis = Array.from({ length: 12 }, (_, i) => i);
  const nakTicks = Array.from({ length: 27 }, (_, i) => i * NAK_ARC);
  // Subtle band over the nakshatra the Moon currently sits in (an annulus
  // segment between R_IN and R_IN-7 spanning the Moon's 13.3° nakshatra).
  const nakBandPath = $derived.by(() => {
    const a = (nakNum - 1) * NAK_ARC;
    const b = nakNum * NAK_ARC;
    return `M ${ptStr(a, R_IN)} A ${R_IN} ${R_IN} 0 0 0 ${ptStr(b, R_IN)} L ${ptStr(b, R_IN - 7)} A ${R_IN - 7} ${R_IN - 7} 0 0 1 ${ptStr(a, R_IN - 7)} Z`;
  });
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
  const litHalf = (cx: number, cy: number, r: number) =>
    `M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} Z`;

  // ── Sky dome: the Sun & Moon in YOUR local sky (all-sky view — zenith at the
  // centre, horizon at the rim; N up, E left, S down, W right) ─────────────────
  const DOME = 200;
  const DC = DOME / 2;
  const DR = 82;
  function domePt(az: number, alt: number): [number, number] {
    const r = (DR * (90 - alt)) / 90; // zenith → centre, horizon → rim
    const a = (az * Math.PI) / 180;
    return [DC - r * Math.sin(a), DC - r * Math.cos(a)];
  }
  // The lit-portion path of the Moon at its current phase (mirrors
  // MoonPhase.svelte) so the dome shows the Moon's real crescent/gibbous shape.
  function moonLitPath(cx: number, cy: number, r: number, lit: number, phaseAngle: number): string {
    const waxing = phaseAngle < 180;
    const rx = Math.abs(r * Math.cos(lit * Math.PI));
    const gibbous = lit > 0.5;
    const limbSweep = waxing ? 1 : 0;
    const termSweep = waxing ? (gibbous ? 1 : 0) : gibbous ? 0 : 1;
    return `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${limbSweep} ${cx} ${cy + r} A ${rx} ${r} 0 0 ${termSweep} ${cx} ${cy - r} Z`;
  }
  // A body's path across the local sky as ONE clean horizon-to-horizon arc.
  // Sample strictly between the rise and set that bracket the transit nearest
  // `centerMs` (bodyArc) — a fixed wall-clock window would straddle two days and
  // draw a chord across the middle of the dome. Circumpolar bodies (no rise/set)
  // fall back to a full 24 h loop.
  function domeTrack(body: SkyBody, centerMs: number, lat: number, lon: number): string {
    const pts: string[] = [];
    const arc = bodyArc(body, centerMs, lat, lon);
    if (arc) {
      const N = 64;
      for (let i = 0; i <= N; i++) {
        const t = new Date(arc.riseMs + ((arc.setMs - arc.riseMs) * i) / N);
        const { azimuth, altitude } = bodyAltAz(body, t, lat, lon);
        // clamp the rise/set ends (slightly below the geometric horizon from
        // refraction) onto the rim so the arc starts and ends cleanly
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
  // Centre the path on the current time, quantised to the hour so it doesn't
  // recompute every frame (the arc barely changes within an hour).
  const domeCenter = $derived(Math.floor(simMs / 3_600_000) * 3_600_000);
  const domeTracks = $derived.by(() => {
    const loc = preferences.location;
    if (!loc) return null;
    return {
      sun: domeTrack('sun', domeCenter, loc.latitude, loc.longitude),
      moon: domeTrack('moon', domeCenter, loc.latitude, loc.longitude),
    };
  });
  // Current positions in the local sky. The Sun & Moon move visibly frame to
  // frame so they track the live time; the five planets barely move within an
  // hour, so they're quantised to domeCenter (saves ~10 engine calls/frame).
  const domeSunMoon = $derived.by(() => {
    const loc = preferences.location;
    if (!loc) return [];
    return (['sun', 'moon'] as const).map((body) => {
      const { azimuth, altitude } = bodyAltAz(body, simDate, loc.latitude, loc.longitude);
      return { body, azimuth, altitude, pt: domePt(azimuth, altitude) };
    });
  });
  const domePlanets = $derived.by(() => {
    const loc = preferences.location;
    if (!loc) return [];
    // Per-frame: a body's alt/az sweeps ~15°/hour with the sky's rotation, so
    // quantising to the hour would make the planets jump each step while scrubbing.
    return (['mercury', 'venus', 'mars', 'jupiter', 'saturn'] as const).map((body) => {
      const { azimuth, altitude } = bodyAltAz(body, simDate, loc.latitude, loc.longitude);
      return { body, azimuth, altitude, pt: domePt(azimuth, altitude) };
    });
  });
  // Sun & Moon first (drawn on top, and domeNow[0] is the Sun for the sky colour).
  const domeNow = $derived(preferences.location ? [...domeSunMoon, ...domePlanets] : null);
  const domeLoc = $derived(preferences.location?.name?.split(',')[0] ?? '');
  // Hide the Moon when it sits inside the Sun's glare (new-moon territory): you
  // couldn't see it then, and it keeps the Moon from ever overlapping the Sun.
  const domeMoonHidden = $derived.by(() => {
    const sun = domeSunMoon[0];
    const moon = domeSunMoon[1];
    if (!sun || !moon || sun.altitude < 0) return false;
    return Math.hypot(sun.pt[0] - moon.pt[0], sun.pt[1] - moon.pt[1]) < 13;
  });
  // Daylight washes things out: once the Sun is up, fade the Moon & planets (the
  // Sun itself stays full). Full at/below the horizon → ~0.45 in broad daylight.
  const dayFade = $derived.by(() => {
    const sunAlt = domeSunMoon[0]?.altitude ?? -90;
    return !domeAtmosphere || sunAlt <= 0 ? 1 : Math.max(0.45, 1 - sunAlt / 15);
  });
  // Stars/constellations are visible when the Stars toggle is on AND it is dark
  // (or the atmosphere/daylight wash is switched off).
  const domeShowStars = $derived(
    domeStarsOn && (!domeAtmosphere || (domeSunMoon[0]?.altitude ?? -90) <= 0),
  );

  function lerpRGB(a: number[], b: number[], t: number): string {
    const k = Math.max(0, Math.min(1, t));
    return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`;
  }
  // Sky colour from the Sun's altitude: dark indigo at night → blue by day, with
  // a warm twilight rim between (a little atmospheric glow), updated live.
  const domeSky = $derived.by(() => {
    const sunAlt = domeSunMoon[0]?.altitude ?? -90;
    // atmosphere off → always the dark night sky (day = 0)
    const day = domeAtmosphere ? (sunAlt + 6) / 12 : 0; // 0 below −6°, 1 above +6°
    return {
      zen: lerpRGB([22, 31, 68], [39, 82, 132], day),
      mid: lerpRGB([39, 49, 92], [72, 122, 168], day),
      rim: lerpRGB([106, 81, 96], [150, 182, 208], day),
    };
  });
  // A handful of the brightest stars (J2000 RA hours, Dec degrees, magnitude).
  // Each star carries a 3-way name. Many are the yogatārā (junction star) of a
  // nakshatra, so the Sanskrit name IS the nakshatra — meaningful in a panchanga.
  const BRIGHT_STARS = [
    { ra: 6.752, dec: -16.72, mag: -1.46, n: { hi: 'लुब्धक', tr: 'Lubdhaka', en: 'Sirius' } },
    {
      ra: 5.278,
      dec: 45.998,
      mag: 0.08,
      n: { hi: 'ब्रह्महृदय', tr: 'Brahmahridaya', en: 'Capella' },
    },
    { ra: 5.242, dec: -8.2, mag: 0.13, n: { hi: 'रिगेल', tr: 'Rigel', en: 'Rigel' } },
    { ra: 14.261, dec: 19.18, mag: -0.05, n: { hi: 'स्वाति', tr: 'Svati', en: 'Arcturus' } },
    { ra: 18.616, dec: 38.78, mag: 0.03, n: { hi: 'अभिजित्', tr: 'Abhijit', en: 'Vega' } },
    { ra: 7.655, dec: 5.225, mag: 0.34, n: { hi: 'प्रोसायन', tr: 'Procyon', en: 'Procyon' } },
    { ra: 5.919, dec: 7.407, mag: 0.5, n: { hi: 'आर्द्रा', tr: 'Ardra', en: 'Betelgeuse' } },
    { ra: 4.599, dec: 16.51, mag: 0.85, n: { hi: 'रोहिणी', tr: 'Rohini', en: 'Aldebaran' } },
    { ra: 19.846, dec: 8.868, mag: 0.76, n: { hi: 'श्रवण', tr: 'Shravana', en: 'Altair' } },
    { ra: 13.42, dec: -11.16, mag: 0.97, n: { hi: 'चित्रा', tr: 'Chitra', en: 'Spica' } },
    { ra: 16.49, dec: -26.43, mag: 0.96, n: { hi: 'ज्येष्ठा', tr: 'Jyeshtha', en: 'Antares' } },
    { ra: 7.755, dec: 28.03, mag: 1.14, n: { hi: 'पुनर्वसु', tr: 'Punarvasu', en: 'Pollux' } },
    { ra: 10.139, dec: 11.97, mag: 1.35, n: { hi: 'मघा', tr: 'Magha', en: 'Regulus' } },
    { ra: 20.69, dec: 45.28, mag: 1.25, n: { hi: 'डेनेब', tr: 'Deneb', en: 'Deneb' } },
    // southern stars, to fill the southern sky
    { ra: 22.96, dec: -29.62, mag: 1.16, n: { hi: 'फ़ोमलहॉट', tr: 'Fomalhaut', en: 'Fomalhaut' } },
    { ra: 6.399, dec: -52.7, mag: -0.74, n: { hi: 'अगस्त्य', tr: 'Agastya', en: 'Canopus' } },
    { ra: 1.629, dec: -57.24, mag: 0.46, n: { hi: 'एकरनार', tr: 'Achernar', en: 'Achernar' } },
    { ra: 22.137, dec: -46.96, mag: 1.74, n: { hi: 'मयूर', tr: 'Peacock', en: 'Peacock' } },
  ];
  // Bright stars above the horizon — only once the sky is dark. Per-frame for the
  // same reason as the planets (their alt/az rotates with the sky as time runs).
  const domeStars = $derived.by(() => {
    const loc = preferences.location;
    if (!loc || !domeShowStars) return [];
    return BRIGHT_STARS.map((st) => {
      const { azimuth, altitude } = starAltAz(st.ra, st.dec, simDate, loc.latitude, loc.longitude);
      return { ra: st.ra, mag: st.mag, n: st.n, altitude, pt: domePt(azimuth, altitude) };
    }).filter((s) => s.altitude >= 0);
  });

  // Polaris (the pole star / Dhruva) — sits almost exactly due north at an
  // altitude equal to your latitude. RA 2.53 h, Dec +89.26° (J2000).
  const domePolaris = $derived.by(() => {
    const loc = preferences.location;
    if (!loc || !domeShowStars) return null;
    const { azimuth, altitude } = starAltAz(2.53, 89.26, simDate, loc.latitude, loc.longitude);
    if (altitude < 0) return null;
    return { pt: domePt(azimuth, altitude) };
  });

  // A few well-known constellations, spread around the sky so some are always up.
  // Each: stars as [RA hours, Dec degrees] (J2000) + line segments by star index.
  const CONSTELLATIONS = [
    {
      name: { hi: 'सप्तर्षि', tr: 'Saptarishi', en: 'Big Dipper' }, // Ursa Major
      stars: [
        [11.06, 61.75],
        [11.03, 56.38],
        [11.9, 53.69],
        [12.26, 57.03],
        [12.9, 55.96],
        [13.4, 54.93],
        [13.79, 49.31],
      ],
      lines: [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
        [3, 4],
        [4, 5],
        [5, 6],
      ],
    },
    {
      name: { hi: 'मृग', tr: 'Mriga', en: 'Orion' },
      stars: [
        [5.92, 7.41],
        [5.42, 6.35],
        [5.68, -1.94],
        [5.6, -1.2],
        [5.53, -0.3],
        [5.8, -9.67],
        [5.24, -8.2],
      ],
      lines: [
        [0, 1],
        [0, 2],
        [1, 4],
        [2, 3],
        [3, 4],
        [2, 5],
        [4, 6],
        [5, 6],
      ],
    },
    {
      name: { hi: 'वृश्चिक', tr: 'Vrishchika', en: 'Scorpius' },
      stars: [
        [16.09, -19.8],
        [16.0, -22.62],
        [15.98, -26.11],
        [16.49, -26.43],
        [16.6, -28.22],
        [16.84, -34.29],
        [17.56, -37.1],
        [17.51, -37.3],
      ],
      lines: [
        [0, 1],
        [1, 2],
        [1, 3],
        [3, 4],
        [4, 5],
        [5, 6],
        [6, 7],
      ],
    },
    {
      name: { hi: 'कैसिओपिया', tr: 'Cassiopeia', en: 'Cassiopeia' }, // no standard Sanskrit name
      stars: [
        [0.15, 59.15],
        [0.68, 56.54],
        [0.95, 60.72],
        [1.43, 60.24],
        [1.91, 63.67],
      ],
      lines: [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
      ],
    },
    {
      name: { hi: 'धनु', tr: 'Dhanu', en: 'Sagittarius' }, // the "teapot", low in the south
      stars: [
        [18.47, -25.42], // Kaus Borealis
        [18.35, -29.83], // Kaus Media
        [18.4, -34.38], // Kaus Australis
        [18.76, -26.99], // Phi Sgr
        [18.92, -26.3], // Nunki
        [19.04, -29.88], // Ascella
        [19.12, -27.67], // Tau Sgr
      ],
      lines: [
        [0, 1],
        [1, 2],
        [2, 5],
        [5, 4],
        [4, 3],
        [3, 0],
        [4, 6],
        [6, 5],
      ],
    },
  ];
  // Constellations with enough stars above the horizon to draw — when it's dark.
  const domeConstellations = $derived.by(() => {
    const loc = preferences.location;
    if (!loc || !domeShowStars) return [];
    return CONSTELLATIONS.map((con) => {
      const pts = con.stars.map(([ra, dec]) => {
        const { azimuth, altitude } = starAltAz(ra, dec, simDate, loc.latitude, loc.longitude);
        return { altitude, pt: domePt(azimuth, altitude) };
      });
      const up = pts.filter((p) => p.altitude >= 0);
      if (up.length < 3) return null; // mostly below the horizon — skip
      const segs = con.lines
        .filter(([a, b]) => pts[a].altitude >= 0 && pts[b].altitude >= 0)
        .map(([a, b]) => `${pts[a].pt.join(',')} ${pts[b].pt.join(',')}`);
      const cx = up.reduce((s, p) => s + p.pt[0], 0) / up.length;
      const cy = up.reduce((s, p) => s + p.pt[1], 0) / up.length;
      const ys = up.map((p) => p.pt[1]);
      // Put the name clear of the figure (below it, or above it for low
      // constellations) instead of on top of the stars/lines.
      const labelY = cy < DC ? Math.max(...ys) + 8 : Math.min(...ys) - 5;
      return {
        key: con.name.en,
        name: con.name,
        stars: up.map((p) => p.pt),
        segs,
        cx,
        cy,
        labelY,
      };
    }).filter((c): c is NonNullable<typeof c> => c !== null);
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
        'समय की गति बदलने के लिए ऊपर टैप करें — आकाश घूमता हुआ देखें',
        'Tap a chip above to scrub time and watch the sky move',
      )}
    </p>
  </div>

  <div class="sky__grid">
    <div class="view-frame">
      <svg
        class="wheel"
        class:labels-shown={wheelLabels}
        viewBox="0 0 {SIZE} {SIZE}"
        role="img"
        aria-label={hi('आकाश चक्र', 'Ecliptic wheel')}
      >
        <defs>
          <radialGradient id="sun-grad" cx="38%" cy="36%" r="68%"
            ><stop offset="0%" stop-color="#fff8d8" /><stop
              offset="48%"
              stop-color="#ffce3a"
            /><stop offset="100%" stop-color="#f08a00" /></radialGradient
          >
          <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%"
            ><stop offset="0%" stop-color="#ffcf4d" stop-opacity="0.4" /><stop
              offset="100%"
              stop-color="#ffcf4d"
              stop-opacity="0"
            /></radialGradient
          >
          <radialGradient id="earth-grad" cx="36%" cy="32%" r="75%"
            ><stop offset="0%" stop-color="#8ec3ee" /><stop
              offset="60%"
              stop-color="#3f7ab3"
            /><stop offset="100%" stop-color="#255a8c" /></radialGradient
          >
          <radialGradient id="moon-grad" cx="38%" cy="36%" r="70%"
            ><stop offset="0%" stop-color="#f2efe6" /><stop
              offset="100%"
              stop-color="#d9d2c2"
            /></radialGradient
          >
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
              onkeydown={(e) =>
                (e.key === 'Enter' || e.key === ' ') && (selected = { type: 'rashi', i })}
            />
            <defs><path id="rname-{i}" d={namePath(i)} fill="none" /></defs>
            <text class="rashi-name" class:on={isSun || isMoon}
              ><textPath href="#rname-{i}" startOffset="50%" text-anchor="middle"
                >{signName(i)}</textPath
              ></text
            >
            <text
              class="rashi-glyph zsym"
              class:on={isSun || isMoon}
              x={ix}
              y={iy}
              text-anchor="middle"
              dominant-baseline="central"
              pointer-events="none">{SIGN_GLYPH[i]}</text
            >
          {/each}
          {#each nakTicks as deg (deg)}
            <line
              x1={pt(deg, R_IN)[0]}
              y1={pt(deg, R_IN)[1]}
              x2={pt(deg, R_IN - 5)[0]}
              y2={pt(deg, R_IN - 5)[1]}
              class="nak-tick"
            />
          {/each}
        </g>

        <!-- Highlight the nakshatra the Moon sits in, so the 27 inner ticks read
           as the Moon's nakshatras; tap to learn. (Sidereal-framed like the
           bodies; in tropical mode the ticks themselves rotate with the ring.) -->
        <path
          d={nakBandPath}
          class="nak-current"
          role="button"
          tabindex="0"
          aria-label={hi('चन्द्र नक्षत्र', 'Moon nakshatra')}
          onclick={() => (selected = { type: 'nakshatra' })}
          onkeydown={(e) =>
            (e.key === 'Enter' || e.key === ' ') && (selected = { type: 'nakshatra' })}
        />

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

        {#each grahaLayout as g (g.key)}
          {@const [gx, gy] = pt(g.lon, g.r)}
          {@const sel = selected?.type === 'graha' && selected.key === g.key}
          <g
            class="body"
            role="button"
            tabindex="0"
            aria-label={grahaLabel(g.key)}
            onclick={() => (selected = { type: 'graha', key: g.key })}
            onkeydown={(e) =>
              (e.key === 'Enter' || e.key === ' ') && (selected = { type: 'graha', key: g.key })}
          >
            {#if sel}<circle cx={gx} cy={gy} r="13" class="sel-glow" />{/if}
            <circle cx={gx} cy={gy} r="12" class="hit" />
            <BodyIcon
              kind={g.key}
              cx={gx}
              cy={gy}
              r={g.key === 'rahu' || g.key === 'ketu' ? 6 : 9}
            />
            <text x={gx} y={gy - 14} class="body-name" text-anchor="middle"
              >{grahaLabel(g.key)}</text
            >
          </g>
        {/each}

        <!-- Earth (center reference) — tap to learn the geocentric view -->
        <g
          class="body"
          role="button"
          tabindex="0"
          aria-label={earthLabel}
          onclick={() => (selected = { type: 'earth' })}
          onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (selected = { type: 'earth' })}
        >
          {#if selected?.type === 'earth'}<circle cx={C} cy={C} r="17" class="sel-glow" />{/if}
          <circle
            cx={C}
            cy={C}
            r="13"
            fill="url(#earth-grad)"
            stroke="var(--paper)"
            stroke-width="1.5"
          />
          <path
            d="M{C - 9} {C - 4} q3 -3 7 -1 q2 2 0 4 q-3 2 -7 1 q-2 -2 0 -4Z M{C + 2} {C +
              1} q4 -1 5 3 q0 3 -3 4 q-3 0 -3 -3 q-1 -3 1 -4Z M{C - 6} {C +
              5} q3 -1 4 2 q0 2 -3 2 q-2 0 -1 -4Z"
            class="earth-land"
          />
          <ellipse cx={C - 4} cy={C - 5} rx="4" ry="2.6" class="earth-shine" />
          <text x={C} y={C - 19} class="body-name" text-anchor="middle">{earthLabel}</text>
        </g>

        <!-- Moon: realistic cratered disc (the PHASE is shown in the side view) -->
        <g
          class="body"
          role="button"
          tabindex="0"
          aria-label={grahaLabel('moon')}
          onclick={() => (selected = { type: 'moon' })}
          onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (selected = { type: 'moon' })}
        >
          {#if selected?.type === 'moon'}<circle
              cx={moonPt[0]}
              cy={moonPt[1]}
              r="15"
              class="sel-glow"
            />{/if}
          <circle
            cx={moonPt[0]}
            cy={moonPt[1]}
            r="12"
            fill="url(#moon-grad)"
            stroke="var(--ink-soft)"
            stroke-width="1"
          />
          {#each craters as [dx, dy, r] (`${dx},${dy}`)}
            <circle cx={moonPt[0] + dx} cy={moonPt[1] + dy} {r} class="crater" />
          {/each}
          <text x={moonPt[0]} y={moonPt[1] - 16} class="body-name" text-anchor="middle"
            >{grahaLabel('moon')}</text
          >
        </g>

        <!-- Sun: glow + straight rays + gradient disc -->
        <g
          class="body"
          role="button"
          tabindex="0"
          aria-label={grahaLabel('sun')}
          onclick={() => (selected = { type: 'sun' })}
          onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (selected = { type: 'sun' })}
        >
          {#if selected?.type === 'sun'}<circle
              cx={sunPt[0]}
              cy={sunPt[1]}
              r="17"
              class="sel-glow"
            />{/if}
          <circle cx={sunPt[0]} cy={sunPt[1]} r="13" fill="url(#sun-glow)" />
          {#each rayAngles as a (a)}
            {@const cos = Math.cos((a * Math.PI) / 180)}
            {@const sin = Math.sin((a * Math.PI) / 180)}
            <line
              x1={sunPt[0] + cos * 11}
              y1={sunPt[1] - sin * 11}
              x2={sunPt[0] + cos * 15}
              y2={sunPt[1] - sin * 15}
              class="sun-ray"
            />
          {/each}
          <circle
            cx={sunPt[0]}
            cy={sunPt[1]}
            r="10.5"
            fill="url(#sun-grad)"
            stroke="#e07b00"
            stroke-width="0.75"
          />
          <text x={sunPt[0]} y={sunPt[1] - 17} class="body-name" text-anchor="middle"
            >{grahaLabel('sun')}</text
          >
        </g>

        <!-- upcoming events, marked where they land on the zodiac (hover for name) -->
        {#each events as ev (ev.key)}
          {@const [mx, my] = pt(ev.lon, R_IN - 5)}
          {@const [lx, ly] = pt(ev.lon, R_IN - 14)}
          <g class="body">
            <circle cx={mx} cy={my} r="3.3" class="event-mark event-mark--{ev.key}" />
            <text x={lx} y={ly} class="body-label" text-anchor="middle"
              >{lang === 'hi' ? ev.hi : ev.en}</text
            >
          </g>
        {/each}
      </svg>
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
      <svg
        class="orb-svg"
        class:revealed={revealed === 'orbital'}
        viewBox="0 0 {OW} {OH}"
        role="img"
        aria-label={hi('सूर्य–पृथ्वी–चन्द्र', 'Sun, Earth and Moon')}
        use:revealable={'orbital'}
      >
        <!-- Parallel sunlight: the Sun is effectively at infinity, so its rays
           reach the Earth–Moon system parallel (that's why the Moon's sunward
           half is always the lit half). -->
        {#each [-20, 0, 20] as dy (dy)}
          <line
            x1={SUNX + 26}
            y1={EARTH.y + dy}
            x2={EARTH.x - 16}
            y2={EARTH.y + dy}
            class="sunlight"
          />
        {/each}
        <!-- Sun: same look as the wheel — glow + straight rays + gradient disc -->
        <circle cx={SUNX} cy={EARTH.y} r="26" fill="url(#sun-glow)" />
        {#each rayAngles as a (a)}
          {@const cos = Math.cos((a * Math.PI) / 180)}
          {@const sin = Math.sin((a * Math.PI) / 180)}
          <line
            x1={SUNX + cos * 21}
            y1={EARTH.y - sin * 21}
            x2={SUNX + cos * 28}
            y2={EARTH.y - sin * 28}
            class="sun-ray"
          />
        {/each}
        <circle
          cx={SUNX}
          cy={EARTH.y}
          r="18"
          fill="url(#sun-grad)"
          stroke="#e07b00"
          stroke-width="0.75"
        />
        <text x={SUNX} y={EARTH.y + 40} class="orb-label" text-anchor="middle"
          >{grahaLabel('sun')}</text
        >
        <circle cx={EARTH.x} cy={EARTH.y} r={ORB} class="orbit" />
        <line x1={EARTH.x} y1={EARTH.y} x2={moonOrb.x} y2={moonOrb.y} class="sight" />
        <!-- Earth: same icon as the wheel -->
        <circle
          cx={EARTH.x}
          cy={EARTH.y}
          r="12"
          fill="url(#earth-grad)"
          stroke="var(--paper)"
          stroke-width="1.5"
        />
        <path
          d="M{EARTH.x - 8} {EARTH.y - 4} q3 -3 6 -1 q2 2 0 4 q-3 2 -6 1 q-2 -2 0 -4Z M{EARTH.x +
            2} {EARTH.y + 1} q3 -1 4 3 q0 3 -3 3 q-2 0 -2 -3 q-1 -2 1 -3Z"
          class="earth-land"
        />
        <ellipse cx={EARTH.x - 3} cy={EARTH.y - 4} rx="3.5" ry="2.3" class="earth-shine" />
        <text x={EARTH.x} y={EARTH.y + 28} class="orb-label" text-anchor="middle">{earthLabel}</text
        >
        <circle cx={moonOrb.x} cy={moonOrb.y} r="9" class="orb-moon-dark" />
        <path d={litHalf(moonOrb.x, moonOrb.y, 9)} class="orb-moon-lit" />
        <circle cx={moonOrb.x} cy={moonOrb.y} r="9" class="orb-moon-ring" />
        <text x={moonOrb.x} y={moonOrb.y + 21} class="orb-label" text-anchor="middle"
          >{grahaLabel('moon')}</text
        >
      </svg>
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

  {#if domeTracks && domeNow}
    <figure class="skydome">
      {@render gear(domeMenu, () => (domeMenu = !domeMenu), hi('आकाश विकल्प', 'Sky options'))}
      {#if domeMenu}
        <button
          class="menu-backdrop"
          type="button"
          onclick={() => (domeMenu = false)}
          aria-label={hi('बंद करें', 'Close')}
        ></button>
        <div class="view-menu" role="group" aria-label={hi('आकाश विकल्प', 'Sky options')}>
          <p class="view-menu__title">{hi('आकाश', 'Sky')}</p>
          {@render ctrl(domeGrahas, () => (domeGrahas = !domeGrahas), hi('ग्रह', 'Planets'))}
          {@render ctrl(domeLabels, () => (domeLabels = !domeLabels), hi('नाम', 'Labels'))}
          {@render ctrl(domeStarsOn, () => (domeStarsOn = !domeStarsOn), hi('तारे', 'Stars'))}
          {@render ctrl(
            domeAtmosphere,
            () => (domeAtmosphere = !domeAtmosphere),
            hi('वायुमंडल', 'Atmosphere'),
          )}
          {@render ctrl(domePaths, () => (domePaths = !domePaths), hi('पथ', 'Paths'))}
          {@render ctrl(
            domeDirections,
            () => (domeDirections = !domeDirections),
            hi('दिशाएँ', 'Directions'),
          )}
        </div>
      {/if}
      <svg
        class:labels-shown={domeLabels}
        viewBox="12 12 {DOME - 24} {DOME - 24}"
        role="img"
        aria-label={hi(
          'आज आपके आकाश में सूर्य, चन्द्र व ग्रह',
          'The Sun, Moon and planets in your sky today',
        )}
      >
        <defs>
          <radialGradient id="dome-grad" cx="50%" cy="38%" r="64%">
            <stop offset="0%" stop-color={domeSky.zen} />
            <stop offset="66%" stop-color={domeSky.mid} />
            <stop offset="100%" stop-color={domeSky.rim} />
          </radialGradient>
          <radialGradient id="dome-depth" cx="50%" cy="44%" r="60%">
            <stop offset="0%" stop-color="rgba(255,255,255,0.06)" />
            <stop offset="62%" stop-color="rgba(0,0,0,0)" />
            <stop offset="100%" stop-color="rgba(0,0,0,0.22)" />
          </radialGradient>
          <!-- soft sun bloom (glow instead of spiky rays) -->
          <radialGradient id="dome-sun-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fff3c0" stop-opacity="0.98" />
            <stop offset="34%" stop-color="#ffd24d" stop-opacity="0.7" />
            <stop offset="62%" stop-color="#ffab35" stop-opacity="0.26" />
            <stop offset="100%" stop-color="#ff9824" stop-opacity="0" />
          </radialGradient>
          <clipPath id="dome-clip"><circle cx={DC} cy={DC} r={DR} /></clipPath>
        </defs>
        <circle cx={DC} cy={DC} r={DR} fill="url(#dome-grad)" />
        <!-- soft highlight overhead → darker rim, so the flat disc reads as a curved sky -->
        <circle cx={DC} cy={DC} r={DR} fill="url(#dome-depth)" />
        <!-- the whole sky is clipped to the horizon, so bodies sink below the rim
             and vanish like the real view (instead of fading out) -->
        <g clip-path="url(#dome-clip)">
          <!-- constellation stick-figures (faint), behind the bright stars -->
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
                aria-label={tn('ध्रुव', 'Dhruva', 'Pole Star')}
                use:revealable={'polaris'}
              />
              <circle
                cx={domePolaris.pt[0]}
                cy={domePolaris.pt[1]}
                r="3"
                class="dome-polaris-halo"
              />
              <circle cx={domePolaris.pt[0]} cy={domePolaris.pt[1]} r="1.5" class="dome-polaris" />
              <text
                x={domePolaris.pt[0]}
                y={domePolaris.pt[1] < DC ? domePolaris.pt[1] + 9 : domePolaris.pt[1] - 6}
                class="dome-con-name"
                text-anchor="middle">{tn('ध्रुव', 'Dhruva', 'Pole Star')}</text
              >
            </g>
          {/if}
          {#if domePaths && domeTracks.sun}
            <polyline points={domeTracks.sun} class="dome-path dome-path--sun" />
          {/if}
          {#if domePaths && domeTracks.moon}
            <polyline points={domeTracks.moon} class="dome-path dome-path--moon" />
          {/if}
          <!-- planets first → small and behind, hidden with the Grahas toggle -->
          {#if domeGrahas}
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
          <!-- Moon first → behind the Sun; hidden when lost in the Sun's glare -->
          {#if domeSunMoon[1] && domeSunMoon[1].altitude >= -14 && !domeMoonHidden}
            {@const m = domeSunMoon[1]}
            {@const litD = moonLitPath(m.pt[0], m.pt[1], 8, illum, elong)}
            <!-- Moon stays fully opaque even by day (a daytime moon is pale but
                 solid — it must not show planets/stars through it). -->
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
                fill="#363842"
                stroke="rgba(255,255,255,0.4)"
                stroke-width="0.6"
              />
              <path d={litD} fill="#f1e7cb" />
              <clipPath id="dome-moon-clip"><path d={litD} /></clipPath>
              <g clip-path="url(#dome-moon-clip)">
                {#each craters as [dx, dy, cr] (`${dx},${dy}`)}
                  <circle
                    cx={m.pt[0] + dx * 0.67}
                    cy={m.pt[1] + dy * 0.67}
                    r={cr * 0.67}
                    class="crater"
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
          <!-- Sun last → always on top, so the Moon never covers it -->
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
              <!-- a soft glowing orb (no rays) — gentler than the spiky version.
                   Disc matches the Moon's size: the two look ~equal in the real sky. -->
              <circle cx={sn.pt[0]} cy={sn.pt[1]} r="19" fill="url(#dome-sun-glow)" />
              <circle cx={sn.pt[0]} cy={sn.pt[1]} r="8" fill="url(#sun-grad)" />
              <text
                x={sn.pt[0]}
                y={sn.pt[1] < DC ? sn.pt[1] + 18 : sn.pt[1] - 14}
                class="dome-label"
                text-anchor="middle">{grahaLabel('sun')}</text
              >
            </g>
          {/if}
        </g>
        <!-- horizon rim -->
        <circle cx={DC} cy={DC} r={DR} class="dome-horizon" />
        {#if domeDirections}
          <!-- small, thin cardinals hugging just inside the rim (dome stays big) -->
          <text x={DC} y={DC - DR + 9} class="dome-card" text-anchor="middle">{hi('उ', 'N')}</text>
          <text x={DC} y={DC + DR - 3} class="dome-card" text-anchor="middle">{hi('द', 'S')}</text>
          <text x={DC - DR + 9} y={DC + 3} class="dome-card" text-anchor="middle"
            >{hi('पू', 'E')}</text
          >
          <text x={DC + DR - 9} y={DC + 3} class="dome-card" text-anchor="middle"
            >{hi('प', 'W')}</text
          >
        {/if}
      </svg>
      <figcaption>
        {hi(
          `यदि आप ${domeLoc ? domeLoc + ' में ' : ''}दक्षिण की ओर मुख करके ऊपर देखें — केंद्र सिर के ऊपर, किनारा क्षितिज; पूर्व बाएँ, पश्चिम दाएँ (वास्तविक आकाश की तरह)।`,
          `As if you stood${domeLoc ? ' in ' + domeLoc : ''} facing south and looked up — the centre is overhead, the rim is the horizon, east on the left and west on the right, like the real sky.`,
        )}
      </figcaption>
    </figure>
  {/if}
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
    margin: 0.35rem 0 0;
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
  /* keyboard users get a clear focus ring on the focused sign/body (mouse
     clicks stay ring-free via :focus above) */
  .wheel :focus-visible {
    outline: 2.5px solid var(--gold, #b8860b);
    outline-offset: 1px;
    border-radius: 3px;
  }
  .rashi-name {
    font-size: 11.5px;
    fill: var(--ink-soft);
    font-weight: 600;
    letter-spacing: 0.02em;
    /* the curved name sits on top of the sign's sector path — without this,
       clicks on the name get eaten by the text (no handler) instead of the
       rashi path underneath */
    pointer-events: none;
  }
  /* The Sun/Moon's sign is already shown by the sector tint AND by the bright
     body icon sitting in that sector — flipping the name colour on top of that
     just made the labels look like they were "flickering" as bodies crossed
     signs while time scrubbed. Keep the colour stable; weight stays unchanged. */
  .rashi-name.on {
    fill: var(--ink-soft);
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
  /* same reason as .rashi-name.on — kept stable to avoid the moving highlight */
  .rashi-glyph.on {
    fill: var(--ink-soft);
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
  /* always-visible names for the planets/sun/moon/earth — small, with a paper
     halo so they read over the wheel; tapping still opens the info card */
  .body-name {
    font-size: 9px;
    font-weight: 700;
    fill: var(--ink);
    paint-order: stroke;
    stroke: var(--paper);
    stroke-width: 2.5px;
    stroke-linejoin: round;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.14s ease;
  }
  /* show all when the Labels toggle is on */
  .wheel.labels-shown .body-name {
    opacity: 0.92;
  }
  /* reveal (and highlight) the one being hovered/focused */
  .body:hover .body-name,
  .body:focus-visible .body-name {
    opacity: 1;
    fill: var(--red);
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
    pointer-events: none;
  }
  /* invisible tap target for a graha (the BodyIcon itself is pointer-events:none) */
  .hit {
    fill: transparent;
    pointer-events: all;
    cursor: pointer;
  }
  /* the Moon's current nakshatra division — subtle band, tap to learn */
  .nak-current {
    fill: color-mix(in srgb, var(--indigo) 22%, transparent);
    stroke: var(--indigo);
    stroke-width: 0.75;
    opacity: 0.8;
    cursor: pointer;
  }
  .nak-current:hover,
  .nak-current:focus-visible {
    fill: color-mix(in srgb, var(--indigo) 34%, transparent);
    outline: none;
  }
  /* Decorative — none of these should steal clicks from the rashi sectors */
  .elong-arc {
    stroke: var(--red);
    stroke-width: 4;
    stroke-linecap: round;
    opacity: 0.9;
    pointer-events: none;
  }
  .ray {
    stroke-width: 1;
    opacity: 0.22;
    pointer-events: none;
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
    pointer-events: none;
  }
  .angle-arc {
    stroke-width: 1.5;
    stroke-dasharray: 1.5 3;
    stroke-linecap: round;
    pointer-events: none;
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
    opacity: 0;
    transition: opacity 0.14s ease;
  }
  /* reveal on hover or tap (the whole little diagram), or with the Labels toggle */
  .orb-svg {
    cursor: pointer;
  }
  .orb-svg:hover .orb-label,
  .orb-svg.revealed .orb-label {
    opacity: 1;
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
  .skydome {
    position: relative;
    margin: 1.5rem auto 0;
    max-width: 460px;
    text-align: center;
  }
  /* only the dome itself, NOT the gear's svg (which lives inside .skydome too) */
  .skydome > svg {
    width: 100%;
    height: auto;
    overflow: visible;
  }
  /* light marks on the dark sky */
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
    font-size: 6px;
    fill: rgba(180, 200, 240, 0.62);
    letter-spacing: 0.3px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.14s ease;
  }
  /* star names: hover/tap reveal only (kept out of the Labels toggle so the 18
     of them never flood the dome); dark stroke keeps them legible over the sky */
  .dome-star-name {
    font-size: 6px;
    fill: rgba(205, 218, 248, 0.92);
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
  /* small, thin cardinals just inside the rim, on the dark sky */
  .dome-card {
    font-size: 8px;
    font-weight: 400;
    fill: rgba(255, 255, 255, 0.5);
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
    font-size: 5.75px;
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
  /* Labels are hidden by default; reveal one on hover (desktop) or tap (the
     .revealed class, set on click/keyboard), or show all with the Labels toggle. */
  .dome-body:hover .dome-label,
  .dome-con:hover .dome-con-name,
  .dome-con:hover .dome-star-name,
  .dome-body.revealed .dome-label,
  .dome-con.revealed .dome-con-name,
  .dome-con.revealed .dome-star-name {
    opacity: 1;
  }
  .labels-shown .dome-label,
  .labels-shown .dome-con-name {
    opacity: 1;
  }
  .dome-hit {
    fill: transparent;
    pointer-events: all;
    cursor: pointer;
    outline: none;
    -webkit-tap-highlight-color: transparent;
  }
  .skydome figcaption {
    font-size: 12.5px;
    color: var(--ink-soft);
    margin-top: 8px;
    line-height: 1.5;
  }
  /* moon phase — its own centred section, to the right of the model */
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
