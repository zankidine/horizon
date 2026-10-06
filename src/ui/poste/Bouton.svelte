<script lang="ts">
  import { vibrer } from './retour'

  let {
    etiquette,
    variante = 'accent',
    onpresse,
  }: {
    etiquette: string
    variante?: 'accent' | 'warning'
    onpresse: () => void
  } = $props()
</script>

<button
  type="button"
  class="bouton {variante}"
  onclick={() => {
    vibrer(20)
    onpresse()
  }}
>
  <svg viewBox="0 0 56 56" aria-hidden="true" focusable="false">
    <circle class="collerette" cx="28" cy="28" r="26" />
    <g class="capuchon">
      <circle class="dessus" cx="28" cy="28" r="19" />
      <ellipse class="reflet" cx="22" cy="20" rx="9" ry="5" />
    </g>
  </svg>
  <span class="etiquette">{etiquette}</span>
</button>

<style>
  .bouton {
    display: grid;
    justify-items: center;
    gap: 2px;
    min-width: 44px;
    min-height: 44px;
    padding: 0;
    border: 0;
    border-radius: var(--radius);
    background: none;
    color: var(--poste-texte);
    font: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .bouton:focus-visible {
    outline: 3px solid var(--accent-2);
    outline-offset: 2px;
  }

  .accent {
    --couleur: var(--accent);
  }

  .warning {
    --couleur: var(--warning);
  }

  svg {
    width: clamp(44px, 8vmin, 58px);
    height: auto;
    overflow: visible;
  }

  .collerette {
    fill: url(#poste-metal);
    stroke: rgb(0 0 0 / 0.5);
    stroke-width: 1;
  }

  .dessus {
    fill: var(--couleur);
    stroke: rgb(0 0 0 / 0.35);
    stroke-width: 1;
  }

  .reflet {
    fill: rgb(255 255 255 / 0.4);
  }

  .capuchon {
    transform-origin: 28px 28px;
    transition:
      transform 90ms ease-out,
      filter 90ms ease-out;
    filter: drop-shadow(0 2px 0 rgb(0 0 0 / 0.4));
  }

  .bouton:active .capuchon {
    transform: translateY(2px) scale(0.94);
    filter: drop-shadow(0 0 0 rgb(0 0 0 / 0.4)) brightness(0.9);
  }

  .etiquette {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    line-height: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    .capuchon {
      transition: none;
    }
  }
</style>
