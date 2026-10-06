<script lang="ts">
  import './mission.css'
  import EtapeAction from './EtapeAction.svelte'
  import EtapeCalcul from './EtapeCalcul.svelte'
  import EtapeChoix from './EtapeChoix.svelte'
  import EtapeDescente from './EtapeDescente.svelte'
  import EtapeDialogue from './EtapeDialogue.svelte'
  import EtapeObservation from './EtapeObservation.svelte'
  import EtapeTiming from './EtapeTiming.svelte'
  import EtapeVoyage from './EtapeVoyage.svelte'
  import Fin from './Fin.svelte'
  import { remonter } from './remonter'
  import type { EtatMission } from './mission.svelte'
  import Reprise from './Reprise.svelte'
  import Retours from './Retours.svelte'
  import Volets from './Volets.svelte'

  /** Le panneau unique de la mission : toute la logique est dans EtatMission. */
  let { mission }: { mission: EtatMission } = $props()
  const vue = $derived(mission.vue)
</script>

<section
  class="mission"
  aria-label={mission.t('panneauMission')}
  data-etape-type={mission.typeEtape ?? 'fin'}
  data-etape-id={vue.etape?.id}
>
  {#if mission.etat.reprise}
    <Reprise {mission} />
  {:else if vue.terminee}
    <Fin {mission} />
  {:else}
    <header class="m-entete">
      <button type="button" class="m-bouton" aria-pressed={mission.volet === 'journal'} onclick={() => mission.ouvrirVolet('journal')}>
        {mission.t('journal')} ({vue.journal.length})
      </button>
      <button type="button" class="m-bouton" aria-pressed={mission.volet === 'appris'} onclick={() => mission.ouvrirVolet('appris')}>
        {mission.t('appris')} ({vue.progression.apprentissages})
      </button>
    </header>

    <div class="m-corps" use:remonter={`${vue.etape?.id}-${mission.volet}`}>
      <p class="m-ligne-titre">
        <span>{mission.titreScene}</span>
        <span>{mission.etoilesTexte}</span>
      </p>
      {#if mission.volet !== 'mission'}
        <Volets {mission} />
        <button type="button" class="m-bouton m-grand" onclick={() => mission.ouvrirVolet(mission.volet)}>
          {mission.t('retourMission')}
        </button>
      {:else}
        <p class="m-objectif" aria-live="polite">
          <span class="m-etiquette">{mission.t('objectif')}</span>
          {vue.objectif}
        </p>
        <!-- Aux étapes de commande en direct, le bouton passe avant les retours : il reste visible sans défiler. -->
        {#if !mission.commandeEnDirect}<Retours {mission} />{/if}
        {#if mission.typeEtape === 'dialogue'}
          <EtapeDialogue {mission} />
        {:else if mission.typeEtape === 'choix'}
          <EtapeChoix {mission} />
        {:else if mission.typeEtape === 'calcul'}
          <EtapeCalcul {mission} />
        {:else if mission.typeEtape === 'action'}
          <EtapeAction {mission} />
        {:else if mission.typeEtape === 'timing'}
          <EtapeTiming {mission} />
        {:else if mission.typeEtape === 'voyage'}
          <EtapeVoyage {mission} />
        {:else if mission.typeEtape === 'descente'}
          <EtapeDescente {mission} />
        {:else if mission.typeEtape === 'observation'}
          <EtapeObservation {mission} />
        {/if}
        {#if mission.commandeEnDirect}<Retours {mission} />{/if}
        {#if mission.voixAbsente}<p class="m-note" role="status">{mission.t('voixAbsente')}</p>{/if}
      {/if}
    </div>

    <!-- Lire, Indice et Suivant gardent toujours leur place. -->
    <footer class="m-pied">
      <button type="button" class="m-bouton" aria-label={mission.t('lireAria')} onclick={() => mission.lire()}>
        {mission.t('lire')}
      </button>
      <button
        type="button"
        class="m-bouton"
        class:m-absent={!mission.indiceDisponible}
        disabled={!mission.indiceDisponible}
        onclick={() => mission.demanderIndice()}
      >
        {mission.t('indice')}
      </button>
      <button
        type="button"
        class="m-bouton"
        class:m-absent={!mission.peutSuivant}
        disabled={!mission.peutSuivant}
        onclick={() => mission.suivant()}
      >
        {mission.t('suivant')}
      </button>
    </footer>
  {/if}
</section>
