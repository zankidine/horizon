<script lang="ts">
  import type { Snippet } from 'svelte'
  import { vibrer } from './retour'

  let {
    etiquette,
    libelleVisible = false,
    actif = false,
    controle,
    onpresse,
    children,
  }: {
    /** Nom accessible du bouton. */
    etiquette: string
    /** Affiche aussi l'étiquette sous l'icône. */
    libelleVisible?: boolean
    /** Fenêtre ouverte par ce bouton (aria-expanded). */
    actif?: boolean
    /** Identifiant de la fenêtre contrôlée. */
    controle?: string
    // eslint-disable-next-line no-unused-vars
    onpresse: (declencheur: HTMLButtonElement) => void
    children: Snippet
  } = $props()
</script>

<button
  type="button"
  class="bouton"
  class:actif
  aria-label={libelleVisible ? undefined : etiquette}
  aria-expanded={controle ? actif : undefined}
  aria-controls={controle}
  onclick={(evenement) => {
    vibrer(15)
    onpresse(evenement.currentTarget)
  }}
>
  <span class="icone">{@render children()}</span>
  {#if libelleVisible}<span class="libelle">{etiquette}</span>{/if}
</button>

<style>
  .bouton {
    display: grid;
    justify-items: center;
    align-content: center;
    gap: var(--esp-1);
    box-sizing: border-box;
    min-width: var(--cible);
    min-height: var(--cible);
    padding: var(--esp-1) var(--esp-2);
    border: var(--hud-epaisseur) solid var(--hud-bordure);
    border-radius: var(--hud-rayon);
    background: var(--hud-fond);
    box-shadow: 0 0 10px var(--hud-halo);
    color: var(--hud-ligne);
    font-family: var(--hud-font-titre);
    font-size: var(--txt-s);
    font-weight: 700;
    letter-spacing: 0.06em;
    cursor: pointer;
    pointer-events: auto;
    -webkit-tap-highlight-color: transparent;
    transition:
      opacity 150ms,
      transform 150ms;
  }

  .bouton:hover,
  .bouton.actif {
    background: var(--hud-fond-actif);
    color: var(--hud-texte);
  }

  .bouton:active {
    transform: scale(0.95);
  }

  .bouton:focus-visible {
    outline: var(--hud-focus);
    outline-offset: var(--hud-focus-decalage);
  }

  .icone {
    display: grid;
    width: 1.5rem;
    height: 1.5rem;
  }

  .icone :global(svg) {
    width: 100%;
    height: 100%;
    fill: none;
    stroke: currentColor;
    stroke-width: calc(1.2px + var(--hud-epaisseur) * 0.5);
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .libelle {
    text-transform: uppercase;
    white-space: nowrap;
  }

  @media (prefers-reduced-motion: reduce) {
    .bouton {
      transition: none;
    }

    .bouton:active {
      transform: none;
    }
  }
</style>
