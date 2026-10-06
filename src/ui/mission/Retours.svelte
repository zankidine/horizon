<script lang="ts">
  import type { EtatMission } from './mission.svelte'

  let { mission }: { mission: EtatMission } = $props()
</script>

<!-- Les retours restent affichés tant que le joueur ne les ferme pas. -->
<div class="m-retours" aria-live="polite">
  {#each mission.retours as retour (retour.id)}
    <section class="m-retour" data-genre={retour.genre} aria-label={retour.titre}>
      <p class="m-retour-titre">{retour.titre}</p>
      <p>{retour.texte}</p>
      <div class="m-rangee">
        <button type="button" class="m-bouton" onclick={() => mission.lire(retour.texte)}>{mission.t('lire')}</button>
        <button type="button" class="m-bouton" onclick={() => mission.fermerRetour(retour.id)}>{mission.t('fermer')}</button>
      </div>
    </section>
  {/each}
</div>

<style>
  .m-retours {
    display: grid;
    gap: var(--m-gap, 0.875rem);
  }
</style>
