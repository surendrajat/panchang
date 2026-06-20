<script lang="ts">
  // North Indian (diamond) janma kundli, drawn in SVG so it scales and
  // prints crisply and inherits the paper/ink palette. Houses are FIXED
  // positions (1st house always top-centre); the rashi that occupies each
  // house rotates with the lagna. Whole-sign: house n holds the n-th sign
  // counted from the ascendant.
  //
  // When the birth time is unknown there is no lagna, so we anchor the
  // chart on the Moon's sign (a traditional Chandra kundli) and say so.

  import type { BirthChart, GrahaKey } from '$lib/jyotish';
  import { grahaAbbr, navamsaSign } from '$lib/jyotish';
  import { rashiLabel } from '$lib/labels';
  import { applyNumerals, type NumeralSystem } from '$lib/format/numerals';

  interface Props {
    chart: BirthChart;
    lang: 'en' | 'hi';
    numerals: NumeralSystem;
    varga?: number; // 1 = rashi (D1, default), 9 = navamsa (D9)
  }
  let { chart, lang, numerals, varga = 1 }: Props = $props();

  // Sign a graha occupies in this varga: its rashi for D1, its navamsa for D9.
  const signOf = (long: number, rashi: number) => (varga === 9 ? navamsaSign(long) : rashi);

  // House geometry on a 0..400 square. `num` = where the rashi number
  // sits (nudged toward the house's outer corner); `planets` = anchor for
  // the stacked graha abbreviations (the house centroid).
  interface HouseGeo {
    num: [number, number];
    planets: [number, number];
  }
  const HOUSES: readonly HouseGeo[] = [
    { num: [200, 65], planets: [200, 110] }, // 1  top kite
    { num: [65, 21], planets: [100, 40] }, // 2  top-left tri
    { num: [21, 65], planets: [40, 100] }, // 3  left-top tri
    { num: [65, 200], planets: [110, 200] }, // 4  left kite
    { num: [21, 335], planets: [40, 300] }, // 5  left-bottom tri
    { num: [65, 379], planets: [100, 360] }, // 6  bottom-left tri
    { num: [200, 335], planets: [200, 290] }, // 7  bottom kite
    { num: [335, 379], planets: [300, 360] }, // 8  bottom-right tri
    { num: [379, 335], planets: [360, 300] }, // 9  right-bottom tri
    { num: [335, 200], planets: [290, 200] }, // 10 right kite
    { num: [379, 65], planets: [360, 100] }, // 11 right-top tri
    { num: [335, 21], planets: [300, 40] }, // 12 top-right tri
  ];

  // Lines: square, the two diagonals, the midpoint diamond.
  const FRAME = {
    square: 'M0,0 H400 V400 H0 Z',
    diag1: 'M0,0 L400,400',
    diag2: 'M400,0 L0,400',
    diamond: 'M200,0 L400,200 L200,400 L0,200 Z',
  };

  const num = (s: string | number) => applyNumerals(String(s), numerals);

  const isChandra = $derived(chart.lagna === null);

  // Anchor sign (house 1): lagna when we have a birth time, else Moon — in the
  // chosen varga.
  const anchorRashi = $derived.by(() => {
    if (chart.lagna) return signOf(chart.lagna.longitude, chart.lagna.rashi);
    const moon = chart.grahas.find((g) => g.key === 'moon');
    return moon ? signOf(moon.longitude, moon.rashi) : chart.moonRashi;
  });

  // For each fixed house 1..12, which sign sits there and which grahas.
  interface Cell {
    house: number;
    rashi: number; // 0..11
    grahas: { key: GrahaKey; retro: boolean }[];
  }
  const cells = $derived.by<Cell[]>(() =>
    HOUSES.map((_, i) => {
      const house = i + 1;
      const rashi = (anchorRashi + i) % 12;
      const grahas = chart.grahas
        .filter((g) => signOf(g.longitude, g.rashi) === rashi)
        .map((g) => ({ key: g.key, retro: g.retrograde }));
      return { house, rashi, grahas };
    }),
  );

  // Stack offset so n grahas centre on the planet anchor.
  function dy(idx: number, n: number): number {
    return (idx - (n - 1) / 2) * 17;
  }
</script>

<figure class="kundli">
  <svg viewBox="0 0 400 400" role="img" aria-label="North Indian birth chart" class="chart">
    <!-- frame -->
    <path d={FRAME.square} class="edge edge--outer" />
    <path d={FRAME.diag1} class="edge" />
    <path d={FRAME.diag2} class="edge" />
    <path d={FRAME.diamond} class="edge" />

    {#each cells as cell (cell.house)}
      {@const geo = HOUSES[cell.house - 1]}
      <!-- rashi number -->
      <text x={geo.num[0]} y={geo.num[1]} class="rashi-num" text-anchor="middle">
        {num(cell.rashi + 1)}
      </text>
      <!-- ascendant tick in house 1 (only when we have a real lagna) -->
      {#if cell.house === 1 && !isChandra}
        <text x={geo.num[0]} y={geo.num[1] - 13} class="asc-mark" text-anchor="middle">
          {lang === 'hi' ? 'ल' : 'La'}
        </text>
      {/if}
      <!-- grahas -->
      {#each cell.grahas as g, gi (g.key)}
        <text
          x={geo.planets[0]}
          y={geo.planets[1] + dy(gi, cell.grahas.length)}
          class="graha"
          text-anchor="middle"
          dominant-baseline="middle"
        >
          {grahaAbbr(g.key, lang)}{#if g.retro}<tspan class="retro" dx="1">℞</tspan>{/if}
        </text>
      {/each}
    {/each}
  </svg>
  <figcaption>
    {#if varga === 9}{lang === 'hi' ? 'नवांश (D9)' : 'Navamsa (D9)'} ·
    {/if}{isChandra
      ? lang === 'hi'
        ? 'चन्द्र कुण्डली — जन्म समय अज्ञात'
        : 'Chandra (Moon) — birth time unknown'
      : lang === 'hi'
        ? `लग्न — ${rashiLabel(anchorRashi)}`
        : `Lagna — ${rashiLabel(anchorRashi)}`}
  </figcaption>
</figure>

<style>
  .kundli {
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  .chart {
    width: min(92vw, 420px);
    height: auto;
    /* Aged-paper plate the chart sits on, with a hairline keyline. */
    background: var(--paper-3);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-sm);
  }
  .edge {
    fill: none;
    stroke: var(--ink-soft);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
  }
  .edge--outer {
    stroke: var(--ink);
    stroke-width: 1.5;
  }
  .rashi-num {
    font-family: var(--font-serif);
    font-size: 13px;
    fill: var(--gold);
    font-weight: 600;
  }
  .asc-mark {
    font-family: var(--font-serif);
    font-size: 12px;
    fill: var(--red);
    font-weight: 700;
    letter-spacing: 0.02em;
  }
  .graha {
    font-family: var(--font-serif);
    font-size: 16px;
    fill: var(--red);
    font-weight: 600;
  }
  .retro {
    font-size: 11px;
    fill: var(--red-deep);
  }
  figcaption {
    font-family: var(--font-serif);
    font-size: 14px;
    color: var(--ink-soft);
    font-style: italic;
  }
</style>
