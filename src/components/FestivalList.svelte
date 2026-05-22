<script lang="ts">
  interface Props {
    names: string[];
  }
  let { names }: Props = $props();
</script>

<ul class="festival-list">
  {#each names as name (name)}
    <li class="festival-list__item">
      <span class="festival-list__dot" aria-hidden="true"></span>
      <span class="festival-list__name">{name}</span>
    </li>
  {/each}
</ul>

<style>
  .festival-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .festival-list__item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: rgba(139, 24, 24, 0.05);
    border-left: 3px solid var(--color-festival);
    border-radius: var(--radius-sm);
  }
  .festival-list__dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--color-festival);
  }
  .festival-list__name {
    font-family: var(--font-serif);
    font-size: var(--font-size-md);
  }
</style>
