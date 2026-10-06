<script lang="ts">
  import type { EtatMission } from './mission.svelte'

  let { mission }: { mission: EtatMission } = $props()
</script>

{#if mission.volet === 'journal'}
  <section class="m-volet" data-volet="journal" aria-labelledby="m-volet-titre">
    <h2 id="m-volet-titre" class="m-titre">{mission.t('journalTitre')}</h2>
    {#each mission.etat.journal as entree (entree.id)}
      <article class="m-entree">
        <strong>{entree.titre}</strong>
        {#if entree.texte}<p>{entree.texte}</p>{/if}
      </article>
    {:else}
      <p class="m-note">{mission.t('journalVide')}</p>
    {/each}
  </section>
{:else if mission.volet === 'appris'}
  <section class="m-volet" data-volet="appris" aria-labelledby="m-volet-titre">
    <h2 id="m-volet-titre" class="m-titre">{mission.t('apprisTitre')}</h2>
    {#each mission.vue.apprentissages as entree (entree.etape)}
      <article class="m-entree"><p>{entree.texte}</p></article>
    {:else}
      <p class="m-note">{mission.t('apprisVide')}</p>
    {/each}
  </section>
{/if}

<style>
  .m-volet {
    display: grid;
    gap: var(--m-gap, 0.875rem);
  }
</style>
