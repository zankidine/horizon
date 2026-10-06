<script lang="ts">
  import { onMount } from 'svelte'
  import { moteur } from '../ecran/moteur.svelte.ts'

  let noeuds = $state(0)

  onMount(() => {
    const compter = (): void => {
      noeuds = document.getElementsByTagName('*').length
    }
    compter()
    const minuteur = setInterval(compter, 1000)
    return () => clearInterval(minuteur)
  })
</script>

<!-- Outil de développement : absent de la build de production. -->
<aside class="stats-dev" data-stats-dev>
  <p>Moteur : {moteur.stats.coutMs.toFixed(2)} ms/image</p>
  <p>
    Canvas : {moteur.stats.canvasAnimes} animés / {moteur.stats.canvasInscrits}
  </p>
  <p>Nœuds DOM : {noeuds}</p>
</aside>

<style>
  .stats-dev {
    position: fixed;
    right: 4px;
    bottom: 4px;
    z-index: 9999;
    padding: 4px 8px;
    border-radius: 4px;
    background: rgb(0 0 0 / 0.75);
    color: #9f9;
    font: 12px/1.3 monospace;
    pointer-events: none;
  }

  p {
    margin: 0;
  }
</style>
