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
    padding: var(--esp-1);
    border-radius: var(--hud-rayon);
    background: var(--hud-fond);
    color: var(--hud-texte);
    display: grid;
    gap: var(--esp-1);
    pointer-events: auto;
  }

  .qualite select {
    box-sizing: border-box;
    width: 100%;
    min-height: var(--cible);
    padding: 0 var(--esp-2);
    border: var(--hud-epaisseur) solid var(--hud-bordure);
    border-radius: var(--hud-rayon);
    background: var(--hud-fond);
    color: var(--hud-texte);
    font: inherit;
  }

  @media (hover: hover) {
    .qualite select:hover {
      background: var(--hud-fond-actif);
    }
  }

  .qualite select:focus-visible {
    outline: var(--hud-focus);
    outline-offset: var(--hud-focus-decalage);
  }

  .credits {
    margin: 0;
    font-size: var(--txt-s);
    line-height: 1.25;
    color: var(--hud-texte-doux);
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
