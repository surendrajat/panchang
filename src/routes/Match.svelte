<script lang="ts">
  import { onMount } from 'svelte';
  import LocationPicker from '$components/LocationPicker.svelte';
  import { preferences } from '$lib/state/preferences.svelte';
  import type { Location } from '$lib/panchanga';
  import {
    computeBirthChart,
    birthInstant,
    computeMatch,
    type MatchResult,
    type KootaKey,
  } from '$lib/jyotish';
  import { rashiNameByIndex, nakshatraNameByIndex } from '$lib/i18n';
  import { applyNumerals } from '$lib/format/numerals';
  import { listBirthProfiles, type BirthProfile } from '$lib/storage';
  import { matchDraft } from '$lib/state/jyotish-draft.svelte';

  const lang = $derived(preferences.language);
  const numerals = $derived(preferences.numerals);
  const num = (s: string | number) => applyNumerals(String(s), numerals);

  interface Person {
    name: string;
    date: string;
    time: string;
    place: Location | null;
  }

  // Init from the module draft so the form survives navigating away from this
  // lazy-loaded route and back (see jyotish-draft).
  let groom = $state<Person>(matchDraft.groom);
  let bride = $state<Person>(matchDraft.bride);
  let error = $state<string | null>(null);

  // Saved profiles for quick-pick.
  let profiles = $state<BirthProfile[]>([]);
  onMount(async () => {
    // Default each partner's place to the current location when unset.
    if (!groom.place) groom.place = preferences.location;
    if (!bride.place) bride.place = preferences.location;
    try {
      profiles = await listBirthProfiles();
    } catch {
      profiles = [];
    }
  });
  function applyProfile(role: 'groom' | 'bride', id: string): void {
    const p = profiles.find((x) => String(x.id) === id);
    if (!p) return;
    const person: Person = { name: p.name, date: p.date, time: p.time, place: p.location };
    if (role === 'groom') groom = person;
    else bride = person;
  }

  interface Computed {
    result: MatchResult;
    g: { nak: number; rashi: number };
    b: { nak: number; rashi: number };
  }
  let out = $state<Computed | null>(matchDraft.out);

  // Persist form + result back to the module draft on every change.
  $effect(() => {
    matchDraft.groom = groom;
    matchDraft.bride = bride;
    matchDraft.out = out;
  });

  const canMatch = $derived(!!groom.date && !!groom.place && !!bride.date && !!bride.place);

  // Koota labels (kept local, like the Kundli route — kundli-specific terms).
  const KOOTA: Record<KootaKey, [string, string]> = {
    varna: ['Varna', 'वर्ण'],
    vashya: ['Vashya', 'वश्य'],
    tara: ['Tara', 'तारा'],
    yoni: ['Yoni', 'योनि'],
    grahaMaitri: ['Graha Maitri', 'ग्रह मैत्री'],
    gana: ['Gana', 'गण'],
    bhakoot: ['Bhakoot', 'भकूट'],
    nadi: ['Nadi', 'नाड़ी'],
  };
  const kootaLabel = (k: KootaKey) => (lang === 'hi' ? KOOTA[k][1] : KOOTA[k][0]);

  function moonOf(p: Person) {
    const instant = birthInstant(p.date, p.time, p.place!.timezone);
    const chart = computeBirthChart(instant, p.place!, true, {
      ayanamsa: preferences.ayanamsa,
      nodeType: preferences.nodeType,
    });
    const moon = chart.grahas.find((g) => g.key === 'moon')!;
    return { nakshatra: moon.nakshatra, rashi: moon.rashi, rashiDeg: moon.degInRashi };
  }

  function match(): void {
    error = null;
    if (!groom.date || !groom.place || !bride.date || !bride.place) {
      error = lang === 'hi' ? 'दोनों की जन्म तिथि और स्थान आवश्यक हैं।' : "Both partners' birth date and place are required.";
      return;
    }
    try {
      const g = moonOf(groom);
      const b = moonOf(bride);
      out = {
        result: computeMatch(g, b),
        g: { nak: g.nakshatra, rashi: g.rashi },
        b: { nak: b.nakshatra, rashi: b.rashi },
      };
    } catch (e) {
      error = e instanceof Error ? e.message : 'Could not compute the match.';
    }
  }

  // Interpretation band for the total /36.
  const band = $derived.by(() => {
    if (!out) return null;
    const t = out.result.total;
    if (t >= 32) return { en: 'Excellent', hi: 'उत्तम', tone: 'great' as const };
    if (t >= 25) return { en: 'Very good', hi: 'बहुत अच्छा', tone: 'good' as const };
    if (t >= 18) return { en: 'Acceptable', hi: 'स्वीकार्य', tone: 'ok' as const };
    return { en: 'Not recommended', hi: 'अनुशंसित नहीं', tone: 'low' as const };
  });
</script>

<section class="view stack stack--lg">
  {#snippet personForm(p: Person, role: 'groom' | 'bride')}
    <div class="person card">
      <h3>
        {#if role === 'groom'}
          {lang === 'hi' ? 'वर' : 'Groom'}
        {:else}
          {lang === 'hi' ? 'वधू' : 'Bride'}
        {/if}
        <span class="role-deva">{role === 'groom' ? '♂' : '♀'}</span>
      </h3>
      <div class="fields stack">
        {#if profiles.length > 0}
          <select
            class="select"
            value=""
            onchange={(e) => {
              applyProfile(role, e.currentTarget.value);
              e.currentTarget.value = '';
            }}
          >
            <option value="">{lang === 'hi' ? 'सहेजी कुण्डली चुनें…' : 'Load saved chart…'}</option>
            {#each profiles as pr (pr.id)}
              <option value={String(pr.id)}>{pr.name} · {num(pr.date)}</option>
            {/each}
          </select>
        {/if}
        <input class="input" type="text" bind:value={p.name} placeholder={lang === 'hi' ? 'नाम (वैकल्पिक)' : 'Name (optional)'} />
        <div class="two-up">
          <label class="label">
            <span class="lab">{lang === 'hi' ? 'जन्म तिथि' : 'Date'}</span>
            <input class="input" type="date" bind:value={p.date} min="1800-01-01" max="2100-12-31" />
          </label>
          <label class="label">
            <span class="lab">{lang === 'hi' ? 'समय' : 'Time'}</span>
            <input class="input" type="time" bind:value={p.time} />
          </label>
        </div>
        <LocationPicker location={p.place} onChange={(loc) => (p.place = loc)} />
      </div>
    </div>
  {/snippet}

  <div class="intro">
    <h2 class="title">{lang === 'hi' ? 'कुण्डली मिलान' : 'Kundli Milan'}</h2>
    <p class="muted">
      {lang === 'hi'
        ? 'अष्टकूट गुण मिलान — चन्द्र नक्षत्र और राशि से ३६ में से गुण।'
        : 'Ashtakoota guna milan — 36-point compatibility from the Moon’s nakshatra and rashi.'}
    </p>
  </div>

  <div class="people">
    {@render personForm(groom, 'groom')}
    {@render personForm(bride, 'bride')}
  </div>

  {#if error}<p class="form-error">{error}</p>{/if}

  <div class="actions">
    <button class="btn btn--primary" type="button" onclick={match} disabled={!canMatch}>
      {lang === 'hi' ? 'मिलान करें' : 'Match'}
    </button>
  </div>

  {#if out && band}
    <!-- total -->
    <div class="score-hero stagger">
      <div class="score-ring score-ring--{band.tone}">
        <div class="score-num num">{num(out.result.total)}</div>
        <div class="score-den num">/ {num(36)}</div>
      </div>
      <div class="score-band score-band--{band.tone}">{lang === 'hi' ? band.hi : band.en}</div>
      <div class="pair-line">
        <span>{groom.name || (lang === 'hi' ? 'वर' : 'Groom')}: {nakshatraNameByIndex(out.g.nak, lang)} · {rashiNameByIndex(out.g.rashi, lang)}</span>
        <span class="pair-amp">⚭</span>
        <span>{bride.name || (lang === 'hi' ? 'वधू' : 'Bride')}: {nakshatraNameByIndex(out.b.nak, lang)} · {rashiNameByIndex(out.b.rashi, lang)}</span>
      </div>
    </div>

    <!-- koota breakdown -->
    <div class="kootas">
      {#each out.result.kootas as k (k.key)}
        <div class="koota">
          <div class="koota-name">{kootaLabel(k.key)}</div>
          <div class="koota-bar"><div class="koota-fill" style="width: {(k.got / k.max) * 100}%"></div></div>
          <div class="koota-pts num"><b>{num(k.got)}</b><span class="koota-max">/{num(k.max)}</span></div>
        </div>
      {/each}
    </div>

    <!-- doshas -->
    {#if out.result.nadiDosha || out.result.bhakootDosha}
      <div class="dosha" role="note">
        <b>{lang === 'hi' ? 'दोष' : 'Dosha'}:</b>
        {#if out.result.nadiDosha}<span>{lang === 'hi' ? 'नाड़ी दोष' : 'Nadi dosha'}</span>{/if}
        {#if out.result.nadiDosha && out.result.bhakootDosha}·{/if}
        {#if out.result.bhakootDosha}<span>{lang === 'hi' ? 'भकूट दोष' : 'Bhakoot dosha'}</span>{/if}
      </div>
    {/if}

    <p class="method-note">
      {lang === 'hi'
        ? 'अष्टकूट तालिकाएँ सरावली (शास्त्रीय संदर्भ) से · लाहिरी अयनांश · पूर्वावलोकन। दोष-परिहार (अपवाद) यहाँ सम्मिलित नहीं हैं।'
        : 'Ashtakoota tables from Saravali (classical reference) · Lahiri ayanamsa · preview. Dosha cancellations (exceptions) are not yet applied.'}
    </p>
  {/if}
</section>

<style>
  .intro {
    text-align: center;
  }
  .intro .title {
    font-size: clamp(28px, 7vw, 40px);
  }
  .intro .muted {
    margin-top: 6px;
    font-size: 14px;
  }
  .people {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
  }
  .person {
    padding: 20px;
  }
  .person h3 {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 14px;
    font-size: 20px;
  }
  .role-deva {
    color: var(--red);
    font-size: 18px;
  }
  .fields {
    gap: var(--space-3);
  }
  .two-up {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
  }
  .form-error {
    color: var(--red);
    font-size: 13px;
    text-align: center;
    margin: 0;
  }
  .actions {
    display: flex;
    justify-content: center;
  }
  .actions .btn {
    min-width: 180px;
  }

  /* score hero */
  .score-hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
  }
  .score-ring {
    width: 132px;
    height: 132px;
    border-radius: 50%;
    display: grid;
    place-content: center;
    text-align: center;
    border: 3px solid var(--line);
    background: var(--paper-2);
  }
  .score-ring--great { border-color: var(--ok); }
  .score-ring--good { border-color: var(--gold); }
  .score-ring--ok { border-color: var(--ink-soft); }
  .score-ring--low { border-color: var(--red); }
  .score-num {
    font-family: var(--font-serif);
    font-size: 48px;
    font-weight: 700;
    line-height: 1;
    color: var(--ink);
  }
  .score-den {
    font-size: 14px;
    color: var(--ink-soft);
    margin-top: 2px;
  }
  .score-band {
    font-family: var(--font-serif);
    font-size: 22px;
    font-weight: 600;
  }
  .score-band--great { color: var(--ok); }
  .score-band--good { color: var(--gold); }
  .score-band--ok { color: var(--ink); }
  .score-band--low { color: var(--red); }
  .pair-line {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 8px 14px;
    font-size: 13.5px;
    color: var(--ink-soft);
    text-align: center;
  }
  .pair-amp {
    color: var(--red);
    font-size: 16px;
  }

  /* kootas */
  .kootas {
    display: flex;
    flex-direction: column;
    gap: 2px;
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    overflow: hidden;
  }
  .koota {
    display: grid;
    grid-template-columns: 96px 1fr 56px;
    align-items: center;
    gap: 12px;
    padding: 11px 16px;
    background: var(--paper-2);
    border-top: 1px solid var(--line-2);
  }
  .koota:first-child {
    border-top: none;
  }
  .koota-name {
    font-family: var(--font-serif);
    font-weight: 600;
    font-size: 15px;
    color: var(--ink);
  }
  .koota-bar {
    height: 8px;
    background: var(--paper-3);
    border-radius: 999px;
    overflow: hidden;
  }
  .koota-fill {
    height: 100%;
    background: linear-gradient(to right, color-mix(in srgb, var(--gold) 70%, var(--red)), var(--gold));
    border-radius: 999px;
  }
  .koota-pts {
    text-align: right;
    font-size: 14px;
    color: var(--ink);
  }
  .koota-max {
    color: var(--ink-faint);
    font-size: 12px;
  }

  .dosha {
    border: 1px solid color-mix(in srgb, var(--red) 40%, var(--line));
    background: color-mix(in srgb, var(--red) 7%, var(--paper-2));
    border-radius: var(--radius-md);
    padding: 12px 16px;
    font-size: 14px;
    color: var(--red-deep);
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .method-note {
    font-size: 12px;
    color: var(--ink-soft);
    line-height: 1.6;
    border-top: 1px dashed var(--line);
    padding-top: 14px;
    margin: 0;
  }

  @media (max-width: 560px) {
    .people {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 400px) {
    .two-up {
      grid-template-columns: 1fr;
    }
    .koota {
      grid-template-columns: 84px 1fr 50px;
    }
  }
</style>
