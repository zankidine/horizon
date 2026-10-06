<script lang="ts">
  // Zone toujours présente : les lecteurs d'écran annoncent le message
  // (poliment) dès qu'il apparaît, sans interrompre ce qu'ils lisent.
  let { message }: { message: string } = $props()
</script>

<div class="zone" role="status" aria-live="polite" aria-atomic="true">
  {#if message}
    <div class="alerte">
      <span class="pastille" aria-hidden="true"></span>
      {message}
    </div>
  {/if}
</div>

<style>
  .alerte {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    max-width: 100%;
    padding: 0.5rem 0.9rem;
    border: calc(var(--hud-epaisseur) * 1.5) solid var(--hud-alerte);
    border-radius: var(--hud-rayon);
    background: color-mix(in srgb, var(--hud-alerte) 24%, rgb(10 4 4 / 0.85));
    box-shadow: 0 0 16px color-mix(in srgb, var(--hud-alerte) 55%, transparent);
    color: var(--hud-texte);
    font-family: var(--hud-font-titre);
    font-size: max(14px, 1rem);
    font-weight: 700;
    letter-spacing: 0.04em;
    animation: entrer 220ms ease-out both;
    pointer-events: none;
  }

  .pastille {
    flex: none;
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 50%;
    background: var(--hud-alerte);
    animation: pulser 700ms ease-in-out infinite alternate;
  }

  @keyframes entrer {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
  }

  @keyframes pulser {
    from {
      opacity: 1;
    }
    to {
      opacity: 0.35;
    }
  }

  /* Mouvement réduit : un simple fondu, sans clignotement. */
  @media (prefers-reduced-motion: reduce) {
    .alerte {
      animation: fondu 150ms linear both;
    }

    .pastille {
      animation: none;
    }

    @keyframes fondu {
      from {
        opacity: 0;
      }
    }
  }
</style>
