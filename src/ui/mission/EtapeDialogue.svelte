<script lang="ts">
  import type { EtatMission } from './mission.svelte'

  let { mission }: { mission: EtatMission } = $props()
  const replique = $derived(mission.etat.replique)
</script>

{#if replique}
  <figure class="m-dialogue" data-etape="dialogue">
    <p class="m-locuteur">{mission.libelleLocuteur(replique.locuteur)}</p>
    <p class="m-replique">{replique.texte}</p>
  </figure>
{/if}
