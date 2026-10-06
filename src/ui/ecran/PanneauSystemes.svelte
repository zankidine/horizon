<script lang="ts">
  import { estVisible, type Categorie } from '../../lib/categories'
  import { formaterNombre } from '../../lib/format-fr'
  import HudJauge from '../hud/HudJauge.svelte'
  import HudPanneau from '../hud/HudPanneau.svelte'
  import HudValeur from '../hud/HudValeur.svelte'
  import { RANGS } from '../hud/hud.svelte.ts'
  import type { EtatEcran } from './ecran.svelte.ts'
  import PiedEcran from './PiedEcran.svelte'
  import GraphiqueCanvas from './GraphiqueCanvas.svelte'
  import { dessinOscilloscope, dessinSpectre } from './dessins'

  let {
    ecran,
    categoriesVisibles,
    avecPied = true,
    dansFenetre = false,
  }: {
    ecran: EtatEcran
    /** Réglage de qualité et crédits : dans le panneau, ou ailleurs en paysage. */
    avecPied?: boolean
    /** Grandeurs montrées selon le niveau de connaissance (tout par défaut). */
    categoriesVisibles?: readonly Categorie[]
    /** Affiché dans une fenêtre : sans cadre propre. */
    dansFenetre?: boolean
  } = $props()

  const hud = $derived(ecran.hud)
  const pourcent = (fraction: number): number => Math.round(fraction * 100)
  const jauges = $derived([
    { id: 'energie', valeur: hud.demo.energie },
    { id: 'bouclier', valeur: hud.demo.bouclier },
  ] as const)
</script>

<HudPanneau
  sansCadre={dansFenetre}
  id="hud-systemes{dansFenetre ? '-fenetre' : ''}"
  titre={hud.t(hud.textes.statut.titre)}
  allume={hud.estAllume(RANGS.systemes)}
  flou={false}
>
  <p class="simulation">{hud.t(hud.textes.ecran.simulation)}</p>

  <div class="jauges">
    <div class="barres">
      {#each jauges as jauge (jauge.id)}
        <div class="barre">
          <p class="ligne">
            <span>{hud.t(hud.textes.statut[jauge.id])}</span>
            <HudValeur
              valeur={pourcent(jauge.valeur)}
              unite=" %"
              mouvementReduit={hud.mouvementReduit}
            />
          </p>
          <HudJauge
            etiquette={hud.t(hud.textes.statut[jauge.id])}
            valeur={jauge.valeur}
          />
        </div>
      {/each}
    </div>
    <div class="arc">
      <HudJauge
        etiquette={hud.t(hud.textes.statut.propulsion)}
        valeur={hud.demo.propulsion}
        variante="arc"
      >
        <HudValeur
          valeur={pourcent(hud.demo.propulsion)}
          mouvementReduit={hud.mouvementReduit}
        />
      </HudJauge>
      <span class="legende">{hud.t(hud.textes.statut.propulsion)}</span>
    </div>
  </div>

  <figure class="graphe">
    <figcaption>{hud.t(hud.textes.statut.reacteur)}</figcaption>
    <div class="trace">
      <GraphiqueCanvas
        dessiner={dessinOscilloscope}
        visible={!hud.masque}
        priorite={3}
      />
    </div>
  </figure>

  <figure class="graphe">
    <figcaption>{hud.t(hud.textes.statut.signal)}</figcaption>
    <div class="trace spectre">
      <GraphiqueCanvas
        dessiner={dessinSpectre}
        visible={!hud.masque}
        priorite={4}
      />
    </div>
  </figure>

  {#if estVisible(categoriesVisibles, 'vitesse')}
    <p class="ligne reel">
      <span>{hud.t(hud.textes.ecran.vitesse)}</span>
      <span class="chiffres"
        >{formaterNombre(Math.round(ecran.vol.vitesseKmH))}&nbsp;km/h</span
      >
    </p>
  {/if}

  {#if avecPied}
    <PiedEcran {ecran} />
  {/if}
</HudPanneau>

<style>
  p {
    margin: 0;
  }

  .simulation {
    justify-self: end;
    font-size: 14px;
    font-style: italic;
    letter-spacing: 0.06em;
    opacity: 0.7;
  }

  .jauges {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.8rem;
  }

  .barres,
  .barre {
    display: grid;
    gap: 0.25rem;
  }

  .arc {
    display: grid;
    justify-items: center;
  }

  .ligne {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.6rem;
    font-weight: 500;
    line-height: 1.1;
  }

  .chiffres {
    font-family: var(--hud-font-chiffres);
  }

  .legende {
    font-weight: 500;
  }

  .graphe {
    display: grid;
    gap: 0.15rem;
    margin: 0;
  }

  figcaption {
    font-weight: 500;
    opacity: 0.85;
  }

  .trace {
    height: 36px;
  }

  .trace.spectre {
    height: 30px;
  }
</style>
