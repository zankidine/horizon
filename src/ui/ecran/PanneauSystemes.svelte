<script lang="ts">
  import { estVisible, type Categorie } from '../../lib/categories'
  import { formaterNombre } from '../../lib/format-fr'
  import HudJauge from '../hud/HudJauge.svelte'
  import HudPanneau from '../hud/HudPanneau.svelte'
  import HudValeur from '../hud/HudValeur.svelte'
  import { RANGS } from '../hud/hud.svelte.ts'
  import {
    CREDITS_TEXTURES,
    REGLAGES_QUALITE,
    type EtatEcran,
  } from './ecran.svelte.ts'
  import GraphiqueCanvas from './GraphiqueCanvas.svelte'
  import { dessinOscilloscope, dessinSpectre } from './dessins'

  let {
    ecran,
    categoriesVisibles,
  }: {
    ecran: EtatEcran
    /** Grandeurs montrées selon le niveau de connaissance (tout par défaut). */
    categoriesVisibles?: readonly Categorie[]
  } = $props()

  const hud = $derived(ecran.hud)
  const pourcent = (fraction: number): number => Math.round(fraction * 100)
  const jauges = $derived([
    { id: 'energie', valeur: hud.demo.energie },
    { id: 'bouclier', valeur: hud.demo.bouclier },
  ] as const)
</script>

<HudPanneau
  id="hud-systemes"
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

  <div class="pied">
    <label class="qualite">
      <span class="invisible">Qualité graphique</span>
      <select
        value={ecran.hublot.reglage}
        onchange={(evenement) =>
          ecran.changerQualite(evenement.currentTarget.value)}
      >
        {#each REGLAGES_QUALITE as option (option.valeur)}
          <option value={option.valeur}>Qualité : {option.libelle}</option>
        {/each}
      </select>
    </label>
    <p class="credits">{CREDITS_TEXTURES.join(' · ')}</p>
  </div>
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
    height: 44px;
  }

  .trace.spectre {
    height: 38px;
  }

  .pied {
    display: grid;
    gap: 0.3rem;
  }

  .qualite select {
    box-sizing: border-box;
    width: 100%;
    min-height: 44px;
    padding: 0 0.5rem;
    border: var(--hud-epaisseur) solid
      color-mix(in srgb, var(--hud-ligne) 65%, transparent);
    border-radius: var(--hud-rayon);
    background: var(--hud-fond);
    color: var(--hud-texte);
    font: inherit;
  }

  .qualite select:focus-visible {
    outline: 3px solid var(--hud-texte);
    outline-offset: 2px;
  }

  .credits {
    font-size: 14px;
    line-height: 1.25;
    opacity: 0.7;
  }

  .invisible {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
</style>
