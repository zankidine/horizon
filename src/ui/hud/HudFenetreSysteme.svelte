<script lang="ts">
  import type { Snippet } from 'svelte'
  import {
    fenetreVisible,
    cadrerFenetre,
    type ZonesSures,
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
    /** Taille de la vitre en pixels. */
    boite: Boite
    marge?: number
    flou?: boolean
    onfermer: () => void
    children?: Snippet
  } = $props()

  let hauteur = $state(0)
  let racine = $state<HTMLElement>()

  // Sonde invisible : le navigateur résout env(safe-area-inset-*) et rem pour nous.
  let sonde = $state<HTMLElement>()
  let sures = $state<ZonesSures>({ haut: 0, droite: 0, bas: 0, gauche: 0 })
  let remPx = $state(16)

  function lireSonde(): void {
    if (!sonde) return
    const style = getComputedStyle(sonde)
    sures = {
      haut: parseFloat(style.paddingTop) || 0,
      droite: parseFloat(style.paddingRight) || 0,
      bas: parseFloat(style.paddingBottom) || 0,
      gauche: parseFloat(style.paddingLeft) || 0,
    }
    remPx = parseFloat(style.fontSize) || 16
  }

  $effect(() => {
    void boite.largeur
    void boite.hauteur
    lireSonde()
  })

  /** Largeur souhaitée : 34 rem, ramenée à la zone utile. */
  const cadre = $derived(
    cadrerFenetre(boite, sures, { largeur: 34 * remPx, hauteur }, marge)
  )

  const TABULABLES =
    'a[href], button:not([disabled]), select, input, textarea, [tabindex]:not([tabindex="-1"])'

  /** Focus piégé : Tab et Maj+Tab bouclent dans la fenêtre. */
  function piegerFocus(evenement: KeyboardEvent): void {
    if (evenement.key !== 'Tab' || !racine) return
    const elements = [
      ...racine.querySelectorAll<HTMLElement>(TABULABLES),
    ].filter((e) => e.offsetParent !== null)
    if (elements.length === 0) {
      evenement.preventDefault()
      racine.focus()
      return
    }
    const premier = elements[0]
    const dernier = elements[elements.length - 1]
    const actif = document.activeElement
    if (evenement.shiftKey && (actif === premier || actif === racine)) {
      evenement.preventDefault()
      dernier.focus()
    } else if (!evenement.shiftKey && actif === dernier) {
      evenement.preventDefault()
      premier.focus()
    }
  }

  // À chaque ouverture, le focus entre dans la fenêtre : le clavier peut la fermer.
  $effect(() => {
    if (etat === 'ouverture') racine?.focus()
  })

  function surTouche(evenement: KeyboardEvent): void {
    if (evenement.key === 'Escape') {
      evenement.stopPropagation()
      onfermer()
      return
    }
    piegerFocus(evenement)
  }
</script>

<div class="sonde" bind:this={sonde} aria-hidden="true"></div>

{#if fenetreVisible(etat)}
  <!-- Clic à l'extérieur : le voile referme la fenêtre. -->
  <div
    class="voile"
    class:ferme={etat === 'fermeture'}
    style:--duree="{duree}ms"
    aria-hidden="true"
    onpointerdown={onfermer}
  ></div>
  <div
    {id}
    class="fenetre"
    class:flou
    role="dialog"
    aria-modal="true"
    aria-labelledby="{id}-entete {id}-titre"
    tabindex="-1"
    data-etat={etat}
    style:--duree="{duree}ms"
    style:transform="translate({cadre.x}px, {cadre.y}px)"
    style:width="{cadre.largeur}px"
    style:max-height="{cadre.hauteurMax}px"
    bind:this={racine}
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
    --epaisseur: var(--trait-epais);

    position: absolute;
    top: 0;
    left: 0;
    box-sizing: border-box;
    display: grid;
    grid-template-rows: minmax(0, 1fr);
    color: var(--hud-texte);
    font-size: var(--txt-m);
    pointer-events: auto;
  }

  /* Mesure les zones sûres et le rem : invisible, sans effet sur la mise en page. */
  .sonde {
    position: absolute;
    width: 0;
    height: 0;
    padding: env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px)
      env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px);
    font-size: 1rem;
    visibility: hidden;
    pointer-events: none;
  }

  .voile {
    position: absolute;
    inset: 0;
    background: rgb(0 0 0 / 0.35);
    pointer-events: auto;
    animation: voile-entrer var(--duree) ease-out both;
  }

  .voile.ferme {
    animation: voile-sortir var(--duree) ease-in both;
  }

  @keyframes voile-entrer {
    from {
      opacity: 0;
    }
  }

  @keyframes voile-sortir {
    to {
      opacity: 0;
    }
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
    padding: var(--esp-2) var(--esp-2) var(--esp-2) var(--esp-4);
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
    font-size: var(--txt-s);
    font-weight: 700;
    letter-spacing: 0.28em;
    color: var(--hud-ligne);
  }

  .titre {
    grid-area: titre;
    margin: 0;
    font-family: var(--hud-font-titre);
    font-size: var(--txt-l);
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  /* Vitre basse : en-tête sur une seule ligne. */
  @container hud (max-height: 270px) {
    header {
      grid-template-columns: auto minmax(0, 1fr) auto;
      grid-template-areas: 'entete titre fermer';
      column-gap: var(--esp-3);
      padding-block: var(--esp-1);
    }

    .titre {
      font-size: var(--txt-m);
    }

    .corps {
      padding-block: var(--esp-2) var(--esp-3);
    }
  }

  .corps {
    min-height: 0;
    overflow: auto;
    padding: var(--esp-3) var(--esp-4) var(--esp-4);
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
