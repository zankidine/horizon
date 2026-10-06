<script lang="ts">
  import type { EtatPoste } from './poste.svelte.ts'

  let { cote, poste }: { cote: 'gauche' | 'droite'; poste: EtatPoste } =
    $props()
</script>

{#if cote === 'gauche'}
  <h2>Copilote</h2>
  <p class="valeur">{poste.copilote || 'Sans nom'}</p>
  <p class="etat"><span class="point" aria-hidden="true"></span>En ligne</p>
{:else}
  <h2>Mission</h2>
  <p class="valeur">Profil {poste.libelleProfil.toLowerCase()}</p>
  <p class="etat">Ambiance {poste.libelleAmbiance.toLowerCase()}</p>
  <p class="etat attente">En attente de mission…</p>
{/if}

<style>
  h2 {
    margin: 0 0 0.25rem;
    font-size: 0.7rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent-2);
  }

  p {
    margin: 0;
    line-height: 1.25;
  }

  .valeur {
    font-size: clamp(0.95rem, 2.6vmin, 1.4rem);
    font-weight: 700;
  }

  .etat {
    margin-top: 0.2rem;
    font-size: clamp(0.7rem, 1.9vmin, 0.95rem);
    opacity: 0.85;
  }

  .point {
    display: inline-block;
    width: 0.55em;
    height: 0.55em;
    margin-right: 0.4em;
    border-radius: 50%;
    background: var(--accent-2);
    box-shadow: 0 0 6px var(--accent-2);
  }

  .attente {
    color: var(--accent);
  }
</style>
