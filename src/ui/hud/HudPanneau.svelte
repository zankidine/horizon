<script lang="ts">
  import type { Snippet } from 'svelte'
  import HudCoins from './HudCoins.svelte'

  let {
    id,
    titre,
    prefixe = '',
    resume = '',
    allume = true,
    flou = false,
    repliable = false,
    sansCadre = false,
    ouvert = true,
    ontoggle,
    children,
  }: {
    id: string
    titre: string
    /** Début du nom lu par les lecteurs d'écran, non affiché. */
    prefixe?: string
    /** Valeur clé, visible quand le panneau est replié. */
    resume?: string
    /** Séquence d'allumage : faux tant que le panneau n'est pas allumé. */
    allume?: boolean
    /** Flou d'arrière-plan (limité à quelques panneaux). */
    flou?: boolean
    repliable?: boolean
    /** Dans une fenêtre : le cadre et le titre sont ceux de la fenêtre. */
    sansCadre?: boolean
    ouvert?: boolean
    ontoggle?: () => void
    children: Snippet
  } = $props()
</script>

<section
  class="panneau"
  class:allume={allume || sansCadre}
  class:flou={flou && !sansCadre}
  class:nu={sansCadre}
  class:replie={!ouvert}
>
  {#if !sansCadre}
    <HudCoins />
    <span class="balayage" aria-hidden="true"></span>
  {/if}

  {#if !sansCadre}
    <h2 class="entete">
      {#if repliable}
        <button
          type="button"
          class="bascule"
          aria-expanded={ouvert}
          aria-controls="{id}-corps"
          onclick={() => ontoggle?.()}
        >
          <span class="titre">{titre}</span>
          {#if !ouvert && resume}<span class="resume">{resume}</span>{/if}
          <svg
            class="fleche"
            viewBox="0 0 12 12"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M2 4.5 L6 8.5 L10 4.5" />
          </svg>
        </button>
      {:else}
        <span class="titre"
          >{#if prefixe}<span class="invisible">{prefixe}</span
            >{/if}{titre}</span
        >
      {/if}
    </h2>
  {/if}

  {#if ouvert}
    <div class="corps" id="{id}-corps">
      {@render children()}
    </div>
  {/if}
</section>

<style>
  .panneau {
    position: relative;
    box-sizing: border-box;
    width: 100%;
    overflow: hidden;
    border: var(--hud-epaisseur) solid var(--hud-bordure);
    border-radius: var(--hud-rayon);
    background: var(--hud-fond);
    box-shadow: 0 0 14px var(--hud-halo);
    color: var(--hud-texte);
    font-size: var(--txt-m);
    pointer-events: auto;
    /* Permet aux contenus de s'adapter à la largeur du panneau. */
    container-type: inline-size;
    /* Séquence d'allumage : seulement opacité et transform. */
    opacity: 0;
    transform: translateY(6px) scale(0.98);
    transition:
      opacity 320ms ease-out,
      transform 320ms ease-out;
  }

  /* Dans une fenêtre : ni cadre, ni fond, ni halo. */
  .panneau.nu {
    overflow: visible;
    border: 0;
    background: none;
    box-shadow: none;
  }

  .panneau.allume {
    opacity: 1;
    transform: none;
  }

  @supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)) {
    .flou {
      -webkit-backdrop-filter: blur(6px);
      backdrop-filter: blur(6px);
    }
  }

  /* Reflet qui balaie le panneau une fois à l'allumage. */
  .balayage {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(
      100deg,
      transparent 35%,
      color-mix(in srgb, var(--hud-ligne) 40%, transparent) 50%,
      transparent 65%
    );
    transform: translateX(-110%);
  }

  .allume .balayage {
    animation: balayer 900ms ease-out 120ms 1 both;
  }

  @keyframes balayer {
    from {
      transform: translateX(-110%);
    }
    to {
      transform: translateX(110%);
    }
  }

  .invisible {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  .entete {
    margin: 0;
    font-family: var(--hud-font-titre);
    font-size: var(--txt-m);
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--hud-ligne);
  }

  .titre {
    padding: var(--esp-2) var(--esp-3) var(--esp-1);
    white-space: nowrap;
  }

  .entete > .titre {
    display: block;
  }

  .bascule {
    display: flex;
    align-items: center;
    gap: var(--esp-2);
    box-sizing: border-box;
    width: 100%;
    min-height: var(--cible);
    padding: 0 var(--esp-3);
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    letter-spacing: inherit;
    text-align: left;
    text-transform: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .bascule .titre {
    padding: 0;
  }

  @media (hover: hover) {
    .bascule:hover {
      background: var(--hud-fond-actif);
    }
  }

  .bascule:focus-visible {
    outline: var(--hud-focus);
    outline-offset: var(--hud-focus-interieur);
  }

  .resume {
    margin-left: auto;
    font-family: var(--hud-font-chiffres);
    font-weight: 400;
    letter-spacing: 0;
    text-transform: none;
    color: var(--hud-texte);
  }

  .bascule .fleche {
    flex: none;
    width: 0.8rem;
    height: 0.8rem;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: transform 200ms;
  }

  .bascule[aria-expanded='false'] .fleche {
    transform: rotate(-90deg);
  }

  .resume + .fleche {
    margin-left: 0;
  }

  .bascule:not(:has(.resume)) .fleche {
    margin-left: auto;
  }

  .corps {
    display: grid;
    gap: var(--esp-2);
    padding: var(--esp-1) var(--esp-3) var(--esp-3);
  }

  /* Panneau étroit replié : le titre seul. */
  @container (max-width: 13rem) {
    .resume {
      display: none;
    }
  }

  /* Vitre basse : en-tête et marges resserrés. */
  @container hud (max-height: 270px) {
    .entete {
      letter-spacing: 0.06em;
    }

    .titre {
      padding-top: 0.25rem;
    }

    .corps {
      gap: var(--esp-1);
      padding-bottom: 0.4rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .panneau {
      transform: none;
      transition: opacity 150ms linear;
    }

    .balayage {
      display: none;
    }

    .bascule .fleche {
      transition: none;
    }
  }
</style>
