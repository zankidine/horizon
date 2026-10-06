<script lang="ts">
  import { Canvas } from '@threlte/core'
  import SceneHublot from './SceneHublot.svelte'
  import {
    CREDITS_TEXTURES,
    EtatHublot,
    REGLAGES_QUALITE,
  } from './hublot.svelte'

  const etat = new EtatHublot()
  const boulons = Array.from({ length: 8 }, (_, i) => (i * 360) / 8 + 22.5)
</script>

<div class="paroi">
  <div class="cadre">
    <div class="vitre">
      <Canvas dpr={etat.ratioPixels}>
        <SceneHublot {etat} />
      </Canvas>
      <div class="reflet" aria-hidden="true"></div>
    </div>

    <svg class="rebord" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#e3e7ec" />
          <stop offset="0.35" stop-color="#8d96a1" />
          <stop offset="0.55" stop-color="#c9cfd6" />
          <stop offset="1" stop-color="#4b525b" />
        </linearGradient>
        <linearGradient id="metal-interieur" x1="1" y1="1" x2="0" y2="0">
          <stop offset="0" stop-color="#d5dae0" />
          <stop offset="1" stop-color="#3a4048" />
        </linearGradient>
        <radialGradient id="boulon" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0" stop-color="#f4f6f8" />
          <stop offset="0.6" stop-color="#8a929c" />
          <stop offset="1" stop-color="#3b4149" />
        </radialGradient>
        <mask id="anneau">
          <rect width="100" height="100" fill="white" />
          <circle cx="50" cy="50" r="44" fill="black" />
        </mask>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#metal)" mask="url(#anneau)" />
      <circle
        cx="50"
        cy="50"
        r="44.6"
        fill="none"
        stroke="url(#metal-interieur)"
        stroke-width="1.2"
      />
      <circle
        cx="50"
        cy="50"
        r="49.6"
        fill="none"
        stroke="#2b3037"
        stroke-width="0.8"
      />
      {#each boulons as angle (angle)}
        <g transform="rotate({angle} 50 50)">
          <circle cx="50" cy="2.9" r="1.35" fill="url(#boulon)" />
          <line
            x1="49.2"
            y1="2.9"
            x2="50.8"
            y2="2.9"
            stroke="#3b4149"
            stroke-width="0.3"
          />
        </g>
      {/each}
    </svg>
  </div>

  <p class="credits">{CREDITS_TEXTURES.join(' · ')}</p>

  <div class="qualite" role="group" aria-label="Qualité graphique">
    {#each REGLAGES_QUALITE as option (option.valeur)}
      <button
        type="button"
        aria-pressed={etat.reglage === option.valeur}
        onclick={() => etat.choisirReglage(option.valeur)}
      >
        {option.libelle}
      </button>
    {/each}
  </div>
</div>

<style>
  .paroi {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    overflow: hidden;
    background: radial-gradient(
      circle at 50% 45%,
      #3a4049 0%,
      #22262c 55%,
      #15181c 100%
    );
    touch-action: none;
  }

  .cadre {
    position: relative;
    width: min(94vw, 86dvh);
    aspect-ratio: 1;
    border-radius: 50%;
    box-shadow:
      0 0 0 1px #0d0f12,
      0 1.5vmin 4vmin rgb(0 0 0 / 0.6);
  }

  /* L'ouverture correspond au cercle intérieur du rebord (r = 44 sur 50). */
  .vitre {
    position: absolute;
    inset: 6%;
    border-radius: 50%;
    overflow: hidden;
    background: #000;
    /* Contour net du disque sur Safari pendant les animations. */
    isolation: isolate;
  }

  .reflet {
    position: absolute;
    inset: 0;
    pointer-events: none;
    border-radius: 50%;
    background:
      linear-gradient(
        135deg,
        rgb(255 255 255 / 0.1) 0%,
        rgb(255 255 255 / 0.03) 28%,
        transparent 42%
      ),
      radial-gradient(
        ellipse 30% 12% at 30% 22%,
        rgb(255 255 255 / 0.05),
        transparent 70%
      );
    box-shadow:
      inset 0 0 2.5vmin rgb(0 0 0 / 0.85),
      inset 0 0 0.6vmin rgb(150 190 230 / 0.25);
  }

  .rebord {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .credits {
    position: fixed;
    left: max(0.75rem, env(safe-area-inset-left));
    bottom: max(0.75rem, env(safe-area-inset-bottom));
    max-width: 14rem;
    margin: 0;
    font-size: 0.7rem;
    line-height: 1.3;
    color: #9aa3ad;
  }

  .qualite {
    position: fixed;
    right: max(0.75rem, env(safe-area-inset-right));
    bottom: max(0.75rem, env(safe-area-inset-bottom));
    display: flex;
    gap: 0.25rem;
    padding: 0.25rem;
    border-radius: 999px;
    background: rgb(10 12 15 / 0.7);
  }

  .qualite button {
    min-width: 3.5rem;
    min-height: 2.75rem;
    padding: 0 0.75rem;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: #c9cfd6;
    font: inherit;
    font-size: 0.9rem;
    cursor: pointer;
  }

  .qualite button[aria-pressed='true'] {
    background: #c9cfd6;
    color: #15181c;
  }

  @media (orientation: portrait) {
    .qualite {
      right: 50%;
      transform: translateX(50%);
      bottom: calc(max(0.75rem, env(safe-area-inset-bottom)) + 2.75rem);
    }

    .credits {
      right: max(0.75rem, env(safe-area-inset-right));
      max-width: none;
      text-align: center;
    }
  }
</style>
