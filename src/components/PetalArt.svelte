<script lang="ts">
  // Masthead/colophon ornament: a line-art lotus flanked by two leaves,
  // inheriting the surrounding gold via currentColor.
</script>

<span class="petal-art" aria-hidden="true">
  <svg class="petal-art__leaf petal-art__leaf--left" viewBox="-7 -35 14 41">
    <path class="stroke faint" d="M0 4 L0 0" />
    <path class="stroke" d="M0 0 C-6 -9 -6 -24 0 -33 C6 -24 6 -9 0 0 Z" />
    <path class="stroke faint" d="M0 -3 L0 -30" />
  </svg>

  <svg class="petal-art__lotus" viewBox="0 0 100 76">
    <path class="stroke" d="M50 61 C30 50.4 30 50.4 7.7 53.5 C27.6 64.2 27.6 64.2 50 61 Z" />
    <path class="stroke" d="M50 61 C72.4 64.2 72.4 64.2 92.3 53.5 C70 50.4 70 50.4 50 61 Z" />
    <path class="stroke" d="M50 60 C35.3 37.6 35.3 37.6 10.4 27.9 C25 50.3 25 50.3 50 60 Z" />
    <path class="stroke" d="M50 60 C75 50.3 75 50.3 89.6 27.9 C64.7 37.6 64.7 37.6 50 60 Z" />
    <path class="stroke" d="M49 55 C44.9 43.5 44.9 43.5 36.6 34.4 C40.8 46 40.8 46 49 55 Z" />
    <path class="stroke" d="M49 55 C57.2 46 57.2 46 61.4 34.4 C53.1 43.5 53.1 43.5 49 55 Z" />
    <path class="stroke" d="M50 60 C58 33.5 58 35.5 50 9 C42 35.5 42 33.5 50 60 Z" />
    <path class="stroke" d="M50 53 C54.4 33.8 54.4 35.2 50 16 C45.6 35.2 45.6 33.8 50 53 Z" />
    <path class="stroke" d="M46 59.5 L50 66 L54 59.5" />
  </svg>

  <svg class="petal-art__leaf petal-art__leaf--right" viewBox="-7 -35 14 41">
    <path class="stroke faint" d="M0 4 L0 0" />
    <path class="stroke" d="M0 0 C-6 -9 -6 -24 0 -33 C6 -24 6 -9 0 0 Z" />
    <path class="stroke faint" d="M0 -3 L0 -30" />
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
    width: 40px;
    height: 30.4px;
  }
  .petal-art__leaf {
    width: 9px;
    height: 26px;
  }
  /* Splay the pair outward, pivoting from the petiole (bottom-centre). */
  .petal-art__leaf--left {
    transform: rotate(-22deg);
    transform-origin: bottom center;
  }
  .petal-art__leaf--right {
    transform: rotate(22deg);
    transform-origin: bottom center;
  }

  .stroke {
    fill: none;
    stroke: currentColor;
    stroke-width: 1px;
    stroke-linecap: round;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke; /* constant 1px regardless of viewBox scale */
  }
  .faint {
    opacity: 0.6;
  }
</style>
