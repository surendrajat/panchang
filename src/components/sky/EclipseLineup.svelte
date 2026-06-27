<script lang="ts">
  // The simplest picture: an eclipse is a shadow falling in a straight line.
  // Solar — the Moon slips between us and the Sun and drops its shadow on Earth.
  // Lunar — Earth blocks the sunlight and its shadow falls across the full Moon.
  // A teaching diagram (not to scale; the Sun is effectively at infinity, so its
  // light arrives parallel), with a Solar/Lunar toggle and a slow sweep so you can
  // watch the shadow track across.
  import EarthIcon from './EarthIcon.svelte';
  let { lang = 'en' }: { lang?: 'en' | 'hi' } = $props();
  const hi = (h: string, e: string) => (lang === 'hi' ? h : e);

  let mode = $state<'solar' | 'lunar'>('solar');

  const W = 400;
  const H = 200;
  const cy = 92;
  const SUN = { x: 44, r: 26 };

  // a slow sweep, 0..1 looping; reduced-motion parks it at the aligned middle
  let phase = $state(0.5);
  $effect(() => {
    const reduce =
      typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      phase = 0.5;
      return;
    }
    let raf = 0;
    let start = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      phase = ((now - start) / 9000) % 1; // ~9 s loop
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });
  const swing = $derived(Math.sin(phase * Math.PI * 2)); // -1..1

  // solar: Moon (+ its umbra) bob vertically, so the shadow spot tracks across Earth
  const moonDY = $derived(swing * 13);
  // lunar: the Moon glides through Earth's shadow; red while inside the umbra
  const lunarMoonX = $derived(300 + swing * 56);
  const inUmbra = $derived(Math.abs(lunarMoonX - 300) < 40);
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
      <radialGradient id="lu-sun" cx="40%" cy="38%" r="72%">
        <stop offset="0%" stop-color="#fff8d8" />
        <stop offset="52%" stop-color="#ffce3a" />
        <stop offset="100%" stop-color="#f08a00" />
      </radialGradient>
      <radialGradient id="lu-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffcf4d" stop-opacity="0.4" />
        <stop offset="100%" stop-color="#ffcf4d" stop-opacity="0" />
      </radialGradient>
      <radialGradient id="lu-moon" cx="38%" cy="34%" r="72%">
        <stop offset="0%" stop-color="#fbf4df" />
        <stop offset="100%" stop-color="#c9b88c" />
      </radialGradient>
      <linearGradient id="lu-umbra" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#07060f" stop-opacity="0.97" />
        <stop offset="100%" stop-color="#07060f" stop-opacity="0.68" />
      </linearGradient>
      <filter id="lu-soft" x="-30%" y="-40%" width="160%" height="180%">
        <feGaussianBlur stdDeviation="1.3" />
      </filter>
    </defs>

    <!-- deep-space backdrop (a touch of blue so the shadow cones read) + stars -->
    <rect x="0" y="0" width={W} height={H} fill="#191c34" />
    {#each [[40, 24], [120, 150], [210, 40], [330, 30], [370, 120], [76, 96], [260, 168], [186, 110], [300, 64]] as [sx, sy] (sx)}
      <circle cx={sx} cy={sy} r="0.8" fill="#fff" opacity="0.5" />
    {/each}

    <!-- the Sun + parallel sunlight -->
    <circle cx={SUN.x} {cy} r={SUN.r + 9} fill="url(#lu-glow)" />
    {#each [-22, -11, 0, 11, 22] as dy (dy)}
      <line x1={SUN.x + SUN.r} y1={cy + dy} x2={W - 22} y2={cy + dy} class="ray" />
    {/each}
    <circle cx={SUN.x} {cy} r={SUN.r} fill="url(#lu-sun)" />
    <text x={SUN.x} y={cy + SUN.r + 17} class="lab" text-anchor="middle">{hi('सूर्य', 'Sun')}</text>

    {#if mode === 'solar'}
      {@const mx = 250}
      {@const my = cy + moonDY}
      {@const ex = 344}
      {@const er = 19}
      {@const tipx = ex - er}
      <!-- penumbra (soft, diverging) + umbra (dark, converging to a spot on Earth) -->
      <path
        d="M {mx} {my - 7} L {W} {my - 30} L {W} {my + 30} L {mx} {my + 7} Z"
        fill="#1a1726"
        opacity="0.28"
        filter="url(#lu-soft)"
      />
      <path
        d="M {mx} {my - 6.5} L {tipx} {my} L {mx} {my + 6.5} Z"
        fill="url(#lu-umbra)"
        filter="url(#lu-soft)"
      />
      <EarthIcon cx={ex} {cy} r={er} />
      <ellipse cx={tipx + 2} cy={my} rx="3.4" ry="4.2" fill="#10101c" opacity="0.85" />
      <!-- the Moon: sunward (left) half lit -->
      <circle cx={mx} cy={my} r="8" fill="#1a1622" />
      <path d="M {mx} {my - 8} A 8 8 0 0 0 {mx} {my + 8} Z" fill="url(#lu-moon)" />
      <text x={mx} y={my - 12} class="lab" text-anchor="middle">{hi('चन्द्र', 'Moon')}</text>
      <text x={ex} y={cy + er + 16} class="lab" text-anchor="middle">{hi('पृथ्वी', 'Earth')}</text>
      <text x={(mx + tipx) / 2} y={cy + 34} class="lab lab--dim" text-anchor="middle"
        >{hi('चन्द्र की छाया', 'Moon’s shadow')}</text
      >
    {:else}
      {@const ex = 196}
      {@const er = 20}
      {@const utip = ex + 168}
      <!-- Earth's penumbra (soft) + umbra (dark cone) reaching out past the Moon -->
      <path
        d="M {ex} {cy - er} L {W} {cy - 46} L {W} {cy + 46} L {ex} {cy + er} Z"
        fill="#1a1726"
        opacity="0.28"
        filter="url(#lu-soft)"
      />
      <path
        d="M {ex} {cy - er} L {utip} {cy} L {ex} {cy + er} Z"
        fill="url(#lu-umbra)"
        filter="url(#lu-soft)"
      />
      <EarthIcon cx={ex} {cy} r={er} />
      <!-- the Moon glides through; reddens inside the umbra -->
      <circle cx={lunarMoonX} {cy} r="8" fill={inUmbra ? '#7e2a1c' : 'url(#lu-moon)'} />
      {#if inUmbra}
        <circle
          cx={lunarMoonX}
          {cy}
          r="8"
          fill="none"
          stroke="#5a90c8"
          stroke-width="1"
          opacity="0.5"
        />
      {/if}
      <text x={ex} y={cy + er + 16} class="lab" text-anchor="middle">{hi('पृथ्वी', 'Earth')}</text>
      <text x={lunarMoonX} y={cy - 12} class="lab" text-anchor="middle">{hi('चन्द्र', 'Moon')}</text
      >
      <text x={ex + 78} y={cy - 30} class="lab lab--dim" text-anchor="middle"
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
    border: 1px solid var(--line);
    border-radius: var(--radius, 12px);
  }
  .ray {
    stroke: #f5c54a;
    stroke-width: 1.4;
    stroke-dasharray: 2 4;
    opacity: 0.55;
  }
  .lab {
    font-size: 10px;
    fill: #d9d3e2;
  }
  .lab--dim {
    fill: #9a93ab;
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
