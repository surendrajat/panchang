<script lang="ts">
  // The simplest picture: an eclipse is a shadow falling in a straight line.
  // Solar — the Moon slips between us and the Sun and drops its shadow on Earth.
  // Lunar — Earth blocks the sunlight and its shadow falls across the full Moon.
  // A teaching diagram (not to scale; the Sun is effectively at infinity, so its
  // light arrives parallel), with a Solar/Lunar toggle.
  let { lang = 'en' }: { lang?: 'en' | 'hi' } = $props();
  const hi = (h: string, e: string) => (lang === 'hi' ? h : e);

  let mode = $state<'solar' | 'lunar'>('solar');

  const W = 400;
  const H = 188;
  const cy = 86;
  const SUN = { x: 46, r: 28 };
</script>

<div class="lineup">
  <div class="toggle" role="group" aria-label={hi('ग्रहण का प्रकार', 'Eclipse type')}>
    <button type="button" class:on={mode === 'solar'} onclick={() => (mode = 'solar')}>
      {hi('☀ सूर्य ग्रहण', '☀ Solar')}
    </button>
    <button type="button" class:on={mode === 'lunar'} onclick={() => (mode = 'lunar')}>
      {hi('🌑 चन्द्र ग्रहण', '🌑 Lunar')}
    </button>
  </div>

  <svg
    viewBox="0 0 {W} {H}"
    role="img"
    aria-label={hi('सूर्य–चन्द्र–पृथ्वी रेखा', 'Sun–Moon–Earth line-up')}
  >
    <defs>
      <radialGradient id="lu-sun" cx="40%" cy="38%" r="70%">
        <stop offset="0%" stop-color="#fff8d8" />
        <stop offset="55%" stop-color="#ffce3a" />
        <stop offset="100%" stop-color="#f08a00" />
      </radialGradient>
      <radialGradient id="lu-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffcf4d" stop-opacity="0.35" />
        <stop offset="100%" stop-color="#ffcf4d" stop-opacity="0" />
      </radialGradient>
    </defs>

    <!-- the Sun + parallel sunlight -->
    <circle cx={SUN.x} {cy} r={SUN.r + 8} fill="url(#lu-glow)" />
    {#each [-26, -13, 0, 13, 26] as dy (dy)}
      <line x1={SUN.x + SUN.r} y1={cy + dy} x2={W - 24} y2={cy + dy} class="ray" />
    {/each}
    <circle cx={SUN.x} {cy} r={SUN.r} fill="url(#lu-sun)" />
    <text x={SUN.x} y={cy + SUN.r + 16} class="lab" text-anchor="middle">{hi('सूर्य', 'Sun')}</text>

    {#if mode === 'solar'}
      <!-- Moon between Sun and Earth; its umbra tapers to a spot on Earth -->
      {@const moon = { x: 250, r: 9 }}
      {@const earth = { x: 344, r: 19 }}
      {@const tip = earth.x - earth.r}
      <path d="M {moon.x} {cy - moon.r} L {tip} {cy} L {moon.x} {cy + moon.r} Z" class="umbra" />
      <circle cx={earth.x} {cy} r={earth.r} class="earth" />
      <circle cx={moon.x} {cy} r={moon.r} class="moon-dark" />
      <circle cx={tip} {cy} r="3" class="spot" />
      <text x={moon.x} y={cy - moon.r - 6} class="lab" text-anchor="middle"
        >{hi('चन्द्र', 'Moon')}</text
      >
      <text x={earth.x} y={cy + earth.r + 16} class="lab" text-anchor="middle"
        >{hi('पृथ्वी', 'Earth')}</text
      >
      <text x={(moon.x + tip) / 2} y={cy + 30} class="lab lab--dim" text-anchor="middle"
        >{hi('चन्द्र की छाया', 'Moon’s shadow')}</text
      >
    {:else}
      <!-- Earth between Sun and Moon; Earth's shadow falls on the full Moon -->
      {@const earth = { x: 216, r: 19 }}
      {@const moon = { x: 332, r: 9 }}
      {@const tip = moon.x + 34}
      <path
        d="M {earth.x} {cy - earth.r} L {tip} {cy} L {earth.x} {cy + earth.r} Z"
        class="umbra"
      />
      <circle cx={earth.x} {cy} r={earth.r} class="earth" />
      <circle cx={moon.x} {cy} r={moon.r} class="moon-red" />
      <text x={earth.x} y={cy + earth.r + 16} class="lab" text-anchor="middle"
        >{hi('पृथ्वी', 'Earth')}</text
      >
      <text x={moon.x} y={cy - moon.r - 6} class="lab" text-anchor="middle"
        >{hi('चन्द्र', 'Moon')}</text
      >
      <text x={earth.x + 52} y={cy - 24} class="lab lab--dim" text-anchor="middle"
        >{hi('पृथ्वी की छाया', 'Earth’s shadow')}</text
      >
    {/if}
  </svg>

  <p class="cap">
    {#if mode === 'solar'}
      {hi(
        'अमावस्या को चन्द्रमा सूर्य के सामने आ जाता है और पृथ्वी पर एक पतली छाया-पट्टी डालता है — केवल उसी पट्टी में लोग ग्रहण देखते हैं।',
        'At new moon the Moon slips in front of the Sun and drops a narrow shadow on Earth — only people inside that path see the Sun go dark.',
      )}
    {:else}
      {hi(
        'पूर्णिमा को पृथ्वी सूर्य के प्रकाश को रोक लेती है; उसकी छाया पूरे चन्द्रमा पर पड़ती है, जो मंद होकर ताम्र-लाल हो जाता है — रात्रि-पक्ष के सब लोग देखते हैं।',
        'At full moon Earth blocks the sunlight; its shadow falls across the whole Moon, which dims and turns copper-red — everyone on the night side sees it.',
      )}
    {/if}
  </p>
</div>

<style>
  .lineup {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .toggle {
    display: flex;
    gap: 3px;
    width: fit-content;
    padding: 3px;
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: var(--radius-pill, 999px);
  }
  .toggle button {
    padding: 0.3rem 0.8rem;
    border: none;
    border-radius: var(--radius-pill, 999px);
    background: none;
    color: var(--ink-soft);
    font: inherit;
    font-size: 0.82rem;
    cursor: pointer;
  }
  .toggle button.on {
    background: var(--red);
    color: var(--paper);
    font-weight: 600;
  }
  svg {
    width: 100%;
    display: block;
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: var(--radius, 12px);
  }
  .ray {
    stroke: #f5c54a;
    stroke-width: 1.4;
    stroke-dasharray: 2 4;
    opacity: 0.6;
  }
  .umbra {
    fill: #1a1726;
    opacity: 0.82;
  }
  .earth {
    fill: #3f6f8f;
    stroke: #2b556e;
    stroke-width: 1;
  }
  .moon-dark {
    fill: #14121c;
    stroke: var(--ink-soft);
    stroke-width: 0.75;
  }
  .moon-red {
    fill: #7e2a1c;
    stroke: #5a1d13;
    stroke-width: 0.75;
  }
  .spot {
    fill: #14121c;
  }
  .lab {
    font-size: 10px;
    fill: var(--ink-soft);
  }
  .lab--dim {
    fill: var(--ink-faint, #999);
    font-style: italic;
  }
  .cap {
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.45;
    color: var(--ink-soft);
    min-height: 3em;
  }
</style>
