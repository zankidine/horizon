<script lang="ts"></script>

<!-- Coins en équerre, décoratifs. -->
<span class="coins" aria-hidden="true">
  <i class="hg"></i><i class="hd"></i><i class="bg"></i><i class="bd"></i>
</span>

<style>
  .coins {
    position: absolute;
    inset: calc(var(--hud-epaisseur) * -1);
    pointer-events: none;
  }

  i {
    position: absolute;
    width: 0.8rem;
    height: 0.8rem;
    border: calc(var(--hud-epaisseur) * 2) solid var(--hud-ligne);
    filter: drop-shadow(0 0 3px var(--hud-halo));
  }

  .hg {
    top: 0;
    left: 0;
    border-right: 0;
    border-bottom: 0;
  }

  .hd {
    top: 0;
    right: 0;
    border-left: 0;
    border-bottom: 0;
  }

  .bg {
    bottom: 0;
    left: 0;
    border-right: 0;
    border-top: 0;
  }

  .bd {
    right: 0;
    bottom: 0;
    border-left: 0;
    border-top: 0;
  }
</style>
