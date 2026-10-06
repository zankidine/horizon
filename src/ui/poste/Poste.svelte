<script lang="ts">
  import { onDestroy, type Snippet } from 'svelte'
  import Hud from '../hud/Hud.svelte'
  import HudFenetres from '../hud/HudFenetres.svelte'
  import { EtatHud } from '../hud/hud.svelte.ts'
  import VueExterieure from '../VueExterieure.svelte'
  import Bouton from './Bouton.svelte'
  import EcranProvisoire from './EcranProvisoire.svelte'
  import Interrupteur from './Interrupteur.svelte'
  import {
    CREDITS_TEXTURES,
    EtatPoste,
    PROFONDEURS,
    REGLAGES_QUALITE,
  } from './poste.svelte.ts'
  import Silhouettes from './Silhouettes.svelte'

  // Zones d'écran à brancher plus tard : sans contenu, un texte provisoire.
  let {
    ecranGauche,
    ecranDroit,
  }: { ecranGauche?: Snippet; ecranDroit?: Snippet } = $props()

  const poste = new EtatPoste()
  const hud = new EtatHud(poste)
  onDestroy(() => {
    hud.arreter()
    poste.arreter()
  })
</script>

<svelte:window onpointermove={(evenement) => poste.surPointeur(evenement)} />

<!-- Dégradés partagés par les dessins SVG du poste -->
<svg
  class="definitions"
  width="0"
  height="0"
  aria-hidden="true"
  focusable="false"
>
  <defs>
    <linearGradient id="poste-metal" x1="0" y1="0" x2="0" y2="1">
      <stop
        offset="0"
        style="stop-color: color-mix(in srgb, var(--cockpit-metal) 65%, white)"
      />
      <stop offset="0.55" style="stop-color: var(--cockpit-metal)" />
      <stop
        offset="1"
        style="stop-color: color-mix(in srgb, var(--cockpit-metal) 60%, black)"
      />
    </linearGradient>
    <linearGradient id="poste-chrome" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8d96a0" />
      <stop offset="0.35" stop-color="#f4f6f8" />
      <stop offset="1" stop-color="#6b737c" />
    </linearGradient>
    <linearGradient id="poste-cuir" x1="0" y1="0" x2="0" y2="1">
      <stop
        offset="0"
        style="stop-color: color-mix(in srgb, var(--poste-silhouette) 72%, white)"
      />
      <stop offset="1" style="stop-color: var(--poste-silhouette)" />
    </linearGradient>
    <linearGradient id="poste-lueur-ecran" x1="0" y1="1" x2="0" y2="0">
      <stop
        offset="0"
        style="stop-color: var(--poste-silhouette-lueur); stop-opacity: 0.55"
      />
      <stop
        offset="0.7"
        style="stop-color: var(--poste-silhouette-lueur); stop-opacity: 0"
      />
    </linearGradient>
  </defs>
</svg>

<main
  class="poste"
  data-disposition={poste.disposition}
  data-eclairage={poste.eclairage ? 'allume' : 'eteint'}
  style:--prop={poste.proportionVitre}
  bind:clientWidth={poste.largeur}
  bind:clientHeight={poste.hauteur}
>
  <h1 class="invisible">Poste de commandement</h1>

  <!-- (a) et (b) : la vue extérieure derrière la vitre panoramique -->
  <div class="baie" aria-hidden="false">
    <div class="interieur">
      <div class="couche vue" style:transform={poste.decalage(PROFONDEURS.vue)}>
        <VueExterieure etat={poste.hublot} />
      </div>

      <!-- Couche HUD : entre la vue et les montants de la vitre -->
      <div class="couche-hud">
        <Hud etat={hud} />
      </div>

      <div
        class="couche montants"
        aria-hidden="true"
        style:transform={poste.decalage(PROFONDEURS.vitre)}
      >
        <span class="montant premier"></span>
        <span class="montant second"></span>
      </div>

      <!-- Fenêtres système : elles flottent devant les montants -->
      <div class="couche-fenetres">
        <HudFenetres etat={hud} />
      </div>

      <div
        class="couche verre"
        aria-hidden="true"
        style:transform={poste.decalage(PROFONDEURS.vitre)}
      >
        <span class="reflet"></span>
        <svg class="rayures" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M8 30 L34 18" />
          <path d="M60 78 L92 64" />
          <path d="M72 14 L80 12" />
          <path d="M14 82 L22 79" />
          <path d="M44 52 L50 50" />
        </svg>
        <span class="vignette"></span>
      </div>
    </div>
  </div>

  <label class="qualite">
    <span class="invisible">Qualité graphique</span>
    <select
      value={poste.hublot.reglage}
      onchange={(evenement) =>
        poste.changerQualite(evenement.currentTarget.value)}
    >
      {#each REGLAGES_QUALITE as option (option.valeur)}
        <option value={option.valeur}>Qualité : {option.libelle}</option>
      {/each}
    </select>
  </label>

  <!-- (c) : tableau de bord, écrans et console -->
  <div
    class="couche tableau"
    style:transform={poste.decalage(PROFONDEURS.tableau)}
  >
    <div class="penombre" aria-hidden="true"></div>
    <div class="contenu">
      <section
        class="ecran gauche"
        class:eteint={!poste.ecransAllumes}
        aria-label="Écran de gauche"
        inert={!poste.ecransAllumes}
      >
        {#if ecranGauche}
          {@render ecranGauche()}
        {:else}
          <EcranProvisoire texte={poste.texteVeille} />
        {/if}
      </section>

      <section
        class="ecran droit"
        class:eteint={!poste.ecransAllumes}
        aria-label="Écran de droite"
        inert={!poste.ecransAllumes}
      >
        {#if ecranDroit}
          {@render ecranDroit()}
        {:else}
          <EcranProvisoire texte={poste.texteVeille} />
        {/if}
      </section>

      <section class="console" aria-label="Console de commande">
        <svg
          class="voyants"
          viewBox="0 0 60 8"
          aria-hidden="true"
          focusable="false"
        >
          <circle class="voyant" cx="6" cy="4" r="2.6" />
          <circle class="voyant allume" cx="18" cy="4" r="2.6" />
          <circle class="voyant allume orange" cx="30" cy="4" r="2.6" />
          <circle class="voyant" cx="42" cy="4" r="2.6" />
          <circle
            class="voyant alerte"
            class:actif={poste.alerte}
            cx="54"
            cy="4"
            r="2.6"
          />
        </svg>

        {#if poste.inclinaisonDisponible}
          <Interrupteur
            etiquette="Inclinaison"
            actif={poste.inclinaisonActive}
            onbascule={() => poste.basculerInclinaison()}
          />
        {/if}
        <Interrupteur
          etiquette="Éclairage"
          actif={poste.eclairage}
          onbascule={() => poste.basculerEclairage()}
        />
        <Interrupteur
          etiquette="Écrans"
          actif={poste.ecransAllumes}
          onbascule={() => poste.basculerEcrans()}
        />
        <Bouton
          etiquette="Appel"
          variante="accent"
          onpresse={() => poste.declencherAlerte()}
        />
        <Bouton
          etiquette="Alerte"
          variante="warning"
          onpresse={() => poste.declencherAlerte()}
        />
      </section>
    </div>
  </div>

  <!-- (d) : équipiers de dos et accoudoirs -->
  <Silhouettes decalage={poste.decalage(PROFONDEURS.premierPlan)} />

  <p class="credits">{CREDITS_TEXTURES.join(' · ')}</p>
</main>

<style>
  .definitions {
    position: absolute;
    width: 0;
    height: 0;
  }

  .invisible {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .poste {
    --sa-t: env(safe-area-inset-top, 0px);
    --sa-r: env(safe-area-inset-right, 0px);
    --sa-b: env(safe-area-inset-bottom, 0px);
    --sa-l: env(safe-area-inset-left, 0px);
    --prop: 0.6;
    --marge: clamp(8px, 1.8vmin, 20px);
    --bord: clamp(7px, 1.7vmin, 16px);
    --ledge: clamp(14px, 3.2vmin, 32px);
    --rayon-baie: clamp(28px, 9vmin, 80px);
    --fig: clamp(60px, min(13vw, 24dvh), 150px);
    --accoudoir: max(80px, min(20vw, 34dvh));

    position: relative;
    width: 100%;
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
    background: var(--cockpit-bg);
    color: var(--poste-texte);
    font-family: var(--font-ui);
    user-select: none;
    -webkit-user-select: none;
    touch-action: manipulation;
  }

  .couche {
    transition: transform 120ms ease-out;
    will-change: transform;
  }

  /* (b) Baie : cadre métallique épais, coins arrondis. */
  .baie {
    position: absolute;
    top: calc(var(--sa-t) + var(--marge));
    left: calc(var(--sa-l) + var(--marge));
    right: calc(var(--sa-r) + var(--marge));
    height: calc(
      var(--prop) * 100% - var(--sa-t) - var(--marge) - var(--ledge) * 0.4
    );
    border: var(--bord) solid transparent;
    border-radius: var(--rayon-baie);
    background: linear-gradient(
        145deg,
        color-mix(in srgb, var(--cockpit-metal) 55%, white),
        var(--cockpit-metal) 45%,
        color-mix(in srgb, var(--cockpit-metal) 55%, black)
      )
      border-box;
    box-shadow:
      0 8px 20px var(--poste-ombre),
      0 0 0 2px rgb(0 0 0 / 0.35);
  }

  .interieur {
    /* Le HUD adapte sa mise en page à la hauteur de la vitre (@container hud). */
    container: hud / size;
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: calc(var(--rayon-baie) - var(--bord));
    background: #000;
    isolation: isolate;
  }

  /* (a) Vue extérieure, un peu plus grande que la vitre pour la profondeur. */
  .vue {
    position: absolute;
    inset: -12px;
  }

  .couche-hud,
  .couche-fenetres {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  /*
   * Portrait : la vitre est petite et les montants couperaient les panneaux.
   * Le HUD passe devant les montants, sous les reflets du verre.
   */
  .poste[data-disposition='portrait'] .couche-hud {
    z-index: 1;
  }

  .poste[data-disposition='portrait'] .verre,
  .poste[data-disposition='portrait'] .couche-fenetres {
    z-index: 2;
  }

  .montants,
  .verre {
    position: absolute;
    inset: -10px;
    pointer-events: none;
  }

  .montant {
    position: absolute;
    top: 0;
    bottom: 0;
    width: clamp(16px, 4.6vmin, 44px);
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--poste-montant) 60%, black),
      var(--poste-montant) 45%,
      color-mix(in srgb, var(--poste-montant) 55%, black)
    );
    /* Plus large en bas : les montants convergent vers le haut. */
    clip-path: polygon(22% 0, 78% 0, 100% 100%, 0 100%);
    box-shadow: 0 0 12px rgb(0 0 0 / 0.5);
  }

  .premier {
    left: 33%;
  }

  .second {
    left: 66%;
  }

  .reflet {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(
        115deg,
        transparent 0 12%,
        var(--vitre-reflet) 12% 19%,
        transparent 19% 24%,
        var(--vitre-reflet) 24% 26%,
        transparent 26%
      ),
      linear-gradient(180deg, var(--vitre-reflet), transparent 28%);
  }

  .rayures {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    fill: none;
    stroke: rgb(255 255 255 / 0.14);
    stroke-width: 0.8;
    stroke-linecap: round;
    vector-effect: non-scaling-stroke;
  }

  .rayures :global(path) {
    vector-effect: non-scaling-stroke;
  }

  .vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse at 50% 50%,
      transparent 52%,
      rgb(0 0 0 / 0.35) 100%
    );
    box-shadow: inset 0 0 22px rgb(0 0 0 / 0.5);
  }

  /* Réglage de qualité : petit menu natif, accessible, par-dessus la vitre. */
  .qualite {
    position: absolute;
    z-index: 6;
    top: calc(var(--sa-t) + var(--marge) + var(--bord) + 6px);
    right: calc(var(--sa-r) + var(--marge) + var(--bord) + 6px);
  }

  .qualite select {
    min-height: 44px;
    padding: 0 0.7rem;
    border: 1px solid rgb(255 255 255 / 0.25);
    border-radius: 999px;
    background: rgb(0 0 0 / 0.5);
    color: #eef2f6;
    font: inherit;
    font-size: 0.78rem;
    cursor: pointer;
  }

  .qualite select:focus-visible {
    outline: 3px solid var(--accent);
    outline-offset: 2px;
  }

  /* (c) Tableau de bord. */
  .tableau {
    position: absolute;
    left: -8px;
    right: -8px;
    top: calc(var(--prop) * 100% - var(--ledge));
    bottom: -8px;
    border-radius: clamp(18px, 5vmin, 44px) clamp(18px, 5vmin, 44px) 0 0;
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--cockpit-metal) 80%, white) 0,
      var(--cockpit-metal) calc(var(--ledge) * 0.5),
      color-mix(in srgb, var(--cockpit-bg) 82%, var(--cockpit-metal))
        calc(var(--ledge) * 1.2),
      var(--cockpit-bg)
    );
    box-shadow:
      0 -6px 16px var(--poste-ombre),
      inset 0 2px 0 rgb(255 255 255 / 0.3);
  }

  .penombre {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: rgb(5 5 25 / 0.5);
    opacity: 0;
    transition: opacity 300ms;
    pointer-events: none;
  }

  .poste[data-eclairage='eteint'] .penombre {
    opacity: 1;
  }

  .contenu {
    position: absolute;
    inset: 8px;
    display: grid;
    gap: clamp(8px, 2vmin, 20px);
    padding: calc(var(--ledge) + 6px) calc(var(--sa-r) + var(--marge))
      calc(var(--sa-b) + 30px) calc(var(--sa-l) + var(--marge));
  }

  .poste[data-disposition='paysage'] .contenu {
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.6fr) minmax(0, 0.8fr);
    grid-template-areas: 'gauche console droit';
  }

  .poste[data-disposition='portrait'] .contenu {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) auto;
    grid-template-areas:
      'gauche droit'
      'console console';
    /* Place pour les accoudoirs en bas du cadre. */
    padding-bottom: calc(var(--sa-b) + 30px + clamp(0px, 4vmin, 24px));
  }

  .gauche {
    grid-area: gauche;
  }

  .droit {
    grid-area: droit;
  }

  .ecran {
    position: relative;
    min-height: 0;
    overflow: hidden;
    padding: 0.55rem 0.7rem;
    border: clamp(4px, 1vmin, 9px) solid var(--cockpit-metal);
    border-radius: var(--radius);
    background: var(--screen-bg);
    color: var(--screen-text);
    box-shadow:
      inset 0 0 22px color-mix(in srgb, var(--accent-2) 28%, transparent),
      0 0 0 2px rgb(0 0 0 / 0.4),
      0 6px 14px var(--poste-ombre);
    transition: background-color 200ms;
  }

  /* Fines lignes d'écran, purement décoratives. */
  .ecran::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: repeating-linear-gradient(
      180deg,
      transparent 0 2px,
      rgb(0 0 0 / 0.12) 2px 3px
    );
  }

  .ecran.eteint {
    background: #000;
    box-shadow:
      inset 0 0 8px rgb(0 0 0 / 0.8),
      0 0 0 2px rgb(0 0 0 / 0.4);
  }

  .ecran.eteint > :global(*) {
    visibility: hidden;
  }

  .console {
    grid-area: console;
    display: flex;
    flex-wrap: wrap;
    align-content: center;
    align-items: center;
    justify-content: center;
    gap: 4px clamp(8px, 2vmin, 16px);
    padding: 6px clamp(8px, 2vmin, 16px) 8px;
    border: 2px solid rgb(0 0 0 / 0.4);
    border-radius: var(--radius);
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--cockpit-metal) 75%, white),
      var(--cockpit-metal) 50%,
      color-mix(in srgb, var(--cockpit-metal) 70%, black)
    );
    box-shadow:
      inset 0 2px 0 rgb(255 255 255 / 0.3),
      0 6px 14px var(--poste-ombre);
  }

  .poste[data-disposition='paysage'] .console {
    flex-wrap: nowrap;
    flex-direction: row;
  }

  .poste[data-disposition='paysage'] .voyants {
    position: absolute;
    top: 6px;
    left: 50%;
    flex-basis: auto;
    transform: translateX(-50%);
  }

  .poste[data-disposition='paysage'] .console {
    position: relative;
    padding-top: 18px;
  }

  .voyants {
    flex-basis: 100%;
    width: 64px;
    height: 8px;
    overflow: visible;
  }

  .voyant {
    fill: var(--poste-voyant-eteint);
    stroke: rgb(0 0 0 / 0.4);
    stroke-width: 0.5;
  }

  .voyant.allume {
    fill: var(--accent-2);
    filter: drop-shadow(0 0 2px var(--accent-2));
  }

  .voyant.orange {
    fill: var(--accent);
    filter: drop-shadow(0 0 2px var(--accent));
  }

  .voyant.alerte.actif {
    fill: var(--warning);
    filter: drop-shadow(0 0 3px var(--warning));
    animation: clignote 400ms steps(2, jump-none) infinite;
  }

  @keyframes clignote {
    50% {
      opacity: 0.25;
    }
  }

  .credits {
    position: absolute;
    z-index: 5;
    left: calc(var(--sa-l) + var(--accoudoir));
    right: calc(var(--sa-r) + var(--accoudoir));
    bottom: calc(var(--sa-b) + 3px);
    text-wrap: balance;
    margin: 0;
    /* Police condensée du HUD : les crédits tiennent sur trois lignes au plus. */
    font-family: var(--hud-font-titre, inherit);
    font-size: 0.7rem;
    line-height: 1.25;
    text-align: center;
    color: var(--poste-texte);
    opacity: 0.7;
    pointer-events: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .couche,
    .ecran,
    .penombre {
      transition: none;
    }

    .voyant.alerte.actif {
      animation: none;
    }
  }
</style>
