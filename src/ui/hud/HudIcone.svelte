<script lang="ts">
  let { nom }: { nom: 'navigation' | 'scan' | 'communications' | 'fermer' } =
    $props()
</script>

<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  {#if nom === 'navigation'}
    <circle cx="12" cy="12" r="9" />
    <path d="M12 5.5 L15.2 13.2 L12 11.6 L8.8 13.2 Z" />
  {:else if nom === 'scan'}
    <circle cx="12" cy="12" r="1.8" />
    <path d="M6.5 12a5.5 5.5 0 0 1 5.5-5.5" />
    <path d="M17.5 12a5.5 5.5 0 0 1-5.5 5.5" />
    <path d="M3.5 12A8.5 8.5 0 0 1 12 3.5" />
    <path d="M20.5 12a8.5 8.5 0 0 1-8.5 8.5" />
  {:else if nom === 'communications'}
    <path d="M5 17.5a8.5 8.5 0 0 1 0-11" />
    <path d="M8.4 15a4.6 4.6 0 0 1 0-6" />
    <circle cx="13" cy="12" r="1.6" />
    <path d="M15.5 9.5 L20 7.5" />
    <path d="M15.5 14.5 L20 16.5" />
  {:else}
    <path d="M6 6 L18 18" />
    <path d="M18 6 L6 18" />
  {/if}
</svg>
