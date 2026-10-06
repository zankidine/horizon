<script lang="ts">
  import { EtatPanneauVaisseau } from './panneau-vaisseau.svelte'
  import { TANGAGE_MAX_DEG } from '../../core/constants'

  const panneau = new EtatPanneauVaisseau()
  const vaisseau = panneau.vaisseau
</script>

<aside class="panneau-dev-vaisseau" aria-label="Réglages du vaisseau (développement)">
  <header>
    <button
      type="button"
      class="plier"
      aria-expanded={panneau.ouvert}
      aria-label={panneau.ouvert ? 'Replier le panneau' : 'Déplier le panneau'}
      onclick={() => panneau.basculer()}
    >
      {panneau.ouvert ? '−' : '⚙'}
    </button>
    {#if panneau.ouvert}
      <strong>Réglages du vaisseau (développement)</strong>
    {/if}
  </header>

  {#if panneau.ouvert}
    <label class="case">
      <input
        type="checkbox"
        checked={vaisseau.demo}
        onchange={(e) => panneau.basculerDemo(e.currentTarget.checked)}
      />
      Démonstration (pilotage automatique)
    </label>

    <label>
      Vitesse : {vaisseau.etat.vitesseKmS} km/s ({panneau.intensiteVisuelle})
      <input
        type="range"
        min="0"
        max="100"
        step="0.5"
        value={vaisseau.etat.vitesseKmS}
        oninput={(e) => vaisseau.choisirVitesse(e.currentTarget.valueAsNumber)}
      />
    </label>

    <label>
      Accélération du temps : ×{vaisseau.facteurTemps}
      <input
        type="range"
        min="1"
        max="1500"
        step="1"
        bind:value={vaisseau.facteurTemps}
      />
    </label>

    <label>
      Lacet : {panneau.lacetDeg}°
      <input
        type="range"
        min="-180"
        max="180"
        step="1"
        value={panneau.lacetDeg}
        oninput={(e) => panneau.choisirLacet(e.currentTarget.valueAsNumber)}
      />
    </label>

    <label>
      Tangage : {panneau.tangageDeg}°
      <input
        type="range"
        min={-TANGAGE_MAX_DEG}
        max={TANGAGE_MAX_DEG}
        step="1"
        value={panneau.tangageDeg}
        oninput={(e) => panneau.choisirTangage(e.currentTarget.valueAsNumber)}
      />
    </label>

    <button
      type="button"
      class="poussee"
      aria-pressed={vaisseau.etat.poussee}
      onclick={() => panneau.basculerPoussee()}
    >
      Poussée : {vaisseau.etat.poussee ? 'active' : 'coupée'}
    </button>

    <p class="distances">
      Terre : {panneau.distances.terre}<br />
      Lune : {panneau.distances.lune}
    </p>
  {/if}
</aside>

<style>
  .panneau-dev-vaisseau {
    position: fixed;
    top: 8px;
    left: 8px;
    z-index: 2147483000;
    display: grid;
    gap: 6px;
    max-width: min(260px, calc(100vw - 16px));
    max-height: calc(100vh - 16px);
    max-height: calc(100dvh - 16px);
    overflow-y: auto;
    padding: 6px;
    border: 1px solid rgb(255 255 255 / 0.25);
    border-radius: 10px;
    background: rgb(8 12 18 / 0.82);
    color: #e3e7ec;
    font: 12px/1.3 system-ui, sans-serif;
  }

  header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  label {
    display: grid;
    gap: 2px;
  }

  .case {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
  }

  input[type='range'] {
    width: 100%;
    min-height: 44px;
    margin: 0;
  }

  input[type='checkbox'] {
    width: 24px;
    height: 24px;
    margin: 0;
  }

  button {
    min-width: 44px;
    min-height: 44px;
    border: 1px solid rgb(255 255 255 / 0.3);
    border-radius: 8px;
    background: rgb(255 255 255 / 0.08);
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .poussee[aria-pressed='true'] {
    background: #4fd1c5;
    color: #15181c;
  }

  .distances {
    margin: 0;
    opacity: 0.85;
  }
</style>
