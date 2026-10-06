<script lang="ts">
  import {
    graduationsBoussole,
    normaliserCap,
    pointCardinal,
  } from '../../lib/hud'
  import HudValeur from './HudValeur.svelte'

  let {
    titre,
    cap,
    allume = true,
    mouvementReduit = false,
  }: {
    titre: string
    /** Cap en degrés. */
    cap: number
    allume?: boolean
    mouvementReduit?: boolean
  } = $props()

  const graduations = $derived(graduationsBoussole(cap, 40, 5))
  const capEntier = $derived(Math.round(normaliserCap(cap)))
</script>

<div class="boussole" class:allume>
  <p class="lecture">
    <span class="titre">{titre}</span>
    <HudValeur
      valeur={capEntier}
      formater={(n) => String(Math.round(n)).padStart(3, '0')}
      unite="°"
      {mouvementReduit}
    />
    <span class="point">{pointCardinal(cap)}</span>
  </p>
  <!-- La bande graduée est décorative : le cap est déjà lu ci-dessus. -->
  <div class="bande" aria-hidden="true">
    {#each graduations as graduation (graduation.cap)}
      <span
        class="graduation"
        class:majeure={graduation.majeure}
        style:left="{graduation.position * 100}%"
      ></span>
    {/each}
    <span class="repere"></span>
  </div>
</div>

<style>
  .boussole {
    display: grid;
    justify-items: center;
    gap: 0.15rem;
    min-width: 11rem;
    padding: 0.25rem 0.9rem 0.4rem;
    border: var(--hud-epaisseur) solid
      color-mix(in srgb, var(--hud-ligne) 55%, transparent);
    border-radius: var(--hud-rayon);
    background: var(--hud-fond);
    box-shadow: 0 0 12px var(--hud-halo);
    color: var(--hud-texte);
    opacity: 0;
    transition: opacity 320ms ease-out;
  }

  .boussole.allume {
    opacity: 1;
  }

  .lecture {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    margin: 0;
    font-size: max(14px, 1.05rem);
  }

  .titre {
    font-family: var(--hud-font-titre);
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--hud-ligne);
  }

  .point {
    font-family: var(--hud-font-titre);
    font-weight: 700;
    color: var(--hud-ligne);
  }

  .bande {
    position: relative;
    width: 100%;
    height: 0.6rem;
    overflow: hidden;
  }

  .graduation {
    position: absolute;
    bottom: 0;
    width: var(--hud-epaisseur);
    height: 0.3rem;
    background: color-mix(in srgb, var(--hud-ligne) 70%, transparent);
    transform: translateX(-50%);
  }

  .majeure {
    height: 0.6rem;
    background: var(--hud-ligne);
  }

  .repere {
    position: absolute;
    top: 0;
    left: 50%;
    width: 0;
    height: 0;
    border-right: 0.3rem solid transparent;
    border-left: 0.3rem solid transparent;
    border-top: 0.4rem solid var(--hud-texte);
    transform: translateX(-50%);
  }

  @media (prefers-reduced-motion: reduce) {
    .boussole {
      transition: opacity 150ms linear;
    }
  }
</style>
