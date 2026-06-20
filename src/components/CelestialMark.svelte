<script lang="ts">
  // The small Sun / Moon mark used on the day card and in the sky readout — one
  // source so they match. Inline SVG (not a font glyph) so it aligns
  // predictably in running text and in the "Gap (moon − sun)" formula.
  let { body, size = 14 }: { body: 'sun' | 'moon'; size?: number } = $props();
</script>

{#if body === 'sun'}
  <svg class="cmark" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="5" fill="currentColor" fill-opacity="0.12" />
    <line x1="12" y1="2" x2="12" y2="4" />
    <line x1="12" y1="20" x2="12" y2="22" />
    <line x1="2" y1="12" x2="4" y2="12" />
    <line x1="20" y1="12" x2="22" y2="12" />
    <line x1="4.9" y1="4.9" x2="6.3" y2="6.3" />
    <line x1="17.7" y1="17.7" x2="19.1" y2="19.1" />
    <line x1="19.1" y1="4.9" x2="17.7" y2="6.3" />
    <line x1="6.3" y1="17.7" x2="4.9" y2="19.1" />
  </svg>
{:else}
  <svg class="cmark" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" fill-opacity="0.12" />
  </svg>
{/if}

<style>
  .cmark {
    display: inline-block;
    vertical-align: -0.18em;
    flex: none;
  }
</style>
