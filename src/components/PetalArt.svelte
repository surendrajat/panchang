<script lang="ts">
  // Masthead/colophon ornament: a line-art lotus flanked by two leaves,
  // inheriting the surrounding gold via currentColor.
</script>

<span class="petal-art" aria-hidden="true">
  <svg class="petal-art__leaf petal-art__leaf--left" viewBox="0 0 22 26">
    <path class="stroke" d="M4 23 C4 13 9 4 18 2 C16 12 12 20 4 23 Z" />
    <path class="stroke vein" d="M5.5 21 C9 14.5 12.5 8.5 16 4.5" />
  </svg>

  <svg class="petal-art__lotus" viewBox="0 0 100 76">
    <!-- base petals -->
    <path class="stroke" d="M50 59 C38.1 51.7 25.6 50.4 12 55 C24.4 62.4 36.9 63.7 50 59 Z" />
    <path class="stroke" d="M50 59 C61.9 51.7 74.4 50.4 88 55 C75.6 62.4 63.1 63.7 50 59 Z" />
    <!-- centre-bottom V -->
    <path class="stroke" d="M45 58 L50 65 L55 58" />
    <!-- large side petals -->
    <path class="stroke" d="M50 57 C42.1 42.2 29.9 32.9 13 29 C21.3 44.1 33.5 53.4 50 57 Z" />
    <path class="stroke" d="M50 57 C57.9 42.2 70.1 32.9 87 29 C78.7 44.1 66.5 53.4 50 57 Z" />
    <!-- short spikes peeking between -->
    <path class="stroke" d="M44 41 C40 35 37 31 35 27 C38 32 41 37 44 41 Z" />
    <path class="stroke" d="M56 41 C60 35 63 31 65 27 C62 32 59 37 56 41 Z" />
    <!-- centre petal, double outline, pointed both ends -->
    <path class="stroke" d="M50 8 C60 25 60 44 50 58 C40 44 40 25 50 8 Z" />
    <path class="stroke" d="M50 15 C56 27 56 42 50 52 C44 42 44 27 50 15 Z" />
  </svg>

  <svg class="petal-art__leaf petal-art__leaf--right" viewBox="0 0 22 26">
    <path class="stroke" d="M4 23 C4 13 9 4 18 2 C16 12 12 20 4 23 Z" />
    <path class="stroke vein" d="M5.5 21 C9 14.5 12.5 8.5 16 4.5" />
  </svg>
</span>

<style>
  .petal-art {
    display: inline-flex;
    align-items: flex-end;
    gap: 6px;
    color: inherit; /* gold, from .title-ornament */
  }
  .petal-art__lotus {
    width: 36px;
    height: 27.4px;
  }
  .petal-art__leaf {
    width: 13px;
    height: 15.5px;
    margin-bottom: 2px;
  }
  /* Mirror the left leaf so the pair splays outward symmetrically. */
  .petal-art__leaf--left {
    transform: scaleX(-1);
  }

  .stroke {
    fill: none;
    stroke: currentColor;
    stroke-width: 1px;
    stroke-linecap: round;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke; /* constant 1px regardless of viewBox scale */
  }
  .vein {
    opacity: 0.6;
    stroke-width: 0.9px;
  }
</style>
