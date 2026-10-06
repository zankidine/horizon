<script lang="ts">
  import type { NiveauQualite } from '../../core/qualite'
  import { urlGrain } from './grain'

  let { niveau }: { niveau: NiveauQualite } = $props()
  const grain = urlGrain()
</script>

<!-- Verre discret : dégradés et petite texture répétée, sans aucun filtre plein écran. -->
<div class="verre" data-qualite={niveau} aria-hidden="true">
  <span class="reflet"></span>
  <span class="vignette"></span>
  <span class="aberration"></span>
  {#if grain && niveau !== 'bas'}
    <span class="grain" style:background-image="url({grain})"></span>
  {/if}
</div>

<style>
  .verre,
  .verre span {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  /* Bords un peu plus sombres, comme un casque. */
  .vignette {
    background: radial-gradient(
      ellipse at center,
      transparent 58%,
      rgb(0 0 0 / 0.34) 100%
    );
  }

  /* Reflet très doux, en haut à gauche. */
  .reflet {
    background: linear-gradient(
      118deg,
      rgb(255 255 255 / 0.07) 0%,
      transparent 32%
    );
  }

  /* Franges colorées sur les bords : aberration chromatique légère. */
  .aberration {
    box-shadow:
      inset 5px 0 8px -4px color-mix(in srgb, var(--role-info) 16%, transparent),
      inset -5px 0 8px -4px
        color-mix(in srgb, var(--role-alerte) 14%, transparent);
  }

  .grain {
    background-repeat: repeat;
    opacity: 0.045;
  }
</style>
