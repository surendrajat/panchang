<script lang="ts">
  // EXPERIMENTAL — "How the Panchanga Works" (#/learn). A guided, interactive
  // tour of how a Hindu calendar is built from just two angles (λ☉, λ☽). Each
  // numbered step pairs a short why, a LIVE formula with the real numbers, and a
  // focused animation; the shared <SkyClock> picks the moment every step reads
  // from `now`. Every value comes from the real astronomy engine.
  //
  // A richer, sequenced companion to routes/Sky.svelte. Heavy visuals are shared
  // components under components/sky/ so both pages draw the identical wheel.

  import { preferences } from '$lib/state/preferences.svelte';
  import {
    dateToJulian,
    sunLongitudeAtJD,
    moonLongitudeAtJD,
    sunMoonElongationAtJD,
    moonIlluminationAtJD,
    ayanamsa,
    norm360,
  } from '$lib/astro';
  import { grahaSiderealLongitude, type GrahaKey } from '$lib/jyotish';
  import {
    tithiNameByIndex,
    nakshatraNameByIndex,
    yogaNameByIndex,
    karanaNameByPosition,
  } from '$lib/i18n';
  import { rashiLabel, grahaLabel } from '$lib/labels';
  import { applyNumerals } from '$lib/format/numerals';
  import { RASHI_LORDS } from '$lib/jyotish/names';
  import { RASHI_ELEMENT, ELEMENT_LABEL } from '$lib/jyotish/rashi-art';
  import { SIGN_MONTH, VARA } from '$lib/sky';
  import EclipticWheel, { type WheelPick } from '../components/sky/EclipticWheel.svelte';
  import OrbitalView from '../components/sky/OrbitalView.svelte';
  import SkyPanel from '../components/sky/SkyPanel.svelte';
  import MoonPhase from '../components/MoonPhase.svelte';
  import CelestialMark from '../components/CelestialMark.svelte';
  import BodyIcon from '../components/BodyIcon.svelte';
  import ConceptIntro from '../components/sky/ConceptIntro.svelte';
  import SkyClock from '../components/sky/SkyClock.svelte';

  // ── display helpers ─────────────────────────────────────────────────────────
  const lang = $derived(preferences.language);
  const num = (s: string | number) => applyNumerals(String(s), preferences.numerals);
  const hi = (h: string, e: string) => (lang === 'hi' ? h : e);
  const tn = (dev: string, tr: string, en: string) =>
    lang === 'hi' ? dev : preferences.transliteration ? tr : en;
  const d1 = (x: number) => num(x.toFixed(1)) + '°';
  const earthLabel = $derived(tn('पृथ्वी', 'Prithvi', 'Earth'));

  // ── Time model ─────────────────────────────────────────────────────────────
  // The shared <SkyClock> owns the rAF time model; we bind to its `date` (the
  // moment every cell reads) plus `speed`/`live` so per-cell "Run" buttons can
  // drive it too. Every cell's astronomy is derived from `now`.
  let now = $state(new Date());
  let speed = $state(0); // simulated seconds per real second
  let live = $state(true);
  let showGrahas = $state(false); // optional planets on the wheels
  let tropical = $state(false); // ayanamsa cell: flip the sign ring

  function toggleSpeed(s: number) {
    if (!live && speed === s) speed = 0;
    else {
      live = false;
      speed = s;
    }
  }

  // ── Derived astronomy (the time-model outputs) ──────────────────────────────────
  const simDate = $derived(now);
  const jd = $derived(dateToJulian(simDate));
  const ayan = $derived(ayanamsa(jd, preferences.ayanamsa));
  const sunTrop = $derived(sunLongitudeAtJD(jd));
  const moonTrop = $derived(moonLongitudeAtJD(jd));
  const sunSid = $derived(norm360(sunTrop - ayan));
  const moonSid = $derived(norm360(moonTrop - ayan));
  const elong = $derived(sunMoonElongationAtJD(jd));
  const illum = $derived(moonIlluminationAtJD(jd));

  const NAK_ARC = 360 / 27; // 13°20′
  const PADA_ARC = NAK_ARC / 4; // 3°20′
  const tithiNum = $derived(Math.floor(elong / 12) + 1); // 1..30
  const waxing = $derived(elong < 180);
  const paksha = $derived(hi(waxing ? 'शुक्ल' : 'कृष्ण', waxing ? 'Shukla' : 'Krishna'));
  const nakNum = $derived(Math.floor(moonSid / NAK_ARC) + 1); // 1..27
  const pada = $derived(Math.floor((moonSid % NAK_ARC) / PADA_ARC) + 1); // 1..4
  const yogaSum = $derived(norm360(sunSid + moonSid));
  const yogaNum = $derived(Math.floor(yogaSum / NAK_ARC) + 1); // 1..27
  const karanaPos = $derived(Math.floor(elong / 6)); // 0..59
  const sunRashi = $derived(Math.floor(sunSid / 30)); // 0..11
  const moonRashi = $derived(Math.floor(moonSid / 30));

  // Live tithi length: a tithi is a fixed 12° of elongation, but the elongation
  // rate varies, so its real duration swings ~20–26 h. Sample the rate on an
  // hour-quantized jd so it doesn't add two engine calls every animation frame —
  // the shown value (0.1 h) doesn't change meaningfully faster than hourly.
  const jdHour = $derived(Math.floor(jd * 24) / 24);
  const tithiHours = $derived.by(() => {
    const e1 = sunMoonElongationAtJD(jdHour);
    const e2 = sunMoonElongationAtJD(jdHour + 0.02);
    const rate = (((e2 - e1 + 540) % 360) - 180) / 0.02; // °/day
    return 12 / rate / (1 / 24);
  });

  const GRAHA_KEYS: readonly GrahaKey[] = ['mars', 'mercury', 'jupiter', 'venus', 'saturn'];
  const grahaPositions = $derived(
    showGrahas
      ? GRAHA_KEYS.map((key) => ({
          key,
          lon: grahaSiderealLongitude(key, jd, preferences.ayanamsa, preferences.nodeType),
        }))
      : [],
  );

  // weekday index 0..6 (for the Vara step + the summary)
  const WEEKDAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const varaIdx = $derived.by(() => {
    const wd = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      timeZone: preferences.location?.timezone,
    }).format(simDate);
    return WEEKDAY_KEYS.indexOf(wd);
  });

  // ── Tap-to-explore (the zodiac cell) ────────────────────────────────────────
  let picked = $state<WheelPick | null>(null);
  const pickedCard = $derived.by(() => {
    const s = picked;
    if (!s) return null;
    if (s.type === 'earth')
      return {
        title: earthLabel,
        body: hi(
          'आप यहाँ हैं — यह भूकेन्द्रित दृष्टि है। चक्र दिखाता है कि पृथ्वी से सूर्य व चन्द्र किस राशि में दिखते हैं।',
          'You are here — this is the geocentric view. The wheel shows which sign the Sun and Moon sit in as seen from Earth.',
        ),
      };
    if (s.type === 'sun')
      return {
        title: grahaLabel('sun'),
        body: hi(
          `अभी ${rashiLabel(sunRashi)} में। सूर्य हर ~30 दिन में एक राशि बदलता है — हर बार संक्रान्ति — और इसी से मास व ऋतु बनते हैं।`,
          `In ${rashiLabel(sunRashi)} now. The Sun changes sign every ~30 days — each a sankranti — and that sets the month and the season.`,
        ),
      };
    if (s.type === 'moon')
      return {
        title: grahaLabel('moon'),
        body: hi(
          `अभी ${rashiLabel(moonRashi)} में। तेज़ पिंड — ~27.3 दिन में पूरा चक्र। सूर्य से इसका अंतर ही तिथि है।`,
          `In ${rashiLabel(moonRashi)} now. The fast one — a full lap in ~27.3 days. Its lead over the Sun is the tithi.`,
        ),
      };
    const i = s.i ?? 0;
    const el = ELEMENT_LABEL[RASHI_ELEMENT[i]];
    const m = SIGN_MONTH[i];
    return {
      title: rashiLabel(i),
      body: hi(
        `तत्व: ${tn(el.hi, el.tr, el.en)} · स्वामी: ${grahaLabel(RASHI_LORDS[i])}। सूर्य इसमें हो (~${m.greg.hi}) तो ${m.mon.hi} मास।`,
        `Element: ${tn(el.hi, el.tr, el.en)} · ruled by ${grahaLabel(RASHI_LORDS[i])}. Sun here (~${m.greg.en}) means the ${m.mon.en} month.`,
      ),
    };
  });
</script>

<!-- a small inline "▷ Run / ⏸ pause" control that plays the shared clock -->
{#snippet run(s: number, labelHi: string, labelEn: string)}
  <button type="button" class="run" class:on={!live && speed === s} onclick={() => toggleSpeed(s)}>
    <span class="run__i" aria-hidden="true">{!live && speed === s ? '⏸' : '▶'}</span>
    {hi(labelHi, labelEn)}
  </button>
{/snippet}

<section class="nb">
  <header class="nb__head">
    <p class="nb__kicker">{hi('सजीव मार्गदर्शिका', 'An interactive guide')}</p>
    <h2>{hi('पंचांग कैसे बनता है', 'How the Panchanga Works')}</h2>
    <p class="nb__lede">
      {hi(
        'आकाश के सिर्फ़ दो कोणों से पूरा हिन्दू पंचांग कैसे बनता है — वास्तविक खगोलीय गणना से, सजीव। नीचे समय बदलें या चलाएँ और हर मान को बदलते देखें।',
        'How an entire Hindu calendar is built from just two angles in the sky — live, from a real astronomical engine. Move or play time below and watch every value follow.',
      )}
    </p>
  </header>

  <!-- Animated primer: grok the sky first (celestial sphere → ecliptic → λ → two hands) -->
  <p class="nb__primer-kicker">{hi('पहले — मूल विचार', 'First — the core ideas')}</p>
  <ConceptIntro />
  <p class="nb__transition">
    {hi('अब इसे गणना में बदलें ↓', 'Now let’s turn this into arithmetic ↓')}
  </p>

  <!-- The moment everything below is computed for — pick it with the shared
       time/speed widget; the two angles (λ☉, λ☽) are the only inputs. -->
  <SkyClock bind:date={now} bind:speed bind:live>
    {#snippet extra()}
      <div class="watch">
        <span class="watch__var watch__var--sun">λ<sub>☉</sub> {d1(sunSid)}</span>
        <span class="watch__var watch__var--moon">λ<sub>☽</sub> {d1(moonSid)}</span>
      </div>
    {/snippet}
  </SkyClock>

  <!-- ════ CELL 1 — Two numbers ════ -->
  <article class="cell">
    <div class="cell__no">[1]</div>
    <div class="cell__body">
      <p class="cell__kicker">{hi('मूल विचार', 'The whole idea')}</p>
      <h3>{hi('सब कुछ दो संख्याओं से', 'Two numbers run everything')}</h3>
      <p class="prose">
        {hi(
          'पंचांग जटिल दिखता है, पर टिका है बस दो मापों पर: राशिचक्र पर सूर्य कहाँ है (λ☉) और चन्द्र कहाँ है (λ☽)। ऊपर कोई भी क्षण चुनिए — ये दो कोण तय हो जाते हैं, और नीचे का हर अंग बस इन्हीं का गणित है।',
          'A panchanga looks elaborate, but it rests on two measurements: how far along the zodiac the Sun is (λ☉), and how far the Moon is (λ☽). Pick any moment above and these two angles are fixed — every limb below is just arithmetic on them.',
        )}
      </p>
      <div class="viz">
        <EclipticWheel
          moonLon={moonSid}
          sunLon={sunSid}
          {ayan}
          size={360}
          show={{ angles: true, sun: true, moon: true }}
          label={hi('दो कोण', 'Two angles')}
        />
      </div>
      <p class="caption">
        {hi(
          'भीतर की दो किरणें = दो कोण, 0° (मेष आरंभ) से नापे गए।',
          'The two inner rays are the two angles, measured from 0° (the start of Mesha).',
        )}
      </p>
    </div>
  </article>

  <!-- ════ CELL 2 — One circle, twelve signs ════ -->
  <article class="cell">
    <div class="cell__no">[2]</div>
    <div class="cell__body">
      <p class="cell__kicker">{hi('रंगमंच', 'The stage')}</p>
      <h3>{hi('एक वृत्त, बारह राशियाँ', 'One circle, twelve signs')}</h3>
      <p class="prose">
        {hi(
          'दोनों ज्योतिर्पिंड एक ही मार्ग पर चलते हैं — क्रान्तिवृत्त, सूर्य का वार्षिक पथ। इस वृत्त को 30° के बारह भागों में बाँटिए और मिलती हैं राशियाँ। किसी पिंड की राशि बस उसके देशांतर को 30° से विभाजित करने पर मिलती है।',
          'Both lights ride one highway — the ecliptic, the Sun’s yearly path. Cut that circle into twelve 30° arcs and you have the rashi, the zodiac signs. A body’s sign is simply its longitude divided by 30°.',
        )}
      </p>
      <div class="code">
        <span class="code__tag">{hi('सूत्र', 'formula')}</span>
        <div class="code__body">
          <div>rashi = ⌊ λ / 30° ⌋</div>
          <div>
            <span class="cm"><CelestialMark body="sun" size={13} /></span> ⌊
            <span class="in">{d1(sunSid)}</span>
            / 30° ⌋ = <span class="out">{rashiLabel(sunRashi)}</span>
          </div>
          <div>
            <span class="cm"><CelestialMark body="moon" size={13} /></span> ⌊
            <span class="in">{d1(moonSid)}</span>
            / 30° ⌋ = <span class="out">{rashiLabel(moonRashi)}</span>
          </div>
        </div>
      </div>
      <div class="viz">
        <EclipticWheel
          moonLon={moonSid}
          sunLon={sunSid}
          {ayan}
          grahas={grahaPositions}
          size={360}
          show={{ earth: true, grahas: showGrahas }}
          selected={picked}
          onpick={(p) => (picked = p)}
          label={hi('राशि चक्र', 'Zodiac wheel')}
        />
      </div>
      {#if pickedCard}
        <aside class="explore">
          <button
            class="explore__x"
            type="button"
            onclick={() => (picked = null)}
            aria-label={hi('बंद करें', 'Close')}>×</button
          >
          <h4>{pickedCard.title}</h4>
          <p>{pickedCard.body}</p>
        </aside>
      {:else}
        <p class="caption">
          {hi(
            '💡 किसी राशि, सूर्य, चन्द्र या पृथ्वी पर टैप करके जानें।',
            '💡 Tap any sign, the Sun, the Moon, or Earth to explore.',
          )}
        </p>
      {/if}
      <div class="actions">
        <button
          type="button"
          class="run"
          class:on={showGrahas}
          onclick={() => (showGrahas = !showGrahas)}
        >
          {showGrahas
            ? hi('ग्रह छिपाएँ', 'Hide planets')
            : hi('पाँच ग्रह दिखाएँ', 'Show the five planets')}
        </button>
      </div>
    </div>
  </article>

  <!-- ════ CELL 3 — The Sun names the month ════ -->
  <article class="cell">
    <div class="cell__no">[3]</div>
    <div class="cell__body">
      <p class="cell__kicker">{hi('धीमी सुई', 'The slow hand')}</p>
      <h3>{hi('सूर्य मास का नाम देता है', 'The Sun names the month')}</h3>
      <p class="prose">
        {hi(
          'सूर्य लगभग 30 दिनों में एक राशि पार करता है; हर संक्रमण एक संक्रान्ति है। जिस राशि में वह बैठा है वही सौर मास का नाम और ऋतु तय करती है — पंचांग की धीमी सुई।',
          'The Sun crosses one sign in about 30 days; each crossing is a sankranti. The sign it sits in names the solar month and sets the season — the calendar’s slow hand.',
        )}
      </p>
      <div class="code">
        <span class="code__tag">{hi('अभी', 'now')}</span>
        <div class="code__body">
          <div>
            <span class="cm"><CelestialMark body="sun" size={13} /></span>
            {hi('में', 'in')}
            <span class="out">{rashiLabel(sunRashi)}</span> → {hi(
              SIGN_MONTH[sunRashi].mon.hi,
              SIGN_MONTH[sunRashi].mon.en,
            )}
            <span class="muted"
              >({hi(SIGN_MONTH[sunRashi].greg.hi, SIGN_MONTH[sunRashi].greg.en)})</span
            >
          </div>
        </div>
      </div>
      <div class="viz">
        <EclipticWheel
          moonLon={moonSid}
          sunLon={sunSid}
          {ayan}
          size={360}
          show={{ moon: false }}
          label={hi('सूर्य की राशि', 'The Sun’s sign')}
        />
      </div>
      <div class="actions">
        {@render run(604800, 'सूर्य को चलते देखें', 'Watch the Sun walk')}
        <span class="actions__hint"
          >{hi('हर ~30 दिन में नई राशि', 'a new sign every ~30 days')}</span
        >
      </div>
    </div>
  </article>

  <!-- ════ CELL 4 — The gap is the tithi ════ -->
  <article class="cell">
    <div class="cell__no">[4]</div>
    <div class="cell__body">
      <p class="cell__kicker">{hi('हृदय', 'The heart')}</p>
      <h3>{hi('दोनों का अंतर ही तिथि है', 'The gap between them is the tithi')}</h3>
      <p class="prose">
        {hi(
          'चन्द्र तेज़ सुई है — सूर्य के ~1° के मुक़ाबले ~13°/दिन। यह सूर्य से जितना आगे है (अंतर), उसे 12° के 30 भागों में बाँटिए — वही तिथि है, चान्द्र दिन और पूरे पंचांग की सबसे महत्वपूर्ण संख्या। अमावस्या 0° पर, पूर्णिमा 180° पर।',
          'The Moon is the fast hand — ~13°/day against the Sun’s ~1°. The angle by which it leads the Sun (the gap), cut into 30 steps of 12°, is the tithi — the lunar day, and the single most important number in the calendar. New moon at 0°, full moon at 180°.',
        )}
      </p>
      <div class="code">
        <span class="code__tag">{hi('सूत्र', 'formula')}</span>
        <div class="code__body">
          <div>
            <span class="muted">{hi('अंतर', 'gap')}</span> = (λ<sub>☽</sub> − λ<sub>☉</sub>) mod
            360° =
            <span class="out">{d1(elong)}</span>
          </div>
          <div>
            tithi = ⌊ <span class="in">{d1(elong)}</span> / 12° ⌋ + 1 =
            <span class="out">{num(tithiNum)}</span>
            → <span class="out">{paksha} {tithiNameByIndex(tithiNum, lang)}</span>
          </div>
        </div>
      </div>
      <div class="viz">
        <EclipticWheel
          moonLon={moonSid}
          sunLon={sunSid}
          {ayan}
          size={360}
          show={{ earth: true, elong: true }}
          label={hi('अंतर चाप', 'The gap arc')}
        />
      </div>
      <p class="caption">
        {hi(
          'लाल चाप = अंतर (चन्द्र सूर्य से कितना आगे)। यही ÷ 12° = तिथि। चन्द्र की कला अगले अध्याय में।',
          'The red arc is the gap — how far the Moon leads the Sun. That ÷ 12° is the tithi. The phase you’d see is the next chapter.',
        )}
      </p>
      <div class="actions">
        {@render run(86400, 'एक मास देखें', 'Watch a month')}
        <span class="actions__hint"
          >{hi(
            'हर 12° पर नई तिथि · 180° पर पूर्णिमा',
            'every 12° a new tithi · 180° full moon',
          )}</span
        >
      </div>
      <aside class="aha">
        <strong>{hi('एक तिथि 24 घंटे की नहीं होती।', 'A tithi isn’t 24 hours.')}</strong>
        {hi(
          `दोनों पिंड घटते-बढ़ते वेग से चलते हैं, सो अंतर 11–14°/दिन बढ़ता है और 12° की तिथि ~20 से ~26 घंटे तक चलती है (अभी ≈ ${num(tithiHours.toFixed(1))} घं)। छोटी तिथि किसी सूर्योदय को छोड़ सकती है (क्षय, लुप्त); लंबी दो सूर्योदय पकड़ सकती है (वृद्धि, द्विगुणित)। यही त्योहारों के नियमों का कारण है।`,
          `Both bodies speed up and slow down, so the gap grows at 11–14°/day and a 12° tithi runs from ~20 to ~26 hours (right now ≈ ${num(tithiHours.toFixed(1))} h). A short one can skip a sunrise entirely (kshaya, dropped); a long one can catch two (vriddhi, repeated). That one fact is why festival dates need rules.`,
        )}
      </aside>
    </div>
  </article>

  <!-- ════ CELL 5 — The phase you see (paksha) ════ -->
  <article class="cell">
    <div class="cell__no">[5]</div>
    <div class="cell__body">
      <p class="cell__kicker">{hi('जो आप देखते हैं', 'What you see')}</p>
      <h3>{hi('वही अंतर — चन्द्र की कला', 'That same gap is the phase you see')}</h3>
      <p class="prose">
        {hi(
          'यह अंतर अमूर्त नहीं — यही आप आकाश में देखते हैं। चन्द्र का सूर्य-मुखी आधा भाग सदा प्रकाशित रहता है; पृथ्वी से हम उसे ठीक इसी अंतर के कोण पर देखते हैं। 0→180° बढ़ता है (शुक्ल पक्ष); 180→360° घटता है (कृष्ण पक्ष)।',
          'The gap isn’t abstract — it’s what you see in the sky. The Moon’s sunward half is always lit; from Earth we catch it at exactly the angle of the gap. From 0→180° it waxes (shukla paksha, the bright fortnight); 180→360° it wanes (krishna paksha, the dark).',
        )}
      </p>
      <div class="viz-pair">
        <div class="viz-pair__wheel"><OrbitalView {elong} {earthLabel} /></div>
        <figure class="viz-pair__moon">
          <MoonPhase illumination={illum} phaseAngle={elong} phaseName={paksha} size={120} />
          <figcaption>{hi('चन्द्र हमें कैसा दिखता है', 'How the Moon looks to us')}</figcaption>
        </figure>
      </div>
      <div class="phasebar" aria-hidden="true">
        <div class="phasebar__track">
          <span class="phasebar__fill" style="left:0;width:{Math.min(100, (elong / 360) * 100)}%"
          ></span>
          <span class="phasebar__mark" style="left:50%">{hi('पूर्णिमा', 'full')}</span>
          <span class="phasebar__dot" style="left:{(elong / 360) * 100}%"></span>
        </div>
        <div class="phasebar__ends">
          <span>{hi('अमावस्या 0°', 'new 0°')}</span><span>{hi('शुक्ल', 'shukla')}</span><span
            >{hi('कृष्ण', 'krishna')}</span
          ><span>360°</span>
        </div>
      </div>
      <div class="actions">{@render run(86400, 'एक मास देखें', 'Watch a month')}</div>
    </div>
  </article>

  <!-- ════ CELL 6 — The Moon among the stars (nakshatra) ════ -->
  <article class="cell">
    <div class="cell__no">[6]</div>
    <div class="cell__body">
      <p class="cell__kicker">{hi('सूक्ष्म मापक', 'The fine ruler')}</p>
      <h3>{hi('तारों के बीच चन्द्र — नक्षत्र', 'The Moon among the stars — nakshatra')}</h3>
      <p class="prose">
        {hi(
          'चन्द्र पूरा वृत्त ~27.3 दिनों में पार करता है, सो इसे 27 में बाँटिए और चन्द्र हर रात एक भाग चलता है — नक्षत्र, उसके रात्रि-विश्राम, हर एक वास्तविक तारासमूह। हर नक्षत्र को चार पाद में बाँटिए तो 108 — माला के मनके।',
          'The Moon crosses the whole circle in ~27.3 days, so divide it into 27 and the Moon moves one division a night — the nakshatra, its nightly lodgings, each a real star-group. Quarter each into four pada and you get 108 — the beads on a mala.',
        )}
      </p>
      <div class="code">
        <span class="code__tag">{hi('सूत्र', 'formula')}</span>
        <div class="code__body">
          <div>nakshatra = ⌊ λ<sub>☽</sub> / 13°20′ ⌋ + 1</div>
          <div>
            = ⌊ <span class="in">{d1(moonSid)}</span> / 13.33° ⌋ + 1 =
            <span class="out">{num(nakNum)}</span>
            → <span class="out">{nakshatraNameByIndex(nakNum, lang)}</span>
            <span class="muted">· {hi('पाद', 'pada')} {num(pada)}</span>
          </div>
        </div>
      </div>
      <div class="viz">
        <EclipticWheel
          moonLon={moonSid}
          sunLon={sunSid}
          {ayan}
          size={360}
          show={{ nakRing: true, nakBand: true, sun: false }}
          label={hi('नक्षत्र वलय', 'Nakshatra ring')}
        />
      </div>
      <p class="caption">
        {hi(
          'भीतरी वलय की 27 लकीरें = 27 नक्षत्र; चन्द्र अभी जिस में है वह उभरा हुआ है।',
          'The 27 ticks on the inner ring are the 27 nakshatras; the Moon’s current one is highlighted.',
        )}
      </p>
      <div class="actions">
        {@render run(86400, 'एक मास देखें', 'Watch a month')}
        <span class="actions__hint"
          >{hi('लगभग हर रात एक नक्षत्र', 'about one nakshatra a night')}</span
        >
      </div>
    </div>
  </article>

  <!-- ════ CELL 7 — Two zodiacs (ayanamsa) ════ -->
  <article class="cell">
    <div class="cell__no">[7]</div>
    <div class="cell__body">
      <p class="cell__kicker">{hi('तारे बनाम ऋतुएँ', 'Stars vs seasons')}</p>
      <h3>{hi('दो राशिचक्र, धीरे-धीरे अलग होते', 'Two zodiacs, drifting apart')}</h3>
      <p class="prose">
        {hi(
          'नक्षत्र के लिए देशांतर तारों से नापना होता है (निरयन)। पर विषुव — सायन शून्य-बिंदु — हर साल ~50″ खिसकता है (अयन-चलन), सो तारा-राशिचक्र और ऋतु-राशिचक्र ~24° दूर हो चुके हैं। यही अंतर अयनांश है; निरयन के लिए इसे घटाइए।',
          'Nakshatra needs longitude measured from the stars (nirayana). But the equinox — the tropical zero — slips ~50″ a year (precession), so the star-zodiac and the season-zodiac have drifted ~24° apart. That gap is the ayanamsa; subtract it to go sidereal.',
        )}
      </p>
      <div class="code">
        <span class="code__tag">{hi('सूत्र', 'formula')}</span>
        <div class="code__body">
          <div>
            {hi('अयनांश', 'ayanamsa')} = <span class="out">{d1(ayan)}</span>
            <span class="muted">({hi('आज', 'today')})</span>
          </div>
          <div>
            λ<sub>{hi('निरयन', 'sid')}</sub> = λ<sub>{hi('सायन', 'trop')}</sub> − {d1(ayan)}
          </div>
          <div>
            <span class="cm"><CelestialMark body="moon" size={13} /></span>
            <span class="in">{d1(moonTrop)}</span> − {d1(ayan)} =
            <span class="out">{d1(moonSid)}</span>
          </div>
        </div>
      </div>
      <div class="viz">
        <EclipticWheel
          moonLon={moonSid}
          sunLon={sunSid}
          {ayan}
          {tropical}
          size={360}
          show={{ nakRing: true }}
          label={hi('राशि चक्र', 'Zodiac')}
        />
      </div>
      <div class="actions">
        <button
          type="button"
          class="run"
          class:on={tropical}
          onclick={() => (tropical = !tropical)}
        >
          {tropical
            ? hi('निरयन (तारे)', 'Sidereal (stars)')
            : hi('सायन (ऋतु)', 'Tropical (seasons)')}
        </button>
        <span class="actions__hint"
          >{hi('वलय अयनांश जितना घूमता है', 'the ring turns by the ayanamsa')}</span
        >
      </div>
      <aside class="aha">
        <strong>{hi('सुंदर बात:', 'A lovely twist:')}</strong>
        {hi(
          'तिथि को अयनांश से फ़र्क़ नहीं पड़ता — वह एक अंतर है, और घटाने में अयनांश दोनों से कट जाता है। पर नक्षत्र व राशि निरपेक्ष स्थिति हैं, सो उन्हें यह चाहिए ही।',
          'The tithi doesn’t care about the ayanamsa — it’s a difference, so the offset cancels from both terms. But nakshatra and rashi are absolute positions, so they genuinely need it.',
        )}
      </aside>
    </div>
  </article>

  <!-- ════ CELL 8 — Sum, half, and the weekday ════ -->
  <article class="cell">
    <div class="cell__no">[8]</div>
    <div class="cell__body">
      <p class="cell__kicker">{hi('शेष तीन अंग', 'The rest of the five')}</p>
      <h3>{hi('जोड़, आधा, और वार', 'Sum, half, and the weekday')}</h3>
      <p class="prose">
        {hi(
          'पंचांग = “पाँच अंग”। तिथि और चन्द्र-स्थिति के बाद शेष तीन उसी मशीन के रूप हैं।',
          'Panchanga means “five limbs.” After the tithi and the Moon’s place, the remaining three are variations on the same machine.',
        )}
      </p>
      <div class="mini">
        <div class="mini__row">
          <span class="mini__name">{hi('योग', 'Yoga')}</span>
          <span class="mini__f"
            >⌊ (λ<sub>☽</sub> + λ<sub>☉</sub>) / 13°20′ ⌋ + 1 =
            <span class="out">{yogaNameByIndex(yogaNum, lang)}</span></span
          >
        </div>
        <p class="mini__note">
          {hi('घटाने के बजाय जोड़ें, 27 में बाँटें।', 'Add instead of subtract, slice into 27.')}
        </p>
        <div class="mini__row">
          <span class="mini__name">{hi('करण', 'Karana')}</span>
          <span class="mini__f"
            >⌊ {hi('अंतर', 'gap')} / 6° ⌋ →
            <span class="out">{karanaNameByPosition(karanaPos, lang)}</span></span
          >
        </div>
        <p class="mini__note">
          {hi(
            'तिथि का आधा — मास में 60, ग्यारह नामों में। एक, भद्रा, कुछ कर्मों को रोकता है।',
            'Half a tithi — 60 a month over 11 names. One, Bhadra, blocks certain rites.',
          )}
        </p>
        <div class="mini__row">
          <span class="mini__name">{hi('वार', 'Vara')}</span>
          <span class="mini__f"
            >{hi('सूर्योदय का दिन', 'the sunrise day')} →
            <span class="out"
              >{varaIdx >= 0
                ? tn(VARA[varaIdx].dev, VARA[varaIdx].tr, VARA[varaIdx].en)
                : '—'}</span
            ></span
          >
        </div>
        <p class="mini__note">
          {hi(
            'एकमात्र अंग जो कोण नहीं — हर दिन एक ग्रह का स्वामित्व।',
            'The one limb that isn’t an angle — each day ruled by one graha.',
          )}
        </p>
        <div class="vara-strip">
          {#each VARA as v, i (v.en)}
            <div class="vara" class:on={i === varaIdx}>
              <!-- viewBox roomy enough for Saturn's ring (≈2× the globe radius) -->
              <svg viewBox="0 0 28 28" class="vara__icon" aria-hidden="true">
                <BodyIcon kind={v.lord} cx={14} cy={14} r={6.5} />
              </svg>
              <span class="vara__name">{tn(v.dev, v.tr, v.en)}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </article>

  <!-- ════ CELL 9 — Everything together: the live interactive sky ════ -->
  <article class="cell">
    <div class="cell__no">[9]</div>
    <div class="cell__body">
      <p class="cell__kicker">{hi('सब एक साथ', 'Putting it all together')}</p>
      <h3>{hi('इस क्षण का पूरा आकाश', 'The whole sky, this moment')}</h3>
      <p class="prose">
        {hi(
          'और यह रहा सब एक साथ — सजीव, अंतःक्रियात्मक चक्र और पठन। किसी पिंड पर टैप करें, ⚙ से ग्रह जोड़ें या राशिचक्र बदलें, और ऊपर समय चलाकर हर मान को बदलते देखें। यही पूरे पंचांग की जड़ है।',
          'And here it all is at once — the live, interactive wheel and readout. Tap a body, add planets or flip the zodiac with ⚙, and play time above to watch every value move. This is the root the whole panchanga grows from.',
        )}
      </p>
      <SkyPanel date={simDate} />
      <p class="caption">
        {hi(
          '⚙ से ग्रह जोड़ें या राशिचक्र बदलें · किसी पिंड पर टैप करके जानें · ऊपर समय चलाकर सब बदलते देखें।',
          'Use ⚙ to add planets or flip the zodiac · tap a body to learn · play time above to watch it all move.',
        )}
      </p>
    </div>
  </article>

  <!-- ════ CELL 10 — At a glance: the simplified panchanga ════ -->
  <article class="cell cell--sum">
    <div class="cell__no">[10]</div>
    <div class="cell__body">
      <p class="cell__kicker">{hi('एक नज़र में', 'At a glance')}</p>
      <h3>{hi('इस क्षण का पंचांग', 'This moment’s panchanga')}</h3>
      <p class="prose">
        {hi(
          'और यही सब एक पंक्ति में — ठीक वैसा जैसा छपा पंचांग छापता है, सब इसी क्षण के λ☉ और λ☽ से निकला।',
          'And the same thing in one line — exactly what a printed panchanga prints, all of it from λ☉ and λ☽ at this moment.',
        )}
      </p>
      <dl class="summary">
        <div>
          <dt>{hi('तिथि', 'Tithi')}</dt>
          <dd>{paksha} {tithiNameByIndex(tithiNum, lang)}</dd>
        </div>
        <div>
          <dt>{hi('वार', 'Vara')}</dt>
          <dd>{varaIdx >= 0 ? tn(VARA[varaIdx].dev, VARA[varaIdx].tr, VARA[varaIdx].en) : '—'}</dd>
        </div>
        <div>
          <dt>{hi('नक्षत्र', 'Nakshatra')}</dt>
          <dd>{nakshatraNameByIndex(nakNum, lang)}</dd>
        </div>
        <div>
          <dt>{hi('योग', 'Yoga')}</dt>
          <dd>{yogaNameByIndex(yogaNum, lang)}</dd>
        </div>
        <div>
          <dt>{hi('करण', 'Karana')}</dt>
          <dd>{karanaNameByPosition(karanaPos, lang)}</dd>
        </div>
        <div>
          <dt>{hi('मास', 'Masa')}</dt>
          <dd>{hi(SIGN_MONTH[sunRashi].mon.hi, SIGN_MONTH[sunRashi].mon.en)}</dd>
        </div>
      </dl>
      <p class="seedoc">
        {hi('इसके पीछे का पूरा गणित:', 'The full math behind this:')}
        <a
          href="https://github.com/surendrajat/panchang/tree/main/docs/guide"
          target="_blank"
          rel="noopener">{hi('मार्गदर्शिका →', 'the guide →')}</a
        >
        ·
        <a href="#/">{hi('आज का दिन देखें →', 'see today →')}</a>
      </p>
    </div>
  </article>
</section>

<style>
  .nb {
    max-width: 760px;
    margin: 0 auto;
    padding-bottom: 2rem;
  }
  .nb__head {
    text-align: center;
    margin-bottom: 1.1rem;
  }
  .nb__kicker {
    margin: 0;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--gold);
    font-weight: 700;
  }
  .nb__head h2 {
    margin: 0.25rem 0 0;
    font-family: var(--font-serif);
    font-size: clamp(1.6rem, 5vw, 2.2rem);
  }
  .nb__lede {
    margin: 0.5rem auto 0;
    max-width: 54ch;
    color: var(--ink-soft);
    line-height: 1.55;
    font-size: 0.95rem;
  }
  .nb__primer-kicker {
    margin: 1.8rem 0 0.5rem;
    text-align: center;
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 700;
    color: var(--ink-faint);
  }
  .nb__transition {
    margin: 1rem 0 1.5rem;
    text-align: center;
    font-size: 0.86rem;
    font-style: italic;
    color: var(--ink-soft);
  }

  /* ── time model (sticky) ── */
  /* the two watched angles (λ☉, λ☽), sat beside the clock in the time widget;
     fixed min-width + tabular figures so the values never wobble while playing */
  .watch {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.35rem;
    font-variant-numeric: tabular-nums;
  }
  .watch__var {
    display: inline-block;
    min-width: 4.6rem;
    font-size: 0.8rem;
    font-weight: 600;
    padding: 0.08rem 0.45rem;
    border-radius: var(--radius-pill);
    background: var(--paper-2);
    text-align: center;
    white-space: nowrap;
  }
  .watch__var sub {
    font-size: 0.7em;
  }
  .watch__var--sun {
    color: #b06a08;
  }
  .watch__var--moon {
    color: #3f6da0;
  }
  /* on phones, shrink the chips a touch so they sit beside the clock on one row */
  @media (max-width: 460px) {
    .watch {
      gap: 0.22rem;
    }
    .watch__var {
      min-width: 3.8rem;
      font-size: 0.74rem;
      padding: 0.08rem 0.4rem;
    }
  }

  /* ── cells ── */
  .cell {
    display: grid;
    grid-template-columns: 2.4rem 1fr;
    gap: 0.4rem;
    padding: 1.2rem 0;
    border-top: 1px solid var(--line-2);
    /* so a cell scrolled to (anchors, run buttons) clears the sticky time model */
    scroll-margin-top: 7rem;
  }
  .cell__no {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--gold);
    padding-top: 0.2rem;
  }
  /* the grid item must be allowed to shrink, else a wide formula forces the
     whole page to overflow horizontally on narrow phones */
  .cell__body {
    min-width: 0;
  }
  /* phones: drop the left number gutter (it wastes ~10% width); the cell number
     sits on its own compact line, step-number style, and content goes full-width */
  @media (max-width: 560px) {
    .cell {
      grid-template-columns: 1fr;
      gap: 0;
      padding: 1rem 0;
    }
    .cell__no {
      padding-top: 0;
      margin-bottom: 0.1rem;
    }
  }
  .cell__kicker {
    margin: 0;
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--ink-faint);
    font-weight: 700;
  }
  .cell h3 {
    margin: 0.15rem 0 0.5rem;
    font-family: var(--font-serif);
    font-size: 1.25rem;
    line-height: 1.2;
  }
  .prose {
    margin: 0;
    color: var(--ink-soft);
    line-height: 1.6;
    font-size: 0.94rem;
  }

  /* live formula "code cell" */
  .code {
    position: relative;
    margin: 0.8rem 0;
    padding: 0.7rem 0.8rem 0.6rem;
    background: var(--paper-3);
    border: 1px solid var(--line);
    border-left: 3px solid var(--gold);
    border-radius: var(--radius-sm);
  }
  .code__tag {
    position: absolute;
    top: -0.62rem;
    left: 0.6rem;
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 700;
    color: var(--ink-faint);
    background: var(--paper);
    padding: 0 0.35rem;
    border-radius: 3px;
  }
  .code__body {
    font-family: var(--font-mono);
    font-size: 0.86rem;
    line-height: 1.85;
    color: var(--ink);
    white-space: nowrap;
    overflow-x: auto;
  }
  .code__body .cm {
    display: inline-flex;
    vertical-align: -0.15em;
  }
  .code__body .cm :global(.cmark) {
    color: var(--ink-soft);
  }
  .in {
    color: var(--indigo);
    font-weight: 700;
  }
  .out {
    color: var(--red);
    font-weight: 700;
  }
  .muted {
    color: var(--ink-faint);
  }

  /* every wheel renders at one consistent size */
  .viz {
    margin: 0.9rem auto 0.3rem;
    max-width: 360px;
  }
  .caption {
    margin: 0.4rem 0 0;
    text-align: center;
    font-size: 0.82rem;
    color: var(--ink-faint);
    line-height: 1.45;
  }

  .viz-pair {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.8rem 1.4rem;
    margin: 0.9rem 0 0.3rem;
  }
  .viz-pair__wheel {
    flex: 1 1 300px;
    max-width: 360px;
  }
  .viz-pair__moon {
    flex: 0 1 180px;
    margin: 0;
    text-align: center;
  }
  .viz-pair__moon figcaption {
    margin-top: 0.5rem;
    font-size: 0.82rem;
    color: var(--ink-soft);
    line-height: 1.45;
    /* reserve two lines so the caption never reflows the layout as values change */
    min-height: 2.9em;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 0.7rem;
    margin-top: 0.7rem;
  }
  .actions__hint {
    font-size: 0.78rem;
    color: var(--ink-faint);
    font-style: italic;
  }
  .run {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.34rem 0.8rem;
    border: 1px solid var(--gold);
    border-radius: var(--radius-pill);
    background: color-mix(in srgb, var(--gold) 12%, var(--paper));
    color: var(--ink);
    font: inherit;
    font-size: 0.84rem;
    font-weight: 600;
    cursor: pointer;
    transition:
      background 0.15s,
      transform 0.1s;
  }
  .run:hover {
    background: color-mix(in srgb, var(--gold) 22%, var(--paper));
  }
  .run:active {
    transform: scale(0.97);
  }
  .run.on {
    background: var(--red);
    border-color: var(--red);
    color: var(--paper);
  }
  .run__i {
    font-size: 0.7em;
  }

  /* explore card (zodiac cell) */
  .explore {
    position: relative;
    margin: 0.6rem 0 0;
    padding: 0.7rem 1.9rem 0.7rem 0.85rem;
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-left: 3px solid var(--red);
    border-radius: var(--radius-sm);
  }
  .explore h4 {
    margin: 0 0 0.25rem;
    font-size: 1rem;
  }
  .explore p {
    margin: 0;
    color: var(--ink-soft);
    font-size: 0.9rem;
    line-height: 1.5;
  }
  .explore__x {
    position: absolute;
    top: 0.3rem;
    right: 0.45rem;
    border: none;
    background: none;
    color: var(--ink-soft);
    font-size: 1.3rem;
    line-height: 1;
    cursor: pointer;
  }
  /* "aha" callout */
  .aha {
    margin: 0.9rem 0 0;
    padding: 0.7rem 0.85rem;
    background: color-mix(in srgb, var(--red) 7%, var(--paper));
    border: 1px solid color-mix(in srgb, var(--red) 28%, transparent);
    border-radius: var(--radius-sm);
    font-size: 0.88rem;
    line-height: 1.55;
    color: var(--ink-soft);
  }
  .aha strong {
    color: var(--red);
  }

  /* phase progress bar (cell 5) */
  .phasebar {
    margin: 0.9rem 0 0.3rem;
  }
  .phasebar__track {
    position: relative;
    height: 8px;
    background: linear-gradient(to right, var(--krishna), var(--shukla) 50%, var(--krishna));
    border: 1px solid var(--line);
    border-radius: var(--radius-pill);
  }
  .phasebar__mark {
    position: absolute;
    top: -1.1rem;
    transform: translateX(-50%);
    font-size: 0.65rem;
    color: var(--ink-faint);
  }
  .phasebar__dot {
    position: absolute;
    top: 50%;
    width: 12px;
    height: 12px;
    transform: translate(-50%, -50%);
    background: var(--red);
    border: 2px solid var(--paper);
    border-radius: 50%;
  }
  .phasebar__ends {
    display: flex;
    justify-content: space-between;
    margin-top: 0.3rem;
    font-size: 0.68rem;
    color: var(--ink-faint);
  }

  /* mini formulas (cell 8) */
  .mini {
    margin-top: 0.8rem;
  }
  .mini__row {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.3rem 0.7rem;
    padding-top: 0.6rem;
  }
  .mini__name {
    font-family: var(--font-serif);
    font-weight: 700;
    font-size: 1rem;
    min-width: 4.5rem;
  }
  .mini__f {
    font-family: var(--font-mono);
    font-size: 0.82rem;
    color: var(--ink-soft);
  }
  .mini__note {
    margin: 0.15rem 0 0.3rem;
    font-size: 0.82rem;
    color: var(--ink-faint);
    line-height: 1.45;
  }
  .vara-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-top: 0.8rem;
  }
  .vara {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    flex: 1 1 auto;
    padding: 0.4rem 0.3rem;
    border: 1px solid var(--line-2);
    border-radius: var(--radius-sm);
    opacity: 0.55;
    transition:
      opacity 0.15s,
      border-color 0.15s;
  }
  .vara.on {
    opacity: 1;
    border-color: var(--gold);
    background: color-mix(in srgb, var(--gold) 10%, transparent);
  }
  .vara__icon {
    width: 22px;
    height: 22px;
  }
  .vara__name {
    font-size: 0.62rem;
    text-align: center;
    color: var(--ink-soft);
    line-height: 1.1;
  }

  /* the simplified "at a glance" summary (cell 10) */
  .cell--sum .cell__body {
    background: var(--paper-2);
    border-radius: var(--radius-md);
    padding: 0.9rem 1rem;
  }
  .summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 0.5rem 0.9rem;
    margin: 0.8rem 0 0;
  }
  .summary div {
    border-bottom: 1px solid var(--line);
    padding-bottom: 0.35rem;
  }
  .summary dt {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--ink-faint);
  }
  .summary dd {
    margin: 0.1rem 0 0;
    font-size: 1.02rem;
    font-weight: 600;
    color: var(--ink);
  }
  .seedoc {
    margin: 0.9rem 0 0;
    font-size: 0.86rem;
    color: var(--ink-soft);
  }
  .seedoc a {
    color: var(--red);
    white-space: nowrap;
  }
</style>
