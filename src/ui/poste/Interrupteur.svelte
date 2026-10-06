<script lang="ts">
  import { vibrer } from './retour'

  let {
    etiquette,
    actif,
    onbascule,
  }: { etiquette: string; actif: boolean; onbascule: () => void } = $props()
</script>

<button
  type="button"
  role="switch"
  class="interrupteur"
  class:actif
  aria-checked={actif}
  onclick={() => {
    vibrer()
    onbascule()
  }}
>
  <svg viewBox="0 0 56 64" aria-hidden="true" focusable="false">
    <rect class="plaque" x="4" y="4" width="48" height="56" rx="12" />
    <rect class="fente" x="21" y="16" width="14" height="36" rx="7" />
    <circle class="voyant" cx="28" cy="10" r="2.6" />
    <g class="levier">
      <rect class="tige" x="25" y="18" width="6" height="16" />
      <circle class="boule" cx="28" cy="20" r="6.5" />
      <circle class="reflet" cx="26" cy="18" r="2" />
    </g>
  </svg>
  <span class="etiquette">{etiquette}</span>
</button>

<style>
  .interrupteur {
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

  .interrupteur:focus-visible {
    outline: 3px solid var(--accent);
    outline-offset: 2px;
  }

  svg {
    width: clamp(44px, 8vmin, 58px);
    height: auto;
    overflow: visible;
  }

  .plaque {
    fill: url(#poste-metal);
    stroke: rgb(0 0 0 / 0.45);
    stroke-width: 1;
  }

  .fente {
    fill: rgb(0 0 0 / 0.55);
  }

  .tige {
    fill: url(#poste-chrome);
  }

  .boule {
    fill: url(#poste-chrome);
    stroke: rgb(0 0 0 / 0.4);
    stroke-width: 0.8;
  }

  .reflet {
    fill: rgb(255 255 255 / 0.65);
  }

  .voyant {
    fill: var(--poste-voyant-eteint);
    stroke: rgb(0 0 0 / 0.4);
    stroke-width: 0.6;
  }

  .actif .voyant {
    fill: var(--accent-2);
    filter: drop-shadow(0 0 3px var(--accent-2));
  }

  /* Levier vers le haut : actif. Vers le bas : coupé. */
  .levier {
    transform-origin: 28px 34px;
    transform: rotate(180deg);
    transition: transform 160ms ease-out;
  }

  .actif .levier {
    transform: rotate(0deg);
  }

  .interrupteur:active .levier {
    transform: rotate(90deg);
  }

  .etiquette {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    line-height: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    .levier {
      transition: none;
    }
  }
</style>
