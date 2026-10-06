<script lang="ts">
  import { Canvas } from '@threlte/core'
  import SceneHublot from './SceneHublot.svelte'
  import type { EtatHublot } from './hublot.svelte'
  import { EtatVue } from './vueExterieure.svelte.ts'

  let { etat }: { etat: EtatHublot } = $props()

  // svelte-ignore state_referenced_locally
  const vue = new EtatVue(etat)
</script>

<div class="vue" bind:clientWidth={vue.largeur} bind:clientHeight={vue.hauteur}>
  <Canvas dpr={vue.ratioPixels}>
    <SceneHublot {etat} />
  </Canvas>
</div>

<style>
  .vue {
    position: absolute;
    inset: 0;
  }
</style>
