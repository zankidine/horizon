<script lang="ts">
  import { onMount } from 'svelte'
  import { moteur, type Graphe } from './moteur.svelte.ts'

  let {
    dessiner,
    visible = true,
    priorite = 5,
  }: {
    dessiner: Graphe['dessiner']
    /** Faux quand le panneau est replié ou le HUD masqué : le graphe n'est plus dessiné. */
    visible?: boolean
    priorite?: number
  } = $props()

  let canvas = $state<HTMLCanvasElement>()

  // Le graphe est décoratif ou redondant avec du texte : caché aux lecteurs d'écran.
  onMount(() => {
    if (!canvas) return
    return moteur.inscrire({
      canvas,
      priorite,
      dessiner: (...args) => dessiner(...args),
      visible: () => visible,
    })
  })

  // Un changement de visibilité relance (ou met en pause) la boucle.
  $effect(() => {
    void visible
    moteur.reveiller()
  })
</script>

<canvas bind:this={canvas} aria-hidden="true"></canvas>

<style>
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
</style>
