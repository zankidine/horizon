<script lang="ts">
  import { appStore } from './lib/stores/app.svelte'
</script>

<main>
  <h1>Horizon</h1>
  <p>Profil : {appStore.profile}</p>
</main>

<style>
  main {
    text-align: center;
    padding: 2rem;
  }

  h1 {
    font-size: 3rem;
    font-weight: bold;
    margin-bottom: 1rem;
  }
</style>
