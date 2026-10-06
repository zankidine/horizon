<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import type { Categorie } from '../../lib/categories'
  import { remplir } from '../../lib/format-fr'
  import { formaterValeurFiche } from '../../lib/fiche-format'
  import HudFenetres from '../hud/HudFenetres.svelte'
  import HudReticule from '../hud/HudReticule.svelte'
  import { RANGS, type IdPanneau, type IdSysteme } from '../hud/hud.svelte.ts'
  import VueExterieure from '../VueExterieure.svelte'
  import BarreHaute from './BarreHaute.svelte'
  import { EtatEcran } from './ecran.svelte.ts'
  import { moteur } from './moteur.svelte.ts'
  import PanneauCible from './PanneauCible.svelte'
  import PanneauCopilote from './PanneauCopilote.svelte'
  import PanneauSystemes from './PanneauSystemes.svelte'
  import PanneauTrajet from './PanneauTrajet.svelte'
  import Verre from './Verre.svelte'
  import { appStore } from '../../lib/stores/app.svelte'

  /** Grandeurs montrées selon le niveau de connaissance : tout par défaut. */
  let { categoriesVisibles }: { categoriesVisibles?: readonly Categorie[] } =
    $props()

  const ecran = new EtatEcran()
  const hud = ecran.hud
  const boite = $derived({ largeur: ecran.largeur, hauteur: ecran.hauteur })
  const reticule = $derived(ecran.ancreReticule)
  const nomCible = $derived(hud.t(hud.textes.cibles[ecran.cible]))
  const distance = $derived(
    formaterValeurFiche({ nombre: ecran.vol.distanceCibleKm, unite: 'km' })
  )

  onMount(() => {
    ecran.demarrer()
    hud.demarrerAllumage()
    if (import.meta.env.DEV) {
      void import('../dev/monter-stats').then((m) => m.monterPanneauStats())
    }
  })
  onDestroy(() => ecran.arreter())

  // Qualité, mouvement réduit et ambiance : le moteur de graphes s'y adapte.
  $effect(() => {
    void appStore.ambianceCockpit
    void ecran.niveauQualite
    void ecran.mouvementReduit
    ecran.synchroniserMoteur()
  })

  // Le HUD masqué met les graphes en pause.
  $effect(() => {
    void hud.masque
    void ecran.miseEnPage
    moteur.reveiller()
  })

  // Une fenêtre ouverte rend le reste inerte : focus et clavier restent dans la fenêtre.
  const fenetreOuverte = $derived(hud.fenetreVisible)

  const TIROIRS_HAUT: readonly IdPanneau[] = ['systemes', 'cible']
</script>

<svelte:window
  onkeydown={(evenement) => hud.surTouche(evenement)}
  onpointermove={(evenement) => ecran.surPointeur(evenement)}
/>

{#snippet chip(id: IdPanneau)}
  <button
    type="button"
    class="chip"
    class:actif={hud.estSystemeOuvert(id)}
    aria-expanded={hud.estSystemeOuvert(id)}
    aria-controls="hud-systeme"
    onclick={(evenement) => hud.basculerSysteme(id, evenement.currentTarget)}
  >
    {hud.titreFenetre(id)}
  </button>
{/snippet}

{#snippet contenuFenetre(id: IdSysteme)}
  {#if id === 'systemes'}
    <PanneauSystemes {ecran} {categoriesVisibles} dansFenetre />
  {:else if id === 'cible'}
    <PanneauCible {ecran} {categoriesVisibles} dansFenetre />
  {:else if id === 'trajet'}
    <PanneauTrajet {ecran} {categoriesVisibles} dansFenetre />
  {/if}
{/snippet}

<main
  class="ecran"
  data-mise-en-page={ecran.miseEnPage}
  data-qualite={ecran.niveauQualite}
  style:--tete={hud.transformTete}
  bind:clientWidth={ecran.largeur}
  bind:clientHeight={ecran.hauteur}
>
  <h1 class="invisible">{hud.t(hud.textes.hud.groupe)}</h1>

  <!-- La vue 3D occupe tout l'écran : le HUD ne fait que flotter devant. -->
  <div class="vue"><VueExterieure etat={ecran.hublot} /></div>

  <Verre niveau={ecran.niveauQualite} />

  <!-- Couche « monde » : réticule posé sur la vraie direction de la cible. -->
  <div
    class="monde"
    class:cache={hud.masque}
    inert={hud.masque || fenetreOuverte}
  >
    <HudReticule
      ancre={reticule}
      {boite}
      etiquette={remplir(hud.t(hud.textes.cible.reticule), { nom: nomCible })}
      etiquetteVisible={ecran.miseEnPage === 'paysage'}
      allume={hud.estAllume(RANGS.reticule)}
    />
  </div>

  <div
    class="hud"
    role="group"
    aria-label={hud.t(hud.textes.hud.groupe)}
    data-masque={hud.masque}
    inert={fenetreOuverte}
  >
    <div class="rangee-haut">
      <!-- Commande toujours disponible, même quand le reste est caché. -->
      <button
        type="button"
        class="masquer"
        aria-pressed={hud.masque}
        aria-keyshortcuts="H"
        onclick={() => hud.basculerMasque()}
      >
        {hud.t(hud.masque ? hud.textes.hud.afficher : hud.textes.hud.masquer)}
      </button>

      {#if ecran.miseEnPage === 'portrait'}
        <div class="chips haut" class:cache={hud.masque} inert={hud.masque}>
          {#each TIROIRS_HAUT as id (id)}{@render chip(id)}{/each}
        </div>
      {:else}
        <div class="zone barre" class:cache={hud.masque} inert={hud.masque}>
          <BarreHaute {ecran} />
        </div>
      {/if}
    </div>

    {#if ecran.miseEnPage === 'portrait'}
      <div class="zone barre" class:cache={hud.masque} inert={hud.masque}>
        <BarreHaute {ecran} />
      </div>
    {/if}

    {#if ecran.miseEnPage === 'paysage'}
      <aside
        class="zone colonne gauche"
        class:cache={hud.masque}
        inert={hud.masque}
      >
        <PanneauSystemes {ecran} {categoriesVisibles} avecPied={false} />
        <PanneauTrajet {ecran} {categoriesVisibles} />
      </aside>
      <aside
        class="zone colonne droite"
        class:cache={hud.masque}
        inert={hud.masque}
      >
        <PanneauCible {ecran} {categoriesVisibles} />
      </aside>
      <div class="zone chips-zone" class:cache={hud.masque} inert={hud.masque}>
        {#each hud.idsPanneaux as id (id)}{@render chip(id)}{/each}
      </div>
    {:else}
      {#if ecran.miseEnPage === 'compact'}
        <!-- Petit panneau cible : nom, distance, avancement du scan. -->
        <section
          class="zone mini-cible"
          class:cache={hud.masque}
          inert={hud.masque}
        >
          <p class="mini-nom">{nomCible}</p>
          <p class="mini-distance">{distance}</p>
          <p class="mini-scan">
            {ecran.scan.termine
              ? hud.t(hud.textes.cible.titre)
              : hud.t(hud.textes.ecran.scanEnCours)}
          </p>
        </section>
      {/if}
    {/if}

    <div class="zone bas" class:cache={hud.masque} inert={hud.masque}>
      {#if ecran.miseEnPage === 'paysage'}
        <PanneauCopilote {ecran} />
      {:else}
        <p class="copilote-ligne">
          <span class="invisible">{hud.t(hud.textes.copilote.prefixe)}</span>
          <strong>{ecran.copilote}</strong> : {hud.t(
            hud.textes.copilote.message
          )}
        </p>
        <PanneauCopilote {ecran} actionsSeules>
          {#snippet chips()}
            {#if ecran.miseEnPage === 'compact'}
              {#each TIROIRS_HAUT as id (id)}{@render chip(id)}{/each}
            {/if}
            {@render chip('trajet')}
          {/snippet}
        </PanneauCopilote>
      {/if}
    </div>
  </div>

  <HudFenetres etat={hud} contenu={contenuFenetre} />
</main>

<style>
  .ecran {
    --pad: clamp(8px, 2vmin, 16px);
    --sa-t: env(safe-area-inset-top, 0px);
    --sa-r: env(safe-area-inset-right, 0px);
    --sa-b: env(safe-area-inset-bottom, 0px);
    --sa-l: env(safe-area-inset-left, 0px);
    --colonne: clamp(12rem, 17vw, 15rem);

    position: relative;
    width: 100%;
    height: 100dvh;
    overflow: hidden;
    background: #000;
    container: hud / size;
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

  .vue,
  .monde,
  .hud {
    position: absolute;
    inset: 0;
  }

  .monde {
    pointer-events: none;
    transition: opacity 250ms ease-out;
  }

  /* Le HUD ne reçoit aucun toucher en dehors de ses panneaux et boutons. */
  .hud {
    box-sizing: border-box;
    display: grid;
    gap: calc(var(--pad) * 0.6);
    padding: max(var(--pad), var(--sa-t)) max(var(--pad), var(--sa-r))
      max(var(--pad), var(--sa-b)) max(var(--pad), var(--sa-l));
    font-family: var(--hud-font-titre);
    pointer-events: none;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
    /* Aberration chromatique légère, sur les textes seulement. */
    text-shadow:
      -0.5px 0 color-mix(in srgb, var(--role-alerte) 30%, transparent),
      0.5px 0 color-mix(in srgb, var(--role-info) 30%, transparent);
  }

  .zone,
  .chips {
    min-width: 0;
    min-height: 0;
    /* Légère inertie du HUD qui suit le regard. */
    transform: var(--tete, none);
    transition:
      transform 380ms ease-out,
      opacity 250ms ease-out;
  }

  .cache {
    opacity: 0;
  }

  .rangee-haut {
    display: flex;
    align-items: center;
    gap: var(--pad);
    min-width: 0;
  }

  .rangee-haut .barre {
    flex: 1 1 0;
  }

  .masquer,
  .chip {
    box-sizing: border-box;
    min-width: var(--cible);
    min-height: var(--cible);
    padding: 0 var(--esp-4);
    border: var(--hud-epaisseur) solid var(--hud-bordure);
    border-radius: var(--hud-rayon);
    background: var(--hud-fond);
    color: var(--hud-texte);
    font-family: var(--hud-font-titre);
    font-size: var(--txt-m);
    font-weight: 700;
    letter-spacing: 0.05em;
    cursor: pointer;
    pointer-events: auto;
    -webkit-tap-highlight-color: transparent;
  }

  .masquer {
    flex: none;
    z-index: 5;
  }

  .chip {
    border-radius: var(--hud-rayon);
    padding: 0 var(--esp-3);
  }

  .chip.actif {
    background: var(--hud-fond-actif);
  }

  @media (hover: hover) {
    .masquer:hover,
    .chip:hover {
      background: var(--hud-fond-actif);
    }
  }

  .masquer:focus-visible,
  .chip:focus-visible {
    outline: var(--hud-focus);
    outline-offset: var(--hud-focus-decalage);
  }

  .chips {
    display: flex;
    gap: var(--esp-2);
  }

  /* --- Paysage : colonnes à gauche et à droite, centre libre ------------------ */
  .ecran[data-mise-en-page='paysage'] .hud {
    grid-template-columns: var(--colonne) minmax(0, 1fr) var(--colonne);
    grid-template-rows: auto minmax(0, 1fr) auto;
    grid-template-areas:
      'haut haut haut'
      'gauche . droite'
      'pied bas .';
  }

  .ecran[data-mise-en-page='paysage'] .rangee-haut {
    grid-area: haut;
  }

  .ecran[data-mise-en-page='paysage'] .colonne {
    align-self: start;
    display: grid;
    align-content: start;
    gap: calc(var(--pad) * 0.6);
    max-height: 100%;
    overflow-y: auto;
    scrollbar-width: thin;
  }

  .ecran[data-mise-en-page='paysage'] .gauche {
    grid-area: gauche;
  }

  .ecran[data-mise-en-page='paysage'] .droite {
    grid-area: droite;
  }

  .ecran[data-mise-en-page='paysage'] .chips-zone {
    grid-area: pied;
    align-self: end;
    display: flex;
    flex-wrap: wrap;
    gap: var(--esp-2);
  }

  .ecran[data-mise-en-page='paysage'] .bas {
    grid-area: bas;
    justify-self: center;
    width: min(100%, 34rem);
  }

  /* --- Portrait : boutons de fenêtres en haut et en bas, centre libre ------- */
  .ecran[data-mise-en-page='portrait'] .hud {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto auto minmax(0, 1fr) auto;
  }

  .ecran[data-mise-en-page='portrait'] .bas {
    grid-row: 4;
  }

  /* --- Compact : téléphone en paysage, le centre reste libre ------------------ */
  .ecran[data-mise-en-page='compact'] .hud {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: var(--esp-1);
  }

  .ecran[data-mise-en-page='compact'] .mini-cible {
    grid-row: 2;
    align-self: start;
    justify-self: start;
    box-sizing: border-box;
    width: 10.5rem;
    padding: var(--esp-1) var(--esp-3);
    border: var(--hud-epaisseur) solid var(--hud-bordure);
    border-radius: var(--hud-rayon);
    background: var(--hud-fond);
    color: var(--hud-texte);
    font-size: var(--txt-s);
    line-height: 1.2;
  }

  .mini-cible p {
    margin: 0;
  }

  .mini-nom {
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--hud-ligne);
  }

  .mini-scan {
    font-style: italic;
    color: var(--hud-texte-doux);
  }

  .ecran[data-mise-en-page='compact'] .bas {
    grid-row: 3;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--pad);
  }

  .copilote-ligne {
    box-sizing: border-box;
    margin: 0 0 0.3rem;
    padding: var(--esp-1) var(--esp-3);
    border: var(--hud-epaisseur) solid var(--hud-bordure);
    border-radius: var(--hud-rayon);
    background: var(--hud-fond);
    color: var(--hud-texte);
    font-size: var(--txt-s);
    font-weight: 500;
    line-height: 1.2;
    pointer-events: auto;
  }

  .ecran[data-mise-en-page='compact'] .copilote-ligne {
    flex: 0 1 18rem;
    min-width: 5rem;
    margin: 0;
  }

  .ecran[data-mise-en-page='compact'] .bas :global(.actions) {
    flex: none;
    flex-wrap: nowrap;
  }

  .ecran[data-mise-en-page='portrait'] .bas {
    display: grid;
    gap: var(--esp-1);
  }

  @media (prefers-reduced-motion: reduce) {
    .zone,
    .chips,
    .monde {
      transition: opacity 150ms linear;
    }
  }
</style>
