<script lang="ts">
  import { formaterNombre } from '../../lib/format-fr'
  import { RANGS } from '../hud/hud.svelte.ts'
  import { vaisseau } from '../vaisseau.svelte'
  import type { EtatEcran } from './ecran.svelte.ts'
  import GraphiqueCanvas from './GraphiqueCanvas.svelte'
  import { dessinRuban } from './dessins'

  let { ecran }: { ecran: EtatEcran } = $props()
  const hud = $derived(ecran.hud)
  const vitesse = $derived(formaterNombre(Math.round(ecran.vol.vitesseKmH)))
  const cap = $derived(Math.round(ecran.vol.capDeg))
</script>

<div class="barre" class:allume={hud.estAllume(RANGS.haut)}>
  <p class="horloge">
    <span class="invisible"
      >{hud.t(hud.textes.ecran.horloge)} :
    </span>{ecran.horloge}
  </p>
  <div class="ruban">
    <GraphiqueCanvas
      dessiner={dessinRuban(() => vaisseau.etat)}
      visible={!hud.masque}
      priorite={0}
    />
  </div>
  <p class="etat">
    <span class="invisible">{hud.t(hud.textes.cap.titre)} </span>{String(
      cap
    ).padStart(3, '0')}°<span class="sep" aria-hidden="true"> · </span><span
      class="vitesse">{vitesse}&nbsp;km/h</span
    >
  </p>
</div>

<style>
  .barre {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 0.7rem;
    min-width: 0;
    height: 44px;
    padding: 0 0.7rem;
    border-block: var(--hud-epaisseur) solid
      color-mix(in srgb, var(--hud-ligne) 55%, transparent);
    background: linear-gradient(
      90deg,
      var(--hud-fond),
      color-mix(in srgb, var(--hud-fond) 70%, transparent),
      var(--hud-fond)
    );
    clip-path: polygon(
      10px 0,
      calc(100% - 10px) 0,
      100% 50%,
      calc(100% - 10px) 100%,
      10px 100%,
      0 50%
    );
    color: var(--hud-texte);
    font-family: var(--hud-font-chiffres);
    font-size: max(14px, 0.9rem);
    opacity: 0;
    transform: translateY(-6px);
    transition:
      opacity 320ms ease-out,
      transform 320ms ease-out;
  }

  .allume {
    opacity: 1;
    transform: none;
  }

  p {
    margin: 0;
    white-space: nowrap;
  }

  .horloge {
    color: var(--hud-ligne);
  }

  .ruban {
    flex: 1 1 0;
    min-width: 40px;
    height: 100%;
  }

  .etat {
    font-weight: 400;
  }

  .invisible {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  /* Très étroit : la vitesse passe après le cap. */
  @container hud (max-width: 520px) {
    .vitesse,
    .sep {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .barre {
      transform: none;
      transition: opacity 150ms linear;
    }
  }
</style>
