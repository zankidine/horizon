<script lang="ts">
  import { surAppui } from './appui'
  import type { EtatMission } from './mission.svelte'

  let { mission }: { mission: EtatMission } = $props()
  const descente = $derived(mission.descente)
</script>

{#if descente}
  <div class="m-descente" data-etape="descente">
    <p class="m-question">{mission.t('descenteConsigne')}</p>
    <p class="m-mesures">
      <span>{descente.altitude}</span>
      <span>{descente.vitesse}</span>
      <span class="m-note">{descente.zone}</span>
    </p>
    <div class="m-jauge" role="img" aria-label={`${descente.vitesse}. ${descente.zone}`}>
      <div
        class="m-jauge-zone"
        style:left="{descente.jauge.zoneDebut * 100}%"
        style:width="{(descente.jauge.zoneFin - descente.jauge.zoneDebut) * 100}%"
      ></div>
      <div class="m-jauge-repere" style:left="{descente.jauge.vitesse * 100}%"></div>
    </div>
    <p class="m-statut" data-ok={descente.dansLaZone} role="status">{descente.statut}</p>
    <button
      type="button"
      class="m-bouton m-enorme"
      aria-pressed={descente.moteur}
      data-ouverte={descente.moteur}
      use:surAppui={() => mission.basculerMoteur()}
    >
      {mission.t(descente.moteur ? 'moteurAllume' : 'moteurEteint')}
    </button>
  </div>
{/if}
