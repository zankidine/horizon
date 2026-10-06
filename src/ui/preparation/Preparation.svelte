<script lang="ts">
  import {
    CHOIX_AMBIANCE,
    EtatPreparation,
    LONGUEUR_MAX_COPILOTE,
    NOMS_SUGGERES,
  } from './preparation.svelte.ts'

  const etat = new EtatPreparation()
  import SelecteurNiveau from '../niveaux/SelecteurNiveau.svelte'
</script>

<main class="preparation">
  <form
    onsubmit={(evenement) => {
      evenement.preventDefault()
      etat.decoller()
    }}
  >
    <h1>Préparation de mission</h1>

    <SelecteurNiveau legende="Quel explorateur es-tu ?" />

    <fieldset>
      <legend>Quelle ambiance pour le vaisseau ?</legend>
      <div class="choix">
        {#each CHOIX_AMBIANCE as option (option.valeur)}
          <label class="carte">
            <input
              type="radio"
              name="ambiance"
              value={option.valeur}
              checked={etat.ambiance === option.valeur}
              onchange={() => etat.choisirAmbiance(option.valeur)}
            />
            <span class="titre">{option.titre}</span>
            <span class="detail">{option.detail}</span>
          </label>
        {/each}
      </div>
    </fieldset>

    <fieldset>
      <legend>Comment s'appelle ton copilote ?</legend>
      <input
        class="nom"
        type="text"
        name="copilote"
        autocomplete="off"
        enterkeyhint="go"
        maxlength={LONGUEUR_MAX_COPILOTE}
        placeholder="Écris un nom"
        aria-label="Nom du copilote"
        bind:value={etat.nom}
      />
      <div class="suggestions">
        {#each NOMS_SUGGERES as nom (nom)}
          <button type="button" onclick={() => etat.suggerer(nom)}>{nom}</button
          >
        {/each}
      </div>
    </fieldset>

    <button class="decoller" type="submit" disabled={!etat.nomValide}>
      Décollage
    </button>
  </form>
</main>

<style>
  .preparation {
    min-height: 100dvh;
    padding: max(1rem, env(safe-area-inset-top))
      max(1rem, env(safe-area-inset-right))
      max(1rem, env(safe-area-inset-bottom))
      max(1rem, env(safe-area-inset-left));
    display: grid;
    place-items: center;
    background:
      radial-gradient(
        circle at 50% 0%,
        color-mix(in srgb, var(--accent) 22%, transparent),
        transparent 60%
      ),
      var(--cockpit-bg);
    color: var(--poste-texte);
    font-family: var(--font-ui);
  }

  form {
    width: min(100%, 38rem);
    display: grid;
    gap: 1.1rem;
  }

  h1 {
    margin: 0;
    font-size: clamp(1.5rem, 5vw, 2.2rem);
    text-align: center;
  }

  fieldset {
    margin: 0;
    padding: 0;
    border: 0;
    min-inline-size: 0;
  }

  legend {
    padding: 0;
    margin-bottom: 0.5rem;
    font-weight: 600;
  }

  .choix {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
    gap: 0.6rem;
  }

  .carte {
    position: relative;
    display: grid;
    gap: 0.15rem;
    min-height: 4.2rem;
    padding: 0.7rem 0.9rem;
    border: 2px solid var(--cockpit-metal);
    border-radius: var(--radius);
    background: var(--screen-bg);
    color: var(--screen-text);
    cursor: pointer;
  }

  .carte input {
    position: absolute;
    inset: 0;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }

  .carte:has(input:checked) {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 45%, transparent);
  }

  .carte:has(input:focus-visible) {
    outline: 3px solid var(--accent-2);
    outline-offset: 2px;
  }

  .titre {
    font-weight: 700;
    font-size: 1.05rem;
  }

  .detail {
    font-size: 0.85rem;
    opacity: 0.8;
  }

  .nom {
    width: 100%;
    min-height: 2.75rem;
    padding: 0 0.9rem;
    border: 2px solid var(--cockpit-metal);
    border-radius: var(--radius);
    background: var(--screen-bg);
    color: var(--screen-text);
    font: inherit;
    font-size: 1.05rem;
  }

  .nom:focus-visible {
    outline: 3px solid var(--accent-2);
    outline-offset: 2px;
  }

  .suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.6rem;
  }

  .suggestions button {
    min-height: 2.75rem;
    min-width: 2.75rem;
    padding: 0 0.9rem;
    border: 2px solid var(--accent-2);
    border-radius: 999px;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .suggestions button:focus-visible,
  .decoller:focus-visible {
    outline: 3px solid var(--accent);
    outline-offset: 2px;
  }

  .decoller {
    min-height: 3.25rem;
    border: 0;
    border-radius: var(--radius);
    background: var(--accent);
    color: var(--cockpit-bg);
    font: inherit;
    font-size: 1.15rem;
    font-weight: 700;
    cursor: pointer;
  }

  .decoller:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
</style>
