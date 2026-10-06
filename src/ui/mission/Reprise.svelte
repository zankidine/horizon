<script lang="ts">
  import type { EtatMission } from './mission.svelte'

  let { mission }: { mission: EtatMission } = $props()
</script>

<div class="m-corps" data-ecran="reprise">
  <h2 class="m-titre">{mission.repriseTexte}</h2>
  <p class="m-etoiles-texte">{mission.etoilesTexte}</p>
  <div class="m-grille m-colonne">
    <button type="button" class="m-bouton m-grand" onclick={() => mission.continuerReprise()}>{mission.t('continuer')}</button>
    <button type="button" class="m-bouton m-grand m-discret" onclick={() => mission.recommencer()}>{mission.t('recommencer')}</button>
  </div>
</div>
