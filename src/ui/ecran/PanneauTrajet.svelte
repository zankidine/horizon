<script lang="ts">
  import { estVisible, type Categorie } from '../../lib/categories'
  import { formaterDuree, formaterNombre, remplir } from '../../lib/format-fr'
  import HudJauge from '../hud/HudJauge.svelte'
  import HudPanneau from '../hud/HudPanneau.svelte'
  import { RANGS } from '../hud/hud.svelte.ts'
  import { vaisseau } from '../vaisseau.svelte'
  import type { EtatEcran } from './ecran.svelte.ts'
  import GraphiqueCanvas from './GraphiqueCanvas.svelte'
  import { dessinGps } from './dessins'

  let {
    ecran,
    categoriesVisibles,
    dansFenetre = false,
  }: {
    ecran: EtatEcran
    /** Grandeurs montrées selon le niveau de connaissance (tout par défaut). */
    categoriesVisibles?: readonly Categorie[]
    /** Affiché dans une fenêtre : sans cadre propre. */
    dansFenetre?: boolean
  } = $props()

  const hud = $derived(ecran.hud)
  const reste = $derived(
    `${formaterNombre(Math.round(ecran.vol.distanceSurfaceKm))}\u00a0km`
  )
  const arrivee = $derived(
    ecran.vol.dureeRestanteS === null
      ? hud.t(hud.textes.ecran.arriveeInconnue)
      : remplir(hud.t(hud.textes.ecran.arrivee), {
          valeur: formaterDuree(ecran.vol.dureeRestanteS),
        })
  )
</script>

<HudPanneau
  sansCadre={dansFenetre}
  id="hud-trajet{dansFenetre ? '-fenetre' : ''}"
  titre={hud.t(hud.textes.ecran.tiroirTrajet)}
  allume={hud.estAllume(RANGS.trajet)}
  flou={false}
>
  <div class="carte">
    <GraphiqueCanvas
      dessiner={dessinGps(() => vaisseau.etat)}
      visible={!hud.masque}
      priorite={2}
    />
  </div>

  <HudJauge
    etiquette={hud.t(hud.textes.ecran.progression)}
    valeur={ecran.avancement}
    avertir={false}
  />

  {#if estVisible(categoriesVisibles, 'distance')}
    <p>{remplir(hud.t(hud.textes.ecran.restant), { valeur: reste })}</p>
  {/if}
  {#if estVisible(categoriesVisibles, 'temps')}
    <p>{arrivee}</p>
  {/if}
</HudPanneau>

<style>
  p {
    margin: 0;
    font-weight: 500;
    line-height: 1.2;
  }

  .carte {
    height: 4.5rem;
  }
</style>
