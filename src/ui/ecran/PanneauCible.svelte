<script lang="ts">
  import { estVisible, type Categorie } from '../../lib/categories'
  import { formaterValeurFiche } from '../../lib/fiche-format'
  import { remplir } from '../../lib/format-fr'
  import HudPanneau from '../hud/HudPanneau.svelte'
  import { RANGS } from '../hud/hud.svelte.ts'
  import { vaisseau } from '../vaisseau.svelte'
  import type { EtatEcran } from './ecran.svelte.ts'
  import GraphiqueCanvas from './GraphiqueCanvas.svelte'
  import { dessinRadar } from './dessins'

  let {
    ecran,
    categoriesVisibles,
  }: {
    ecran: EtatEcran
    /** Grandeurs montrées selon le niveau de connaissance (tout par défaut). */
    categoriesVisibles?: readonly Categorie[]
  } = $props()

  const hud = $derived(ecran.hud)
  const nom = $derived(hud.t(hud.textes.cibles[ecran.cible]))
  const scan = $derived(ecran.scan)
  const lignes = $derived(
    ecran.fiche
      .map((ligne, rang) => ({ ligne, rang }))
      .filter(({ ligne }) => estVisible(categoriesVisibles, ligne.categorie))
  )
  const aSource = $derived(
    lignes.some(({ ligne, rang }) => ligne.sourcee && rang < scan.revelees)
  )

  /** Valeur affichée : le réel, « scan en cours » ou « donnée indisponible ». */
  function texteValeur(rang: number): { texte: string; attente: boolean } {
    const ligne = ecran.fiche[rang]
    const revelee = rang < scan.revelees
    if (revelee && ligne.valeur) {
      return { texte: formaterValeurFiche(ligne.valeur), attente: false }
    }
    if (revelee && scan.termine) {
      return { texte: hud.t(hud.textes.ecran.indisponible), attente: true }
    }
    return { texte: hud.t(hud.textes.ecran.scanEnCours), attente: true }
  }
</script>

<HudPanneau
  id="hud-cible"
  titre={hud.t(hud.textes.cible.titre)}
  allume={hud.estAllume(RANGS.cible)}
  flou={hud.flou}
>
  <p class="nom">{nom}</p>

  <dl class="fiche">
    {#each lignes as { ligne, rang } (ligne.cle)}
      {@const valeur = texteValeur(rang)}
      <div class="rang" class:attente={valeur.attente}>
        <dt>{hud.t(hud.textes.fiche[ligne.cle])}</dt>
        <dd>{valeur.texte}</dd>
      </div>
    {/each}
  </dl>
  {#if aSource}
    <p class="source">
      {remplir(hud.t(hud.textes.ecran.source), {
        source: hud.t(hud.textes.ecran.sourceNasa),
      })}
    </p>
  {/if}

  {#if estVisible(categoriesVisibles, 'distance')}
    <figure class="radar">
      <div class="disque">
        <GraphiqueCanvas
          dessiner={dessinRadar(() => vaisseau.etat)}
          visible={!hud.masque}
          priorite={1}
        />
      </div>
      <figcaption>{hud.t(hud.textes.ecran.legendeRadar)}</figcaption>
    </figure>
  {/if}
</HudPanneau>

<style>
  p {
    margin: 0;
  }

  .nom {
    font-size: 1.25em;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .fiche {
    display: grid;
    gap: 0.1rem;
    margin: 0;
  }

  .rang {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.6rem;
    line-height: 1.2;
  }

  dt {
    font-weight: 500;
  }

  dd {
    margin: 0;
    font-family: var(--hud-font-chiffres);
    text-align: right;
  }

  .attente dd {
    font-size: 14px;
    white-space: nowrap;
    font-family: var(--hud-font-titre);
    font-style: italic;
    opacity: 0.7;
  }

  .source {
    font-size: 14px;
    opacity: 0.75;
  }

  .radar {
    display: grid;
    justify-items: center;
    gap: 0.2rem;
    margin: 0;
  }

  .disque {
    width: min(100%, 5.5rem);
    aspect-ratio: 1;
  }

  figcaption {
    font-size: 14px;
    text-align: center;
    opacity: 0.75;
  }
</style>
