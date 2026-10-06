<script lang="ts">
  import HudAlerte from './HudAlerte.svelte'
  import HudFenetreSysteme from './HudFenetreSysteme.svelte'
  import type { EtatHud } from './hud.svelte.ts'

  // Couche des fenêtres et alertes : elle flotte devant la vitre, montants compris.
  let { etat: hud }: { etat: EtatHud } = $props()

  const boite = $derived({ largeur: hud.largeur, hauteur: hud.hauteur })
</script>

<div class="fenetres" class:cache={hud.masque} inert={hud.masque}>
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
    {boite}
    flou={hud.flou}
    onfermer={() => hud.fermerSysteme()}
  >
    <p class="vide">{hud.t(hud.textes.systeme.vide)}</p>
  </HudFenetreSysteme>
</div>

<style>
  .fenetres {
    --pad: clamp(8px, 2vmin, 16px);
    --haut: calc(44px + var(--pad));

    position: absolute;
    inset: 0;
    pointer-events: none;
    font-family: var(--hud-font-titre);
    transition: opacity 250ms ease-out;
  }

  .cache {
    opacity: 0;
  }

  .alerte {
    position: absolute;
    top: var(--haut);
    left: 50%;
    width: max-content;
    max-width: calc(100% - 2 * var(--pad));
    transform: translateX(-50%);
  }

  .vide {
    margin: 0;
    font-weight: 500;
  }

  @media (prefers-reduced-motion: reduce) {
    .fenetres {
      transition-duration: 150ms;
    }
  }
</style>
