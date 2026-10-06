<script lang="ts">
  // Le contenu utile (cap, état, cible, copilote) est sur la vitre, dans le
  // HUD. Ces écrans attendent leur contenu : un texte de veille.
  let { texte }: { texte: string } = $props()
</script>

<p class="veille"><span class="point" aria-hidden="true"></span>{texte}</p>

<style>
  .veille {
    margin: 0;
    font-size: clamp(0.8rem, 2.2vmin, 1rem);
    opacity: 0.85;
  }

  .point {
    display: inline-block;
    width: 0.55em;
    height: 0.55em;
    margin-right: 0.5em;
    border-radius: 50%;
    background: var(--accent-2);
    box-shadow: 0 0 6px var(--accent-2);
  }
</style>
