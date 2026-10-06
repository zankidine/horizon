<script lang="ts">
  import {
    CREDITS_TEXTURES,
    REGLAGES_QUALITE,
    type EtatEcran,
  } from './ecran.svelte.ts'

  let { ecran }: { ecran: EtatEcran } = $props()
</script>

<div class="pied">
  <label class="qualite">
    <span class="invisible">Qualité graphique</span>
    <select
      value={ecran.hublot.reglage}
      onchange={(evenement) =>
        ecran.changerQualite(evenement.currentTarget.value)}
    >
      {#each REGLAGES_QUALITE as option (option.valeur)}
        <option value={option.valeur}>Qualité : {option.libelle}</option>
      {/each}
    </select>
  </label>
  <p class="credits">{CREDITS_TEXTURES.join(' · ')}</p>
</div>

<style>
  .pied {
    box-sizing: border-box;
    padding: 0.3rem;
    border-radius: var(--hud-rayon);
    background: var(--hud-fond);
    color: var(--hud-texte);
    display: grid;
    gap: 0.3rem;
    pointer-events: auto;
  }

  .qualite select {
    box-sizing: border-box;
    width: 100%;
    min-height: 44px;
    padding: 0 0.5rem;
    border: var(--hud-epaisseur) solid
      color-mix(in srgb, var(--hud-ligne) 65%, transparent);
    border-radius: var(--hud-rayon);
    background: var(--hud-fond);
    color: var(--hud-texte);
    font: inherit;
  }

  .qualite select:focus-visible {
    outline: 3px solid var(--hud-texte);
    outline-offset: 2px;
  }

  .credits {
    margin: 0;
    font-size: 14px;
    line-height: 1.25;
    opacity: 0.8;
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
