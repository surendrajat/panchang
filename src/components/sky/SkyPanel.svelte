<script lang="ts">
  // The interactive ecliptic wheel + live readout + tap-to-learn + upcoming
  // events — the heart of the old Sky page, packaged as one self-contained unit
  // that computes everything from a `date` prop (no time controls of its own).
  // Used as the finale of the #/learn guide, driven by the guide's time model.
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
  import {
    nakshatraNameByIndex,
    tithiNameByIndex,
    yogaNameByIndex,
    rashiNameByIndex,
  } from '$lib/i18n';
  import { rashiLabel, grahaLabel } from '$lib/labels';
  import { applyNumerals } from '$lib/format/numerals';
  import CelestialMark from '../CelestialMark.svelte';
  import EclipticWheel, { type WheelPick } from './EclipticWheel.svelte';

  let { date }: { date: Date } = $props();

  const lang = $derived(preferences.language);
  const num = (s: string | number) => applyNumerals(String(s), preferences.numerals);
  const hi = (h: string, e: string) => (lang === 'hi' ? h : e);
  const tn = (dev: string, tr: string, en: string) =>
    lang === 'hi' ? dev : preferences.transliteration ? tr : en;
  const signName = (i: number) => rashiLabel(i);
  const earthLabel = $derived(tn('पृथ्वी', 'Prithvi', 'Earth'));

  type MonInfo = { mon: { en: string; hi: string }; greg: { en: string; hi: string } };
  const SIGN_MONTH: readonly MonInfo[] = [
    { mon: { en: 'Vaishakha', hi: 'वैशाख' }, greg: { en: 'Apr–May', hi: 'अप्रैल–मई' } },
    { mon: { en: 'Jyeshtha', hi: 'ज्येष्ठ' }, greg: { en: 'May–Jun', hi: 'मई–जून' } },
    { mon: { en: 'Ashadha', hi: 'आषाढ़' }, greg: { en: 'Jun–Jul', hi: 'जून–जुलाई' } },
    { mon: { en: 'Shravana', hi: 'श्रावण' }, greg: { en: 'Jul–Aug', hi: 'जुलाई–अगस्त' } },
    { mon: { en: 'Bhadrapada', hi: 'भाद्रपद' }, greg: { en: 'Aug–Sep', hi: 'अगस्त–सितंबर' } },
    { mon: { en: 'Ashvina', hi: 'आश्विन' }, greg: { en: 'Sep–Oct', hi: 'सितंबर–अक्तूबर' } },
    { mon: { en: 'Kartika', hi: 'कार्तिक' }, greg: { en: 'Oct–Nov', hi: 'अक्तूबर–नवंबर' } },
    { mon: { en: 'Margashirsha', hi: 'मार्गशीर्ष' }, greg: { en: 'Nov–Dec', hi: 'नवंबर–दिसंबर' } },
    { mon: { en: 'Pausha', hi: 'पौष' }, greg: { en: 'Dec–Jan', hi: 'दिसंबर–जनवरी' } },
    { mon: { en: 'Magha', hi: 'माघ' }, greg: { en: 'Jan–Feb', hi: 'जनवरी–फरवरी' } },
    { mon: { en: 'Phalguna', hi: 'फाल्गुन' }, greg: { en: 'Feb–Mar', hi: 'फरवरी–मार्च' } },
    { mon: { en: 'Chaitra', hi: 'चैत्र' }, greg: { en: 'Mar–Apr', hi: 'मार्च–अप्रैल' } },
  ];
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

  // wheel display toggles (behind the gear)
  let wheelGrahas = $state(false);
  let wheelLabels = $state(false);
  let tropical = $state(false);
  let showAngles = $state(false);
  let wheelMenu = $state(false);

  // ── derived astronomy (all from `date`) ─────────────────────────────────────
  const jd = $derived(dateToJulian(date));
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
  const illum = $derived(moonIlluminationAtJD(jd));

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

  // ── upcoming events (recomputed only when the civil day changes) ────────────
  function refineCrossing(estJd: number, fn: (j: number) => number, target: number): number {
    let lo = estJd - 1.6;
    let hi2 = estJd + 1.6;
    for (let i = 0; i < 32; i++) {
      const m = (lo + hi2) / 2;
      const d = ((fn(m) - target + 540) % 360) - 180;
      if (d < 0) lo = m;
      else hi2 = m;
    }
    return (lo + hi2) / 2;
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
  // quantise to the day so the 4 bisections don't run every animation frame
  const eventsBaseMs = $derived(Math.floor(date.getTime() / 86_400_000) * 86_400_000);
  const events = $derived.by(() => {
    const fromJd = dateToJulian(new Date(eventsBaseMs));
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
  const wheelEvents = $derived(
    events.map((ev) => ({ key: ev.key, lon: ev.lon, label: lang === 'hi' ? ev.hi : ev.en })),
  );

  // ── tap-to-learn ────────────────────────────────────────────────────────────
  let selected = $state<WheelPick | null>(null);
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
      return { title: grahaLabel(k), body: loc + PLANET_INFO[k][lang === 'hi' ? 'hi' : 'en'] };
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

{#snippet ctrl(active: boolean, toggle: () => void, label: string)}
  <button type="button" class="chip" class:on={active} aria-pressed={active} onclick={toggle}>
    <span class="chip__dot"></span>{label}
  </button>
{/snippet}

<div class="sky-panel">
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
      <button
        type="button"
        class="view-gear"
        class:on={wheelMenu}
        onclick={() => (wheelMenu = !wheelMenu)}
        aria-expanded={wheelMenu}
        aria-label={hi('चक्र विकल्प', 'Wheel options')}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"
          ><path
            d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.21.08-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
          /></svg
        >
      </button>
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
            `Tropical signs — drifted ~${num(ayan.toFixed(1))}° from the stars (ayanamsa). The panchanga itself uses sidereal.`,
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
      <h4>{learn.title}</h4>
      <p>{learn.body}</p>
    </aside>
  {:else}
    <p class="tap-hint">
      {hi(
        '💡 चक्र में किसी राशि, ग्रह, सूर्य/चन्द्र/पृथ्वी या नक्षत्र-वलय पर टैप करके जानें · ⚙ से ग्रह/सायन चालू करें',
        '💡 Tap any sign, planet, the Sun, Moon, Earth or the nakshatra ring to learn · use ⚙ to add planets or flip the zodiac',
      )}
    </p>
  {/if}

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
</div>

<style>
  .sky__grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1.5rem;
    align-items: center;
    justify-content: center;
  }
  .view-frame {
    position: relative;
    flex: 1 1 340px;
    max-width: 420px;
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
  .readout {
    flex: 0 0 250px;
    max-width: 100%;
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
  .learn {
    position: relative;
    margin: 1rem 0 0;
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-left: 3px solid var(--red);
    border-radius: var(--radius-sm, 8px);
    padding: 0.8rem 2rem 0.8rem 0.9rem;
  }
  .learn h4 {
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
  .tap-hint {
    margin: 1rem 0 0;
    text-align: center;
    color: var(--ink-soft);
    font-size: 0.9rem;
    line-height: 1.5;
  }
  .events {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 0.9rem;
    margin: 1.1rem 0 0;
    padding: 0.65rem 0.85rem;
    background: var(--paper-2);
    border-radius: var(--radius-sm, 8px);
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
  .event-swatch {
    display: inline-block;
    width: 0.5em;
    height: 0.5em;
    border-radius: 50%;
    margin-right: 0.35em;
    vertical-align: 0.02em;
  }
  .event-mark--purnima {
    background: #e0a82e;
  }
  .event-mark--amavasya {
    background: var(--ink-soft);
  }
  .event-mark--ekadashi {
    background: #5a7fa8;
  }
  .event-mark--sankranti {
    background: var(--red);
  }
</style>
