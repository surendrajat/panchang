<script lang="ts">
  // Shared loading indicator — the spinning ring + a label. Used while the
  // Festivals worker computes a year, and while the lazy Kundli/Sky route
  // chunks load, so every "computing/loading" state looks identical.
  let { label }: { label: string } = $props();
</script>

<div class="loading" role="status" aria-live="polite">
  <span class="spinner" aria-hidden="true"></span>
  <span class="muted">{label}</span>
</div>

<style>
  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 44px 0;
  }
  .spinner {
    width: 22px;
    height: 22px;
    border: 2.5px solid var(--line);
    border-top-color: var(--red);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation-duration: 2s;
    }
  }
</style>
