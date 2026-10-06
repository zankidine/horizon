<script lang="ts">
  import { positionReticule, type Ancre, type Boite } from '../../lib/hud'

  let {
    ancre,
    boite,
    etiquette,
    allume = true,
    etiquetteVisible = true,
    marge = 24,
  }: {
    /** Position en fractions de la vitre (0 à 1). */
    ancre: Ancre
    /** Taille de la vitre en pixels. */
    boite: Boite
    etiquette: string
    allume?: boolean
    /** Faux quand la vitre est trop petite pour l'étiquette. */
    etiquetteVisible?: boolean
    /** Distance minimale au bord quand la cible sort du cadre. */
    marge?: number
  } = $props()

  const position = $derived(positionReticule(ancre, boite, marge))
</script>

<div
  class="reticule"
  class:allume
  class:bord={!position.dansLeChamp}
  data-cote={position.cote}
  style:transform="translate({position.x}px, {position.y}px)"
>
  <svg viewBox="-24 -24 48 48" aria-hidden="true" focusable="false">
    {#if position.dansLeChamp}
      <circle r="13" />
      <circle class="point" r="1.6" />
      <path d="M-22 -10 V-22 H-10" />
      <path d="M10 -22 H22 V-10" />
      <path d="M22 10 V22 H10" />
      <path d="M-10 22 H-22 V10" />
    {:else}
      <g transform="rotate({position.angleDeg})">
        <path d="M6 -10 L18 0 L6 10" />
      </g>
    {/if}
  </svg>
  {#if position.dansLeChamp && etiquetteVisible}
    <span class="etiquette">{etiquette}</span>
  {/if}
</div>

<style>
  .reticule {
    position: absolute;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    pointer-events: none;
    opacity: 0;
    transition: opacity 400ms ease-out;
    will-change: transform;
  }

  .reticule.allume {
    opacity: 1;
  }

  svg {
    position: absolute;
    top: -1.6rem;
    left: -1.6rem;
    width: 3.2rem;
    height: 3.2rem;
    overflow: visible;
    fill: none;
    stroke: var(--hud-ligne);
    stroke-width: calc(var(--hud-epaisseur) * 1.5);
    stroke-linecap: round;
    stroke-linejoin: round;
    filter: drop-shadow(0 0 4px var(--hud-halo));
  }

  .point {
    fill: var(--hud-ligne);
  }

  .reticule.allume svg {
    animation: verrouiller 500ms ease-out both;
  }

  @keyframes verrouiller {
    from {
      opacity: 0;
      transform: scale(1.8);
    }
  }

  .etiquette {
    position: absolute;
    top: -0.9rem;
    box-sizing: border-box;
    max-width: 12rem;
    padding: 0.15rem 0.5rem;
    border: var(--hud-epaisseur) solid
      color-mix(in srgb, var(--hud-ligne) 60%, transparent);
    border-radius: calc(var(--hud-rayon) * 0.6);
    background: var(--hud-fond);
    color: var(--hud-texte);
    font-family: var(--hud-font-titre);
    font-size: max(14px, 0.95rem);
    font-weight: 700;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  [data-cote='droite'] .etiquette {
    left: 2rem;
  }

  [data-cote='gauche'] .etiquette {
    right: 2rem;
  }

  @media (prefers-reduced-motion: reduce) {
    .reticule {
      transition: opacity 150ms linear;
    }

    .reticule.allume svg {
      animation: none;
    }
  }
</style>
