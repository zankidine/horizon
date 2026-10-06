<script lang="ts">
  import type { EtatMission } from './mission.svelte'

  let { mission }: { mission: EtatMission } = $props()
</script>

<div class="m-choix" data-etape="choix">
  <p class="m-question">{mission.vue.question}</p>
  <div class="m-grille">
    {#each mission.options as option (option.id)}
      <button type="button" class="m-bouton m-grand" onclick={() => mission.choisir(option.id)}>
        {option.texte}
      </button>
    {/each}
  </div>
</div>
