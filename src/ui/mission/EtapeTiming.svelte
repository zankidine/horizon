<script lang="ts">
  import { surAppui } from './appui'
  import type { EtatMission } from './mission.svelte'

  let { mission }: { mission: EtatMission } = $props()
  const fenetre = $derived(mission.fenetre)
</script>

{#if fenetre}
  <div class="m-timing" data-etape="timing">
    <p class="m-question">{mission.vue.question}</p>
    <div
      class="m-jauge"
      data-phase={fenetre.ouverte ? 'ouverte' : 'attente'}
      role="progressbar"
      aria-label={fenetre.message}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={Math.round(fenetre.fraction * 100)}
    >
      <div class="m-remplissage" style:width="{fenetre.fraction * 100}%"></div>
    </div>
    <p class="m-statut" data-ok={fenetre.ouverte} role="status">
      {fenetre.message}
      {#if fenetre.restante}<span class="m-note">{fenetre.restante}</span>{/if}
    </p>
    <!-- Réagit à l'appui (pointerdown), sans le délai du clic tactile. -->
    <button type="button" class="m-bouton m-enorme" data-ouverte={fenetre.ouverte} use:surAppui={() => mission.pousser()}>
      {mission.t('timingPousser')}
    </button>
  </div>
{/if}
