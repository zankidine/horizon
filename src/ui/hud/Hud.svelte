<script lang="ts">
  import { onMount } from 'svelte'
  import HudBoussole from './HudBoussole.svelte'
  import HudBouton from './HudBouton.svelte'
  import HudIcone from './HudIcone.svelte'
  import HudJauge from './HudJauge.svelte'
  import HudPanneau from './HudPanneau.svelte'
  import HudReticule from './HudReticule.svelte'
  import HudValeur from './HudValeur.svelte'
  import { RANGS, type EtatHud } from './hud.svelte.ts'

  // L'état est créé par le poste : les fenêtres, dans une autre couche, le partagent.
  let { etat: hud }: { etat: EtatHud } = $props()
  const pourcent = (fraction: number): number => Math.round(fraction * 100)
  const boite = $derived({ largeur: hud.largeur, hauteur: hud.hauteur })

  onMount(() => hud.demarrerAllumage())
</script>

<svelte:window onkeydown={(evenement) => hud.surTouche(evenement)} />

<div
  class="hud"
  data-disposition={hud.disposition}
  data-masque={hud.masque}
  role="group"
  aria-label={hud.t(hud.textes.hud.groupe)}
>
  <!-- Commande toujours disponible, même quand le reste est caché. -->
  <button
    type="button"
    class="masquer"
    aria-pressed={hud.masque}
    aria-keyshortcuts="H"
    onclick={() => hud.basculerMasque()}
  >
    {hud.t(hud.masque ? hud.textes.hud.afficher : hud.textes.hud.masquer)}
  </button>

  <!-- (b) Couche « monde » : réticules ancrés à des points de la vitre. -->
  <div
    class="monde"
    class:cache={hud.masque}
    inert={hud.masque}
    bind:clientWidth={hud.largeur}
    bind:clientHeight={hud.hauteur}
  >
    <HudReticule
      ancre={hud.ancreReticule}
      {boite}
      etiquette={hud.texteReticule}
      etiquetteVisible={hud.etiquetteReticuleVisible}
      allume={hud.estAllume(RANGS.reticule)}
    />
  </div>

  <!-- (a) Couche « tête » : fixée à la vitre, avec une très légère inertie. -->
  <div
    class="tete"
    class:cache={hud.masque}
    inert={hud.masque}
    style:transform={hud.transformTete}
    style:--inertie="{hud.inertieMs}ms"
  >
    <div class="zone cap">
      <HudBoussole
        titre={hud.t(hud.textes.cap.titre)}
        cap={hud.cap}
        allume={hud.estAllume(RANGS.cap)}
        mouvementReduit={hud.mouvementReduit}
      />
    </div>

    <div class="pile">
      <div class="zone statut" class:ouvert={hud.estOuvert('statut')}>
        <HudPanneau
          id="hud-statut"
          titre={hud.t(hud.textes.statut.titre)}
          resume="{pourcent(hud.demo.energie)} %"
          allume={hud.estAllume(RANGS.statut)}
          flou={hud.flou}
          repliable={hud.disposition === 'portrait'}
          ouvert={hud.estOuvert('statut')}
          ontoggle={() => hud.basculerPanneau('statut')}
        >
          <div class="jauges">
            <div class="barres">
              {#each [{ id: 'energie', valeur: hud.demo.energie }, { id: 'bouclier', valeur: hud.demo.bouclier }] as jauge (jauge.id)}
                <div class="barre">
                  <p class="ligne">
                    <span
                      >{hud.t(
                        hud.textes.statut[jauge.id as 'energie' | 'bouclier']
                      )}</span
                    >
                    <HudValeur
                      valeur={pourcent(jauge.valeur)}
                      unite=" %"
                      mouvementReduit={hud.mouvementReduit}
                    />
                  </p>
                  <HudJauge
                    etiquette={hud.t(
                      hud.textes.statut[jauge.id as 'energie' | 'bouclier']
                    )}
                    valeur={jauge.valeur}
                  />
                </div>
              {/each}
              <!-- Étroit : propulsion en barre. -->
              <div class="barre propulsion-barre">
                <p class="ligne">
                  <span>{hud.t(hud.textes.statut.propulsion)}</span>
                  <HudValeur
                    valeur={pourcent(hud.demo.propulsion)}
                    unite=" %"
                    mouvementReduit={hud.mouvementReduit}
                  />
                </p>
                <HudJauge
                  etiquette={hud.t(hud.textes.statut.propulsion)}
                  valeur={hud.demo.propulsion}
                />
              </div>
            </div>
            <!-- Large : propulsion en arc. -->
            <div class="propulsion-arc">
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
        </HudPanneau>
      </div>

      <div class="zone cible" class:ouvert={hud.estOuvert('cible')}>
        <HudPanneau
          id="hud-cible"
          titre={hud.t(hud.textes.cible.titre)}
          resume={hud.nomCible}
          allume={hud.estAllume(RANGS.cible)}
          flou={hud.flou}
          repliable={hud.disposition === 'portrait'}
          ouvert={hud.estOuvert('cible')}
          ontoggle={() => hud.basculerPanneau('cible')}
        >
          <p class="nom-cible">{hud.nomCible}</p>
          <p class="detail">{hud.texteDistance}</p>
        </HudPanneau>
      </div>
    </div>

    <div class="zone copilote">
      <HudPanneau
        id="hud-copilote"
        prefixe={hud.prefixeCopilote}
        titre={hud.copilote}
        allume={hud.estAllume(RANGS.copilote)}
      >
        <p class="detail court">{hud.t(hud.textes.copilote.message)}</p>
      </HudPanneau>
    </div>

    <div class="zone icones" class:allume={hud.estAllume(RANGS.icones)}>
      {#each hud.idsSysteme as id (id)}
        <HudBouton
          etiquette={hud.t(hud.textes.icones[id])}
          libelleVisible={hud.libellesIcones}
          actif={hud.estSystemeOuvert(id)}
          controle="hud-systeme"
          onpresse={(declencheur) => hud.basculerSysteme(id, declencheur)}
        >
          <HudIcone nom={id} />
        </HudBouton>
      {/each}
    </div>
  </div>
</div>

<style>
  /*
   * La couche remplit la vitre, déjà à l'intérieur des zones sûres du poste.
   * Elle ne reçoit aucun toucher : seuls panneaux, boutons et fenêtres le font.
   */
  .hud {
    /* Les silhouettes de l'équipage montent dans le bas de la vitre. */
    --tete: calc(var(--fig, 80px) * 0.75);
    /* Colonnes latérales du paysage : elles s'arrêtent avant les silhouettes. */
    --colonne: clamp(9rem, calc(27vw - var(--fig, 80px) / 2 - 44px), 15rem);
    --pad: clamp(8px, 2vmin, 16px);
    --haut: calc(44px + var(--pad));

    position: absolute;
    inset: 0;
    pointer-events: none;
    font-family: var(--hud-font-titre);
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }

  .masquer {
    position: absolute;
    z-index: 5;
    top: var(--pad);
    left: var(--pad);
    box-sizing: border-box;
    min-width: 44px;
    min-height: 44px;
    padding: 0 0.9rem;
    border: var(--hud-epaisseur) solid
      color-mix(in srgb, var(--hud-ligne) 65%, transparent);
    border-radius: 999px;
    background: var(--hud-fond);
    color: var(--hud-texte);
    font-family: var(--hud-font-titre);
    font-size: max(14px, 0.95rem);
    font-weight: 700;
    letter-spacing: 0.05em;
    cursor: pointer;
    pointer-events: auto;
    -webkit-tap-highlight-color: transparent;
  }

  .masquer:focus-visible {
    outline: 3px solid var(--hud-texte);
    outline-offset: 2px;
  }

  .monde,
  .tete {
    position: absolute;
    inset: 0;
    transition: opacity 250ms ease-out;
  }

  .monde {
    pointer-events: none;
  }

  .tete {
    box-sizing: border-box;
    display: grid;
    gap: calc(var(--pad) * 0.6);
    padding: var(--pad);
    /* Inertie : le décalage rattrape le pointeur avec un léger retard. */
    transition:
      transform var(--inertie, 380ms) ease-out,
      opacity 250ms ease-out;
    will-change: transform;
  }

  .cache {
    opacity: 0;
  }

  .zone {
    min-width: 0;
    min-height: 0;
  }

  .cap {
    grid-area: cap;
    justify-self: center;
    align-self: start;
  }

  /* Paysage : les deux panneaux sont des cases directes de la grille. */
  .pile {
    display: contents;
  }

  .statut {
    grid-area: statut;
  }

  .cible {
    grid-area: cible;
  }

  .copilote {
    grid-area: copilote;
    align-self: end;
  }

  .icones {
    grid-area: icones;
    display: flex;
    gap: 0.4rem;
    align-self: end;
    justify-self: end;
    opacity: 0;
    transition: opacity 320ms ease-out;
  }

  .icones.allume {
    opacity: 1;
  }

  /* Paysage : statut à gauche, cible à droite, copilote en bas, cap en haut. */
  .hud[data-disposition='paysage'] .tete {
    grid-template-columns: var(--colonne) minmax(0, 1fr) var(--colonne);
    grid-template-rows: auto minmax(0, 1fr) auto;
    grid-template-areas:
      'statut cap cible'
      'statut . cible'
      'statut copilote icones';
  }

  /* Les colonnes commencent sous les commandes du haut et défilent si la vitre est trop basse. */
  .hud[data-disposition='paysage'] .statut,
  .hud[data-disposition='paysage'] .cible {
    align-self: start;
    max-height: calc(100% - var(--haut) + var(--pad));
    margin-top: calc(var(--haut) - var(--pad));
    overflow-y: auto;
    scrollbar-width: thin;
  }

  /* Vitre basse (téléphone en paysage) : texte à 14 px et panneaux resserrés. */
  @container hud (max-height: 270px) {
    .tete {
      --hud-taille: 0.875rem;
      gap: 4px;
    }

    .jauges,
    .barres {
      gap: 0.2rem;
    }
  }

  /* Entre les deux montants de la vitre (à 33 % et 66 %). */
  .hud[data-disposition='paysage'] .copilote {
    justify-self: center;
    width: min(100%, 31vw);
  }

  /* Portrait : panneaux empilés et repliables, au-dessus des silhouettes. */
  .hud[data-disposition='portrait'] .tete {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: auto auto minmax(0, 1fr) auto;
    grid-template-areas:
      'cap cap'
      'pile pile'
      '. .'
      'copilote icones';
    align-items: start;
    padding-top: var(--haut);
    padding-bottom: calc(var(--pad) + var(--tete));
  }

  .hud[data-disposition='portrait'] .cap {
    justify-self: start;
  }

  /* Deux boutons côte à côte ; un panneau ouvert prend toute la largeur. */
  .hud[data-disposition='portrait'] .pile {
    grid-area: pile;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
    align-items: start;
    max-height: 100%;
    overflow-y: auto;
    scrollbar-width: thin;
  }

  .hud[data-disposition='portrait'] .statut,
  .hud[data-disposition='portrait'] .cible {
    grid-area: auto;
  }

  .hud[data-disposition='portrait'] .zone.ouvert {
    grid-column: 1 / -1;
  }

  .hud[data-disposition='portrait'] .copilote,
  .hud[data-disposition='portrait'] .icones {
    align-self: end;
  }

  /* Jauges : en étroit, trois barres ; en large, deux barres et un arc. */
  .jauges {
    display: grid;
    gap: 0.4rem;
  }

  .barres {
    display: grid;
    gap: 0.3rem;
  }

  .barre {
    display: grid;
    gap: 0.15rem;
  }

  .propulsion-arc {
    display: none;
  }

  @container (min-width: 15rem) {
    .jauges {
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 0.8rem;
    }

    .propulsion-barre {
      display: none;
    }

    .propulsion-arc {
      display: grid;
      justify-items: center;
    }
  }

  .ligne {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.6rem;
    margin: 0;
    font-weight: 500;
    line-height: 1.1;
  }

  .legende {
    font-weight: 500;
  }

  .nom-cible {
    margin: 0;
    font-size: 1.25em;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .detail {
    margin: 0;
    font-weight: 500;
    line-height: 1.2;
  }

  .court {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
  }

  @media (prefers-reduced-motion: reduce) {
    .tete {
      transition: opacity 150ms linear;
    }

    .monde,
    .icones {
      transition-duration: 150ms;
    }
  }
</style>
