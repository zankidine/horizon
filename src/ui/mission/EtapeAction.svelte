<script lang="ts">
  import type { EtatMission } from './mission.svelte'

  let { mission }: { mission: EtatMission } = $props()
</script>

<div class="m-action" data-etape="action">
  <p>{mission.consigneAction}</p>
  <ul class="m-grille m-large">
    {#each mission.interrupteurs as interrupteur (interrupteur.id)}
      <li>
        <button
          type="button"
          role="switch"
          aria-checked={interrupteur.actif}
          class="m-bouton m-interrupteur"
          onclick={() => mission.basculer(interrupteur.id)}
        >
          {#if interrupteur.numero !== null}<span class="m-numero" aria-hidden="true">{interrupteur.numero}</span>{/if}
          <span>{interrupteur.libelle}</span>
          <span class="m-etat">{mission.t(interrupteur.actif ? 'interrupteurAllume' : 'interrupteurEteint')}</span>
        </button>
      </li>
    {/each}
  </ul>
</div>
