<script lang="ts">
  import type { EtatMission } from './mission.svelte'

  let { mission }: { mission: EtatMission } = $props()
</script>

<div class="m-calcul" data-etape="calcul">
  <p class="m-question">{mission.vue.question}</p>

  {#if mission.reponsesAChoisir.length > 0}
    <!-- Niveaux 1 et 2 : trois réponses à choisir, pas de saisie. -->
    <p>{mission.t('choisirReponse')}</p>
    <div class="m-grille m-compacte">
      {#each mission.reponsesAChoisir as reponse (reponse.libelle)}
        <button type="button" class="m-bouton m-grand" onclick={() => mission.repondre(reponse.valeur)}>
          {reponse.libelle}
        </button>
      {/each}
    </div>
  {:else}
    <form
      class="m-saisie"
      onsubmit={(evenement) => {
        evenement.preventDefault()
        mission.validerSaisie()
      }}
    >
      <label for="m-saisie" class="m-etiquette">{mission.t('saisieEtiquette')}</label>
      <div class="m-rangee">
        <input
          id="m-saisie"
          class="m-champ"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          enterkeyhint="done"
          aria-invalid={mission.saisieInvalide}
          aria-describedby={mission.saisieInvalide ? 'm-saisie-erreur' : undefined}
          bind:value={mission.saisie}
        />
        {#if mission.uniteSaisie}<span class="m-unite">{mission.uniteSaisie}</span>{/if}
        <button type="submit" class="m-bouton m-grand">{mission.t('valider')}</button>
      </div>
      {#if mission.saisieInvalide}
        <p id="m-saisie-erreur" class="m-erreur" role="alert">{mission.t('saisieInvalide')}</p>
      {/if}
    </form>
  {/if}
</div>
