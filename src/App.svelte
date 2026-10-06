<script lang="ts">
  import { appStore } from './lib/stores/app.svelte'
  import Poste from './ui/poste/Poste.svelte'
  import Preparation from './ui/preparation/Preparation.svelte'
</script>

{#if appStore.pretAPartir}
  <Poste />
{:else}
  <Preparation />
{/if}
