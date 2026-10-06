<script lang="ts">
  import type { EtatMission } from './mission.svelte'

  let { mission }: { mission: EtatMission } = $props()
  const voyage = $derived(mission.voyage)
</script>

{#if voyage}
  <div class="m-voyage" data-etape="voyage">
    <p class="m-question">{mission.t('voyageExplication')}</p>
    <div
      class="m-jauge"
      role="progressbar"
      aria-label={voyage.progression}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={voyage.pourcent}
    >
      <div class="m-remplissage" style:width="{voyage.pourcent}%"></div>
    </div>
    <p class="m-statut">{voyage.progression}</p>
    {#if voyage.distance}<p>{voyage.distance}</p>{/if}
    {#if voyage.vitesse}<p>{voyage.vitesse}</p>{/if}

    <section aria-labelledby="m-jalons-titre">
      <h3 id="m-jalons-titre" class="m-etiquette">{mission.t('voyageJalons')}</h3>
      <ol class="m-jalons" aria-live="polite">
        {#each voyage.jalons as jalon (jalon.part)}
          <li class="m-jalon">{jalon.texte}</li>
        {:else}
          <li class="m-note">{mission.t('voyageAucunJalon')}</li>
        {/each}
      </ol>
    </section>
  </div>
{/if}
