<script lang="ts">
  // Premier plan : deux équipiers vus de dos et les accoudoirs du siège du
  // commandant. Purement décoratif : ni souris, ni clavier, ni lecteur d'écran.
  let { decalage }: { decalage: string } = $props()
</script>

<div class="premier-plan" aria-hidden="true" style:transform={decalage}>
  <!-- Pilote : casque audio -->
  <svg class="figure pilote" viewBox="0 0 100 120" focusable="false">
    <rect class="corps" x="14" y="54" width="72" height="66" rx="20" />
    <path
      class="corps"
      d="M8 110 V98 C8 80 22 70 40 67 H60 C78 70 92 80 92 98 V110 Q92 120 82 120 H18 Q8 120 8 110 Z"
    />
    <rect class="corps" x="43" y="46" width="14" height="26" rx="6" />
    <ellipse class="corps" cx="50" cy="32" rx="16" ry="19" />
    <rect class="corps" x="29" y="27" width="6" height="14" rx="3" />
    <rect class="corps" x="65" y="27" width="6" height="14" rx="3" />
    <path
      class="corps"
      d="M34 28 C35 8 65 8 66 28"
      fill="none"
      stroke-width="3.5"
      stroke="var(--poste-silhouette)"
    />
    <path
      class="lueur-ecran"
      d="M8 110 V98 C8 80 22 70 40 67 H60 C78 70 92 80 92 98 V110 Q92 120 82 120 H18 Q8 120 8 110 Z"
    />
    <path class="lumiere" d="M9 100 C10 82 24 72 40 68.5" />
    <path class="lumiere" d="M91 100 C90 82 76 72 60 68.5" />
    <path class="lumiere" d="M35 25 C37 11 63 11 65 25" />
  </svg>

  <!-- Ingénieur : cheveux relevés -->
  <svg class="figure ingenieur" viewBox="0 0 100 120" focusable="false">
    <rect class="corps" x="16" y="56" width="68" height="64" rx="18" />
    <path
      class="corps"
      d="M12 110 V100 C12 82 24 71 40 68 H60 C76 71 88 82 88 100 V110 Q88 120 78 120 H22 Q12 120 12 110 Z"
    />
    <rect class="corps" x="44" y="48" width="12" height="24" rx="6" />
    <ellipse class="corps" cx="50" cy="35" rx="15" ry="18" />
    <circle class="corps" cx="50" cy="14" r="9" />
    <path
      class="lueur-ecran"
      d="M12 110 V100 C12 82 24 71 40 68 H60 C76 71 88 82 88 100 V110 Q88 120 78 120 H22 Q12 120 12 110 Z"
    />
    <path class="lumiere" d="M13 102 C14 84 25 73 40 69.5" />
    <path class="lumiere" d="M87 102 C86 84 75 73 60 69.5" />
    <path class="lumiere" d="M36 24 C38 12 62 12 64 24" />
  </svg>

  <!-- Accoudoirs du siège du commandant -->
  <svg class="accoudoir gauche" viewBox="0 0 120 56" focusable="false">
    <path
      class="cuir"
      d="M0 56 V26 C0 15 8 11 18 10 L88 3 C108 1 118 10 119 26 V56 Z"
    />
    <path class="lumiere-cuir" d="M3 24 C4 15 10 12 19 11.5 L88 4.5" />
    <path class="couture" d="M10 40 H112" />
  </svg>
  <svg class="accoudoir droit" viewBox="0 0 120 56" focusable="false">
    <path
      class="cuir"
      d="M0 56 V26 C0 15 8 11 18 10 L88 3 C108 1 118 10 119 26 V56 Z"
    />
    <path class="lumiere-cuir" d="M3 24 C4 15 10 12 19 11.5 L88 4.5" />
    <path class="couture" d="M10 40 H112" />
  </svg>
</div>

<style>
  .premier-plan {
    position: absolute;
    inset: 0;
    pointer-events: none;
    transition: transform 120ms ease-out;
    will-change: transform;
  }

  .figure {
    --x: 27%;
    position: absolute;
    left: var(--x);
    width: var(--fig);
    height: auto;
    top: calc(var(--prop) * 100% + var(--ledge) * 0.5 - var(--fig) * 1.2);
    transform: translateX(-50%);
    overflow: visible;
  }

  .pilote {
    --x: 27%;
  }

  .ingenieur {
    --x: 73%;
  }

  :global([data-disposition='portrait']) .pilote {
    --x: 24%;
  }

  :global([data-disposition='portrait']) .ingenieur {
    --x: 76%;
  }

  .corps {
    fill: var(--poste-silhouette);
  }

  /* Lueur des écrans, montant du bas vers les épaules. */
  .lueur-ecran {
    fill: url(#poste-lueur-ecran);
  }

  /* Lumière extérieure, froide, sur le haut des contours. */
  .lumiere {
    fill: none;
    stroke: rgb(190 215 255 / 0.6);
    stroke-width: 1.6;
    stroke-linecap: round;
  }

  .accoudoir {
    position: absolute;
    bottom: -4px;
    width: var(--accoudoir);
    height: auto;
    overflow: visible;
  }

  .gauche {
    left: -4px;
  }

  .droit {
    right: -4px;
    transform: scaleX(-1);
  }

  .cuir {
    fill: url(#poste-cuir);
  }

  .lumiere-cuir {
    fill: none;
    stroke: var(--poste-silhouette-lueur);
    stroke-width: 1.4;
    stroke-linecap: round;
    opacity: 0.7;
  }

  .couture {
    fill: none;
    stroke: rgb(255 255 255 / 0.22);
    stroke-width: 0.8;
    stroke-dasharray: 3 3;
  }

  @media (prefers-reduced-motion: reduce) {
    .premier-plan {
      transition: none;
    }
  }
</style>
