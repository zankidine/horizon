<script lang="ts">
  import type { EtatMission } from './mission.svelte'

  let { mission }: { mission: EtatMission } = $props()
</script>

<div class="m-observation" data-etape="observation">
  <p>{mission.t('observationConsigne')}</p>
  <div class="m-grille m-compacte">
    {#each mission.observations as option (`${option.cible}-${option.mode}`)}
      <button type="button" class="m-bouton m-grand" onclick={() => mission.observer(option.cible, option.mode)}>
        {option.libelle}
      </button>
    {/each}
  </div>
</div>
