<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import HudAlerte from './HudAlerte.svelte'
  import HudBoussole from './HudBoussole.svelte'
  import HudBouton from './HudBouton.svelte'
  import HudFenetreSysteme from './HudFenetreSysteme.svelte'
  import HudIcone from './HudIcone.svelte'
  import HudJauge from './HudJauge.svelte'
  import HudPanneau from './HudPanneau.svelte'
  import HudReticule from './HudReticule.svelte'
  import HudValeur from './HudValeur.svelte'
  import { EtatHud, RANGS, type ContexteHud } from './hud.svelte.ts'

  let { contexte }: { contexte: ContexteHud } = $props()

  // svelte-ignore state_referenced_locally
  const hud = new EtatHud(contexte)
  const pourcent = (fraction: number): number => Math.round(fraction * 100)

  onMount(() => hud.demarrerAllumage())
  onDestroy(() => hud.arreter())
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

    <div class="zone statut">
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
        <div class="ligne">
          <span>{hud.t(hud.textes.statut.energie)}</span>
          <HudValeur
            valeur={pourcent(hud.demo.energie)}
            unite=" %"
            mouvementReduit={hud.mouvementReduit}
          />
        </div>
        <HudJauge
          etiquette={hud.t(hud.textes.statut.energie)}
          valeur={hud.demo.energie}
        />
        <div class="ligne">
          <span>{hud.t(hud.textes.statut.bouclier)}</span>
          <HudValeur
            valeur={pourcent(hud.demo.bouclier)}
            unite=" %"
            mouvementReduit={hud.mouvementReduit}
          />
        </div>
        <HudJauge
          etiquette={hud.t(hud.textes.statut.bouclier)}
          valeur={hud.demo.bouclier}
        />
        <div class="ligne arc">
          <span>{hud.t(hud.textes.statut.propulsion)}</span>
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
        </div>
      </HudPanneau>
    </div>

    <div class="zone cible">
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

    <div class="zone copilote">
      <HudPanneau
        id="hud-copilote"
        titre="{hud.t(hud.textes.copilote.titre)} · {hud.copilote}"
        allume={hud.estAllume(RANGS.copilote)}
      >
        <p class="detail">{hud.t(hud.textes.copilote.message)}</p>
      </HudPanneau>
    </div>

    <div class="zone icones" class:allume={hud.estAllume(RANGS.icones)}>
      {#each hud.idsSysteme as id (id)}
        <HudBouton
          etiquette={hud.t(hud.textes.icones[id])}
          libelleVisible={hud.disposition === 'paysage'}
          actif={hud.estSystemeOuvert(id)}
          controle="hud-systeme"
          onpresse={(declencheur) => hud.basculerSysteme(id, declencheur)}
        >
          <HudIcone nom={id} />
        </HudBouton>
      {/each}
    </div>
  </div>

  <!-- (b) Couche « monde » : réticules et fenêtres, ancrés dans la vitre. -->
  <div
    class="monde"
    class:cache={hud.masque}
    inert={hud.masque}
    bind:clientWidth={hud.largeur}
    bind:clientHeight={hud.hauteur}
  >
    <HudReticule
      ancre={hud.demo.ancreReticule}
      boite={{ largeur: hud.largeur, hauteur: hud.hauteur }}
      etiquette={hud.texteReticule}
      allume={hud.estAllume(RANGS.reticule)}
    />

    <div class="alerte">
      <HudAlerte
        visible={hud.alerte}
        message={hud.t(hud.textes.alerte.message)}
      />
    </div>

    <HudFenetreSysteme
      id="hud-systeme"
      entete={hud.t(hud.textes.systeme.entete)}
      titre={hud.t(hud.textes.icones[hud.systeme])}
      libelleFermer={hud.t(hud.textes.systeme.fermer)}
      etat={hud.fenetre.etat}
      duree={hud.fenetre.duree}
      ancre={hud.ancreFenetre}
      boite={{ largeur: hud.largeur, hauteur: hud.hauteur }}
      flou={hud.flou}
      onfermer={() => hud.fermerSysteme()}
    >
      <p class="vide">{hud.t(hud.textes.systeme.vide)}</p>
    </HudFenetreSysteme>
  </div>
</div>

<style>
  /*
   * La couche remplit la vitre (déjà à l'intérieur des zones sûres du poste).
   * Elle ne reçoit aucun toucher : seuls panneaux, boutons et fenêtres le font.
   */
  .hud {
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

  .tete,
  .monde {
    position: absolute;
    inset: 0;
    transition: opacity 250ms ease-out;
  }

  .tete {
    box-sizing: border-box;
    display: grid;
    gap: calc(var(--pad) * 0.6);
    padding: var(--haut) var(--pad) var(--pad);
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

  /* Paysage : statut à gauche, cible à droite, copilote en bas. */
  .hud[data-disposition='paysage'] .tete {
    grid-template-columns: minmax(0, 15rem) minmax(0, 1fr) minmax(0, 15rem);
    grid-template-rows: auto minmax(0, 1fr) auto;
    grid-template-areas:
      'statut cap cible'
      'statut . cible'
      '. copilote icones';
    padding-top: var(--pad);
  }

  /* Les colonnes latérales commencent sous les commandes du haut. */
  .hud[data-disposition='paysage'] .statut,
  .hud[data-disposition='paysage'] .cible {
    align-self: start;
    margin-top: calc(var(--haut) - var(--pad));
  }

  /* Portrait : panneaux empilés et repliables. */
  .hud[data-disposition='portrait'] .tete {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: auto auto auto minmax(0, 1fr) auto;
    grid-template-areas:
      'cap cap'
      'statut statut'
      'cible cible'
      '. .'
      'copilote icones';
    align-items: start;
  }

  .hud[data-disposition='portrait'] .statut,
  .hud[data-disposition='portrait'] .cible {
    max-width: 19rem;
  }

  .hud[data-disposition='portrait'] .copilote {
    align-self: end;
  }

  .ligne {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.6rem;
    font-weight: 500;
  }

  .ligne.arc {
    align-items: center;
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
    font-family: var(--hud-font-titre);
    font-weight: 500;
    line-height: 1.25;
  }

  .vide {
    margin: 0;
    font-weight: 500;
  }

  .alerte {
    position: absolute;
    top: var(--haut);
    left: 50%;
    z-index: 4;
    width: max-content;
    max-width: calc(100% - 2 * var(--pad));
    transform: translateX(-50%);
  }

  @media (prefers-reduced-motion: reduce) {
    .tete {
      transition: opacity 150ms linear;
    }

    .tete,
    .monde,
    .icones {
      transition-duration: 150ms;
    }
  }
</style>
