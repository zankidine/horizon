<script lang="ts">
  import type { EtatMission } from './mission.svelte'

  let { mission }: { mission: EtatMission } = $props()
  const etoiles = $derived(Array.from({ length: mission.vue.etoilesMax }, (_, i) => i < mission.vue.etoiles))
</script>

<div class="m-corps" data-ecran="fin">
  <h2 class="m-titre">{mission.t('finTitre')}</h2>
  <p class="m-etoiles" aria-hidden="true">
    {#each etoiles as pleine, i (i)}<span class:m-vide={!pleine}>★</span>{/each}
  </p>
  <p class="m-question">{mission.bilanTexte}</p>

  <section>
    <h3 class="m-etiquette">{mission.t('finAppris')}</h3>
    {#each mission.vue.apprentissages as entree (entree.etape)}
      <article class="m-entree"><p>{entree.texte}</p></article>
    {:else}
      <p class="m-note">{mission.t('apprisVide')}</p>
    {/each}
  </section>

  <section>
    <h3 class="m-etiquette">{mission.t('finJournal')}</h3>
    {#each mission.etat.journal as entree (entree.id)}
      <article class="m-entree">
        <strong>{entree.titre}</strong>
        {#if entree.texte}<p>{entree.texte}</p>{/if}
      </article>
    {/each}
  </section>

  <div class="m-grille m-colonne">
    <button type="button" class="m-bouton m-grand" onclick={() => mission.recommencer()}>{mission.t('recommencer')}</button>
    <button type="button" class="m-bouton m-grand m-discret" onclick={() => mission.changerNiveau()}>{mission.t('changerNiveau')}</button>
  </div>
</div>
