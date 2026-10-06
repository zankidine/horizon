<script lang="ts">
  import HudAlerte from './HudAlerte.svelte'
  import HudFenetreSysteme from './HudFenetreSysteme.svelte'
  import type { Snippet } from 'svelte'
  import type { EtatHud, IdSysteme } from './hud.svelte.ts'

  // Couche des fenêtres et alertes : elle flotte devant tout le reste.
  let {
    etat: hud,
    contenu,
  }: {
    etat: EtatHud
    /** Contenu de chaque fenêtre ; absent, le texte « vide » s'affiche. */
    contenu?: Snippet<[IdSysteme]>
  } = $props()

  const boite = $derived({ largeur: hud.largeur, hauteur: hud.hauteur })
</script>

<div class="fenetres" class:cache={hud.masque} inert={hud.masque}>
  <div class="alerte">
    <HudAlerte message={hud.alerte} />
  </div>

  <HudFenetreSysteme
    id="hud-systeme"
    entete={hud.t(hud.textes.systeme.entete)}
    titre={hud.titreFenetre(hud.systeme)}
    libelleFermer={hud.t(hud.textes.systeme.fermer)}
    etat={hud.fenetre.etat}
    duree={hud.fenetre.duree}
    {boite}
    flou={hud.flou}
    onfermer={() => hud.fermerSysteme()}
  >
    {#if contenu && (hud.idsPanneaux as readonly string[]).includes(hud.systeme)}
      {@render contenu(hud.systeme)}
    {:else}
      <p class="vide">{hud.t(hud.textes.systeme.vide)}</p>
    {/if}
  </HudFenetreSysteme>
</div>

<style>
  .fenetres {
    --pad: clamp(8px, 2vmin, 16px);
    --haut: calc(var(--cible) + var(--pad));

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
    top: 62%;
    left: 50%;
    width: max-content;
    max-width: calc(100% - 2 * var(--pad));
    transform: translate(-50%, -50%);
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
