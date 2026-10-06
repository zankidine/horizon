<script lang="ts">
  import { appStore } from './lib/stores/app.svelte'
  import Ecran from './ui/ecran/Ecran.svelte'
  import Preparation from './ui/preparation/Preparation.svelte'
</script>

{#if appStore.pretAPartir}
  <Ecran />
{:else}
  <Preparation />
{/if}
