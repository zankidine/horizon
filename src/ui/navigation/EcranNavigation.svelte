<script lang="ts">
  import { EtatNavigation, type SurConfirmer } from './navigation.svelte'

  let { onConfirmer }: { onConfirmer: SurConfirmer } = $props()

  const etat = new EtatNavigation((cap) => onConfirmer(cap))
</script>

<section class="navigation" aria-labelledby="nav-titre">
  <h1 id="nav-titre">{etat.vue.titre}</h1>

  <div class="colonnes">
    <div class="choix">
      <h2>{etat.vue.choixDestination}</h2>
      <ul class="liste">
        {#each etat.vue.destinations as destination (destination.id)}
          <li>
            <button
              type="button"
              class="carte"
              class:choisie={destination.choisie}
              aria-pressed={destination.choisie}
              disabled={!destination.active}
              onclick={() => etat.choisirDestination(destination.id)}
            >
              <span class="nom">{destination.nom}</span>
              {#if destination.etiquette}
                <span class="etiquette">{destination.etiquette}</span>
              {/if}
              <span class="description">{destination.description}</span>
            </button>
          </li>
        {/each}
      </ul>

      <h2>{etat.vue.choixVitesse}</h2>
      <div class="vitesses">
        {#each etat.vue.vitesses as vitesse (vitesse.id)}
          <button
            type="button"
            class="carte vitesse"
            class:choisie={vitesse.choisie}
            aria-pressed={vitesse.choisie}
            onclick={() => etat.choisirVitesse(vitesse.id)}
          >
            <span class="nom">{vitesse.libelle}</span>
            <span class="detail">{vitesse.detail}</span>
          </button>
        {/each}
      </div>
    </div>

    <div class="sortie">
      <div class="ecran" aria-live="polite">
        <h2>{etat.vue.resultats}</h2>
        <ul class="resultats">
          {#each etat.vue.lignesResultat as ligne (ligne)}
            <li>{ligne}</li>
          {/each}
        </ul>

        {#if etat.vue.comparaisons.length > 0}
          <h3>{etat.vue.comparaisonsTitre}</h3>
          <ul class="comparaisons">
            {#each etat.vue.comparaisons as comparaison (comparaison.phrase)}
              <li>
                {comparaison.phrase}
                {#if comparaison.formule}
                  <small class="formule">{comparaison.formule}</small>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
      </div>

      <aside class="vraie-vie">
        <h2>{etat.vue.vraieVie.titre}</h2>
        <p>{etat.vue.vraieVie.apollo}</p>
        <p class="fictives">{etat.vue.vraieVie.fictives}</p>
      </aside>

      <button type="button" class="confirmer" onclick={() => etat.confirmer()}>
        {etat.vue.confirmer}
      </button>
    </div>
  </div>
</section>

<style>
  .navigation {
    min-height: 100vh;
    min-height: 100dvh;
    padding: 16px;
    padding-left: max(16px, env(safe-area-inset-left));
    padding-right: max(16px, env(safe-area-inset-right));
    background: var(--cockpit-bg, #15181c);
    color: var(--screen-text, #d6f5ee);
    font-family: var(--font-ui, system-ui, -apple-system, sans-serif);
  }

  h1 {
    margin: 0 0 12px;
    font-size: 1.5rem;
  }

  h2 {
    margin: 16px 0 8px;
    font-size: 1.1rem;
    color: var(--accent-2, #7aa2f7);
  }

  h3 {
    margin: 12px 0 4px;
    font-size: 1rem;
    color: var(--accent-2, #7aa2f7);
  }

  .colonnes {
    display: grid;
    gap: 8px 24px;
  }

  /* Paysage : choix à gauche, résultats à droite. */
  @media (orientation: landscape) and (min-width: 600px) {
    .colonnes {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      align-items: start;
    }
    .choix > h2:first-child,
    .ecran > h2:first-child {
      margin-top: 0;
    }
  }

  .liste {
    display: grid;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .vitesses {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .carte {
    display: grid;
    gap: 2px;
    width: 100%;
    min-height: 48px;
    padding: 12px 14px;
    border: 2px solid var(--cockpit-metal, #3a4048);
    border-radius: var(--radius, 12px);
    background: var(--screen-bg, #0b1620);
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    touch-action: manipulation;
  }

  .carte.choisie {
    border-color: var(--accent, #4fd1c5);
    box-shadow: 0 0 0 2px var(--accent, #4fd1c5) inset;
  }

  .carte:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .vitesse {
    min-height: 64px;
    text-align: center;
    align-content: center;
  }

  .nom {
    font-weight: 700;
    font-size: 1.05rem;
  }

  .description,
  .detail {
    font-size: 0.85rem;
    opacity: 0.85;
  }

  .etiquette {
    justify-self: start;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--cockpit-metal, #3a4048);
    font-size: 0.75rem;
  }

  .ecran {
    padding: 12px 16px;
    border: 2px solid var(--cockpit-metal, #3a4048);
    border-radius: var(--radius, 12px);
    background: var(--screen-bg, #0b1620);
  }

  .resultats,
  .comparaisons {
    display: grid;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .resultats li {
    font-weight: 600;
  }

  .formule {
    display: block;
    opacity: 0.75;
    font-family: ui-monospace, monospace;
  }

  .vraie-vie {
    margin-top: 12px;
    padding: 4px 16px 12px;
    border-left: 4px solid var(--warning, #f6ad55);
    border-radius: var(--radius, 12px);
    background: var(--screen-bg, #0b1620);
  }

  .vraie-vie p {
    margin: 4px 0;
  }

  .fictives {
    color: var(--warning, #f6ad55);
    font-size: 0.9rem;
  }

  .confirmer {
    width: 100%;
    min-height: 56px;
    margin-top: 16px;
    border: 0;
    border-radius: var(--radius, 12px);
    background: var(--accent, #4fd1c5);
    color: var(--cockpit-bg, #15181c);
    font: inherit;
    font-size: 1.1rem;
    font-weight: 700;
    cursor: pointer;
    touch-action: manipulation;
  }

  button:focus-visible {
    outline: 3px solid var(--accent-2, #7aa2f7);
    outline-offset: 2px;
  }
</style>
