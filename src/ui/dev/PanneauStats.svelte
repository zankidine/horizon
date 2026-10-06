<script lang="ts">
  import { onMount } from 'svelte'
  import { trouverPlace, type Rect } from '../../lib/placement'
  import { moteur } from '../ecran/moteur.svelte.ts'

  let noeuds = $state(0)
  /** Replié par défaut ; Ctrl+Maj+D l'ouvre et le referme. */
  let ouvert = $state(false)
  let place = $state<{ x: number; y: number } | null>({ x: 8, y: 8 })
  let racine = $state<HTMLElement>()

  const CLIQUABLES =
    'button, a[href], select, input, textarea, summary, [role="button"], [tabindex]:not([tabindex="-1"])'

  /** Cherche un endroit libre : jamais sur un élément cliquable. */
  function placer(): void {
    if (!racine) return
    const rect = racine.getBoundingClientRect()
    const obstacles: Rect[] = [...document.querySelectorAll(CLIQUABLES)]
      .filter((e) => !racine!.contains(e))
      .map((e) => e.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0)
    place = trouverPlace(
      { largeur: rect.width, hauteur: rect.height },
      { largeur: innerWidth, hauteur: innerHeight },
      obstacles
    )
  }

  onMount(() => {
    const compter = (): void => {
      noeuds = document.getElementsByTagName('*').length
      placer()
    }
    compter()
    const minuteur = setInterval(compter, 1000)
    return () => clearInterval(minuteur)
  })

  $effect(() => {
    void ouvert
    // Après le rendu de la nouvelle taille.
    queueMicrotask(placer)
  })

  function surTouche(evenement: KeyboardEvent): void {
    if (
      evenement.ctrlKey &&
      evenement.shiftKey &&
      evenement.key.toLowerCase() === 'd'
    ) {
      evenement.preventDefault()
      ouvert = !ouvert
    }
  }
</script>

<svelte:window onkeydown={surTouche} onresize={placer} />

<!--
  Outil de développement : absent de la build de production. Il ne reçoit
  jamais d'événement (pointer-events: none) et se place hors des éléments
  cliquables ; sans place libre, il se cache.
-->
<aside
  bind:this={racine}
  class="stats-dev"
  class:ouvert
  hidden={place === null}
  style:left="{place?.x ?? 0}px"
  style:top="{place?.y ?? 0}px"
  data-stats-dev
  aria-hidden="true"
>
  {#if ouvert}
    <p>Moteur : {moteur.stats.coutMs.toFixed(2)} ms/image</p>
    <p>
      Canvas : {moteur.stats.canvasAnimes} animés / {moteur.stats
        .canvasInscrits}
    </p>
    <p>Nœuds DOM : {noeuds}</p>
    <p>Ctrl+Maj+D : replier</p>
  {:else}
    <p>DEV</p>
  {/if}
</aside>

<style>
  .stats-dev {
    position: fixed;
    z-index: 9999;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgb(0 0 0 / 0.75);
    color: #9f9;
    font: 12px/1.3 monospace;
    pointer-events: none;
  }

  .stats-dev[hidden] {
    display: none;
  }

  .ouvert {
    padding: 4px 8px;
  }

  p {
    margin: 0;
  }
</style>
