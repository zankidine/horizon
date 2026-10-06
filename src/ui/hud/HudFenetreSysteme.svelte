<script lang="ts">
  import type { Snippet } from 'svelte'
  import {
    fenetreVisible,
    positionFenetre,
    type Ancre,
    type Boite,
    type EtatFenetre,
  } from '../../lib/hud'
  import HudBouton from './HudBouton.svelte'
  import HudCoins from './HudCoins.svelte'
  import HudIcone from './HudIcone.svelte'

  let {
    id,
    entete,
    titre,
    libelleFermer,
    etat,
    duree,
    ancre,
    boite,
    marge = 8,
    flou = false,
    onfermer,
    children,
  }: {
    id: string
    /** Mot d'en-tête, « SYSTÈME ». */
    entete: string
    /** Nom du système affiché. */
    titre: string
    libelleFermer: string
    etat: EtatFenetre
    /** Durée de l'animation, en ms. */
    duree: number
    /** Centre de la fenêtre, en fractions de la vitre. */
    ancre: Ancre
    /** Taille de la vitre en pixels. */
    boite: Boite
    marge?: number
    flou?: boolean
    onfermer: () => void
    children?: Snippet
  } = $props()

  let largeur = $state(0)
  let hauteur = $state(0)
  let racine = $state<HTMLElement>()

  const position = $derived(
    positionFenetre(ancre, boite, { largeur, hauteur }, marge)
  )

  // À chaque ouverture, le focus entre dans la fenêtre : le clavier peut la fermer.
  $effect(() => {
    if (etat === 'ouverture') racine?.focus()
  })

  function surTouche(evenement: KeyboardEvent): void {
    if (evenement.key === 'Escape') {
      evenement.stopPropagation()
      onfermer()
    }
  }
</script>

{#if fenetreVisible(etat)}
  <div
    {id}
    class="fenetre"
    class:flou
    role="dialog"
    aria-modal="false"
    aria-labelledby="{id}-entete {id}-titre"
    tabindex="-1"
    data-etat={etat}
    style:--duree="{duree}ms"
    style:transform="translate({position.x}px, {position.y}px)"
    style:--marge="{marge}px"
    bind:this={racine}
    bind:clientWidth={largeur}
    bind:clientHeight={hauteur}
    onkeydown={surTouche}
  >
    <!-- Le cadre se trace d'abord, le contenu apparaît ensuite. -->
    <span class="trait haut" aria-hidden="true"></span>
    <span class="trait bas" aria-hidden="true"></span>
    <span class="trait gauche" aria-hidden="true"></span>
    <span class="trait droite" aria-hidden="true"></span>

    <div class="contenu">
      <HudCoins />
      <header>
        <p class="entete" id="{id}-entete">{entete}</p>
        <h2 class="titre" id="{id}-titre">{titre}</h2>
        <HudBouton etiquette={libelleFermer} onpresse={onfermer}>
          <HudIcone nom="fermer" />
        </HudBouton>
      </header>
      <div class="corps">{@render children?.()}</div>
    </div>
  </div>
{/if}

<style>
  .fenetre {
    --epaisseur: calc(var(--hud-epaisseur) * 1.5);

    position: absolute;
    top: 0;
    left: 0;
    box-sizing: border-box;
    width: min(34rem, calc(100% - 2 * var(--marge)));
    display: grid;
    grid-template-rows: minmax(0, 1fr);
    max-height: calc(100% - 2 * var(--marge));
    color: var(--hud-texte);
    font-size: max(14px, var(--hud-taille));
    pointer-events: auto;
  }

  .fenetre:focus-visible {
    outline: none;
  }

  .contenu {
    position: relative;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    min-height: 0;
    border-radius: var(--hud-rayon);
    background: var(--hud-fond);
    box-shadow: 0 0 22px var(--hud-halo);
  }

  @supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)) {
    .flou .contenu {
      -webkit-backdrop-filter: blur(8px);
      backdrop-filter: blur(8px);
    }
  }

  header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'entete fermer'
      'titre fermer';
    align-items: center;
    padding: 0.4rem 0.5rem 0.4rem 0.9rem;
    border-bottom: var(--hud-epaisseur) solid
      color-mix(in srgb, var(--hud-ligne) 45%, transparent);
  }

  header :global(.bouton) {
    grid-area: fermer;
  }

  .entete {
    grid-area: entete;
    margin: 0;
    font-family: var(--hud-font-titre);
    font-size: max(14px, 0.85rem);
    font-weight: 700;
    letter-spacing: 0.28em;
    color: var(--hud-ligne);
  }

  .titre {
    grid-area: titre;
    margin: 0;
    font-family: var(--hud-font-titre);
    font-size: 1.25em;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  /* Vitre basse : en-tête sur une seule ligne. */
  @container hud (max-height: 270px) {
    header {
      grid-template-columns: auto minmax(0, 1fr) auto;
      grid-template-areas: 'entete titre fermer';
      column-gap: 0.8rem;
      padding-block: 0.15rem;
    }

    .titre {
      font-size: 1.1em;
    }

    .corps {
      padding-block: 0.5rem 0.6rem;
    }
  }

  .corps {
    min-height: 0;
    overflow: auto;
    padding: 0.8rem 0.9rem 1rem;
  }

  /* Cadre : quatre traits qui grandissent depuis un coin (transform seulement). */
  .trait {
    position: absolute;
    z-index: 1;
    background: var(--hud-ligne);
    box-shadow: 0 0 8px var(--hud-halo);
    pointer-events: none;
  }

  .haut,
  .bas {
    left: 0;
    right: 0;
    height: var(--epaisseur);
  }

  .gauche,
  .droite {
    top: 0;
    bottom: 0;
    width: var(--epaisseur);
  }

  .haut {
    top: 0;
    transform-origin: left center;
  }

  .bas {
    bottom: 0;
    transform-origin: right center;
  }

  .gauche {
    left: 0;
    transform-origin: center bottom;
  }

  .droite {
    right: 0;
    transform-origin: center top;
  }

  .fenetre[data-etat='ouverture'] .haut,
  .fenetre[data-etat='ouverture'] .bas {
    animation: tracer-x calc(var(--duree) * 0.6) ease-out both;
  }

  .fenetre[data-etat='ouverture'] .gauche,
  .fenetre[data-etat='ouverture'] .droite {
    animation: tracer-y calc(var(--duree) * 0.6) ease-out both;
  }

  .fenetre[data-etat='ouverture'] .contenu {
    animation: apparaitre var(--duree) ease-out both;
  }

  .fenetre[data-etat='fermeture'] .trait,
  .fenetre[data-etat='fermeture'] .contenu {
    animation: disparaitre var(--duree) ease-in both;
  }

  @keyframes tracer-x {
    from {
      transform: scaleX(0);
    }
  }

  @keyframes tracer-y {
    from {
      transform: scaleY(0);
    }
  }

  /* Le fond et le contenu attendent que le cadre soit tracé. */
  @keyframes apparaitre {
    0%,
    45% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }

  @keyframes disparaitre {
    to {
      opacity: 0;
    }
  }

  /* Mouvement réduit : un simple fondu, sans tracé. */
  @media (prefers-reduced-motion: reduce) {
    .fenetre[data-etat='ouverture'] .trait {
      animation: none;
    }

    .fenetre[data-etat='ouverture'] .contenu {
      animation: fondu var(--duree) linear both;
    }

    @keyframes fondu {
      from {
        opacity: 0;
      }
    }
  }
</style>
