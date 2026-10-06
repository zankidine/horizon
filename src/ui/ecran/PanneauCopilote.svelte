<script lang="ts">
  import HudBouton from '../hud/HudBouton.svelte'
  import HudIcone from '../hud/HudIcone.svelte'
  import HudPanneau from '../hud/HudPanneau.svelte'
  import { RANGS } from '../hud/hud.svelte.ts'
  import type { EtatEcran } from './ecran.svelte.ts'
  import GraphiqueCanvas from './GraphiqueCanvas.svelte'
  import { dessinOnde } from './dessins'
  import type { Snippet } from 'svelte'

  let {
    ecran,
    actionsSeules = false,
    chips,
  }: {
    ecran: EtatEcran
    /** Petits écrans : les boutons des tiroirs rejoignent la barre d'action. */
    actionsSeules?: boolean
    chips?: Snippet
  } = $props()

  const hud = $derived(ecran.hud)
  const libelles = $derived(ecran.miseEnPage === 'paysage')
</script>

{#snippet actions()}
  <div class="actions">
    {#if chips}{@render chips()}{/if}
    {#each hud.idsSysteme as id (id)}
      <HudBouton
        etiquette={hud.t(hud.textes.icones[id])}
        libelleVisible={libelles}
        actif={hud.estSystemeOuvert(id)}
        controle="hud-systeme"
        onpresse={(declencheur) => hud.basculerSysteme(id, declencheur)}
      >
        <HudIcone nom={id} />
      </HudBouton>
    {/each}
  </div>
{/snippet}

{#if actionsSeules}
  {@render actions()}
{:else}
  <HudPanneau
    id="hud-copilote"
    prefixe={hud.t(hud.textes.copilote.prefixe)}
    titre={ecran.copilote}
    allume={hud.estAllume(RANGS.copilote)}
    flou={hud.flou}
  >
    <div class="ligne">
      <div class="onde">
        <GraphiqueCanvas
          dessiner={dessinOnde(() => ecran.parle)}
          visible={!hud.masque}
          priorite={5}
        />
      </div>
      <p class="message">{hud.t(hud.textes.copilote.message)}</p>
    </div>
    <div class="bas-panneau">
      {#if ecran.miseEnPage === 'paysage'}
        <ul class="journal" aria-hidden="true">
          {#each ecran.journal as ligne (ligne.index)}
            <li>{ligne.texte}</li>
          {/each}
          <li class="simulation">{hud.t(hud.textes.ecran.simulation)}</li>
        </ul>
      {/if}
      {@render actions()}
    </div>
  </HudPanneau>
{/if}

<style>
  .ligne {
    display: flex;
    align-items: center;
    gap: var(--esp-3);
  }

  .onde {
    flex: none;
    width: 4.5rem;
    height: 1.9rem;
  }

  .message {
    margin: 0;
    min-width: 0;
    font-weight: 500;
    line-height: 1.2;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--esp-2);
    pointer-events: none;
  }

  .bas-panneau {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--esp-3);
  }

  .journal {
    display: grid;
    gap: 0;
    margin: 0;
    padding: 0;
    overflow: hidden;
    list-style: none;
    font-family: var(--hud-font-chiffres);
    font-size: var(--txt-s);
    line-height: 1.3;
    color: var(--hud-texte-doux);
  }

  .journal li {
    white-space: nowrap;
    animation: monter 400ms ease-out both;
  }

  .journal .simulation {
    font-family: var(--hud-font-titre);
    font-style: italic;
    animation: none;
    color: var(--hud-texte-doux);
  }

  @keyframes monter {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .journal li {
      animation: none;
    }
  }
</style>
