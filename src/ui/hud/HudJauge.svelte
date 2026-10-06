<script lang="ts">
  import type { Snippet } from 'svelte'
  import { arcJauge, fractionJauge, niveauJauge } from '../../lib/hud'

  let {
    etiquette,
    valeur,
    variante = 'barre',
    avertir = true,
    children,
  }: {
    etiquette: string
    /** Entre 0 et 1. */
    valeur: number
    variante?: 'barre' | 'arc'
    /** Colore la jauge en alerte quand elle est presque vide (faux pour un avancement). */
    avertir?: boolean
    /** Texte au centre de l'arc. */
    children?: Snippet
  } = $props()

  const fraction = $derived(fractionJauge(valeur))
  const niveau = $derived(avertir ? niveauJauge(fraction) : 'normal')

  const RAYON = 26
  const arc = $derived(arcJauge(fraction, RAYON))
</script>

{#if variante === 'barre'}
  <div
    class="barre"
    class:bas={niveau === 'bas'}
    role="meter"
    aria-label={etiquette}
    aria-valuemin="0"
    aria-valuemax="100"
    aria-valuenow={Math.round(fraction * 100)}
  >
    <span class="remplissage" style:transform="scaleX({fraction})"></span>
  </div>
{:else}
  <div
    class="arc"
    class:bas={niveau === 'bas'}
    role="meter"
    aria-label={etiquette}
    aria-valuemin="0"
    aria-valuemax="100"
    aria-valuenow={Math.round(fraction * 100)}
  >
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <g transform="rotate({arc.rotationDeg} 32 32)">
        <circle
          class="fond"
          cx="32"
          cy="32"
          r={RAYON}
          stroke-dasharray="{arc.longueur} 1000"
        />
        <circle
          class="rempli"
          cx="32"
          cy="32"
          r={RAYON}
          stroke-dasharray="{arc.rempli} 1000"
        />
      </g>
    </svg>
    <span class="centre">{@render children?.()}</span>
  </div>
{/if}

<style>
  .barre {
    position: relative;
    height: calc(0.45rem + var(--hud-epaisseur));
    overflow: hidden;
    border: var(--hud-epaisseur) solid
      color-mix(in srgb, var(--hud-ligne) 55%, transparent);
    border-radius: 999px;
    background: rgb(0 0 0 / 0.35);
  }

  .remplissage {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: var(--hud-ligne);
    box-shadow: 0 0 8px var(--hud-halo);
    transform-origin: left center;
    transition: transform 500ms ease-out;
  }

  .bas .remplissage {
    background: var(--hud-alerte);
  }

  .arc {
    position: relative;
    width: 4.2rem;
    height: 4.2rem;
  }

  .arc svg {
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .arc circle {
    fill: none;
    stroke-linecap: round;
    stroke-width: calc(2.5px + var(--hud-epaisseur) * 1.5);
  }

  .fond {
    stroke: color-mix(in srgb, var(--hud-ligne) 25%, transparent);
  }

  .rempli {
    stroke: var(--hud-ligne);
    filter: drop-shadow(0 0 3px var(--hud-halo));
  }

  .bas .rempli {
    stroke: var(--hud-alerte);
  }

  .centre {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-size: max(14px, 0.9rem);
  }

  @media (prefers-reduced-motion: reduce) {
    .remplissage {
      transition: none;
    }
  }
</style>
