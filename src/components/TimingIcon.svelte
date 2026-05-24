<script lang="ts">
  type TimingIconType = 'sunrise' | 'sunset' | 'moonrise' | 'moonset';

  interface Props {
    type: TimingIconType;
  }

  let { type }: Props = $props();
</script>

<svg
  class="timing-icon timing-icon--{type}"
  viewBox="0 0 32 32"
  fill="none"
  aria-hidden="true"
  focusable="false"
>
  {#if type === 'sunrise'}
    <path class="sun-arc" d="M9.4 21.65a6.6 6.6 0 0 1 13.2 0" />
    <path class="mark" d="M16 7.4v3" />
    <path class="mark" d="M9.2 11.1l2 2" />
    <path class="mark" d="M22.8 11.1l-2 2" />
    <path class="glint" d="M12.8 25.9h6.4" />
  {:else if type === 'sunset'}
    <path class="sun-arc sun-arc--set" d="M9.4 21.2a6.6 6.6 0 0 0 13.2 0" />
    <path class="mark mark--soft" d="M10.6 12.7h10.8" />
    <path class="mark mark--soft" d="M13.2 9.8h5.6" />
    <path class="glint" d="M11.2 25.9h9.6" />
  {:else if type === 'moonrise'}
    <path
      class="moon"
      d="M18.75 8.2a6.35 6.35 0 1 0 4.55 10.8 7.05 7.05 0 0 1-6.55-9.8c.48-.14 1.02-.38 2-.99z"
    />
    <path class="dot" d="M8.35 11.2h.05" />
    <path class="glint" d="M12.6 25.9h6.8" />
  {:else}
    <path
      class="moon moon--set"
      d="M18.7 10.25a6.35 6.35 0 1 0 4.55 10.8 7.05 7.05 0 0 1-6.55-9.8c.48-.14 1.02-.38 2-.99z"
    />
    <path class="dot dot--soft" d="M8.35 9.6h.05" />
    <path class="glint" d="M11.6 17.65h8.8" />
  {/if}

  <path class="horizon" d="M5.2 22.1h21.6" />
  <path class="horizon horizon--fine" d="M8.7 24.45h14.6" />
</svg>

<style>
  .timing-icon {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .horizon,
  .sun-arc,
  .moon,
  .mark,
  .glint,
  .dot {
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .horizon {
    stroke-width: 1.75;
  }

  .horizon--fine,
  .glint {
    opacity: 0.42;
    stroke-width: 1.15;
  }

  .sun-arc {
    stroke-width: 1.9;
  }

  .sun-arc--set {
    opacity: 0.86;
  }

  .moon {
    fill: color-mix(in srgb, currentColor 12%, transparent);
    stroke-width: 1.75;
  }

  .moon--set {
    opacity: 0.86;
  }

  .mark {
    opacity: 0.72;
    stroke-width: 1.55;
  }

  .mark--soft,
  .dot--soft {
    opacity: 0.46;
  }

  .dot {
    stroke-width: 2.8;
  }
</style>
