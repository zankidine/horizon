<script lang="ts">
  import { onDestroy } from 'svelte'
  import { CompteurAnime } from './valeur.svelte.ts'

  let {
    valeur,
    formater = (n: number) => String(Math.round(n)),
    unite = '',
    mouvementReduit = false,
  }: {
    valeur: number
    /** Mise en forme d'un nombre (par défaut, entier). */
    // eslint-disable-next-line no-unused-vars
    formater?: (nombre: number) => string
    unite?: string
    mouvementReduit?: boolean
  } = $props()

  const compteur = new CompteurAnime()
  $effect(() => compteur.viser(valeur, mouvementReduit))
  onDestroy(() => compteur.arreter())
</script>

<!-- Les chiffres qui défilent sont cachés aux lecteurs d'écran : ils lisent la valeur finale. -->
<span class="valeur">
  <span aria-hidden="true">{formater(compteur.valeur)}{unite}</span>
  <span class="invisible">{formater(valeur)}{unite}</span>
</span>

<style>
  .valeur {
    font-family: var(--hud-font-chiffres);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .invisible {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
</style>
