<script lang="ts">
  import { CARTES_NIVEAU, EtatSelecteurNiveau, MENTION_CHANGEMENT } from './niveaux.svelte.ts'

  let {
    legende = 'Quel est ton niveau ?',
    avecExemples = true,
    avecMention = true,
  }: { legende?: string; avecExemples?: boolean; avecMention?: boolean } = $props()

  const etat = new EtatSelecteurNiveau()
</script>

<fieldset class="selecteur">
  <legend>{legende}</legend>
  <div class="choix">
    {#each CARTES_NIVEAU as carte (carte.id)}
      <label class="carte">
        <input
          type="radio"
          name="niveau"
          value={carte.id}
          checked={etat.niveau === carte.id}
          onchange={() => etat.choisir(carte.id)}
        />
        <span class="titre">{carte.id}. {carte.nom}</span>
        <span class="detail">{carte.description}</span>
        {#if avecExemples}
          <span class="exemple">« {carte.exemple} »</span>
        {/if}
      </label>
    {/each}
  </div>
  {#if avecMention}
    <p class="mention">{MENTION_CHANGEMENT}</p>
  {/if}
</fieldset>

<style>
  .selecteur {
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
    align-content: start;
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

  .exemple {
    margin-top: 0.3rem;
    font-size: 0.85rem;
    font-style: italic;
  }

  .mention {
    margin: 0.5rem 0 0;
    font-size: 0.85rem;
    opacity: 0.8;
  }
</style>
