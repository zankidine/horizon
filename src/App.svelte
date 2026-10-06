<script lang="ts">
  import { appStore } from './lib/stores/app.svelte'
  import Preparation from './ui/preparation/Preparation.svelte'
  import Hublot from './ui/Hublot.svelte'
</script>

{#if appStore.pretAPartir}
  <Hublot />
{:else}
  <Preparation />
{/if}
