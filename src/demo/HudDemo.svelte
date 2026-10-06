<script lang="ts">
  import { onMount } from 'svelte'
  import jetonsCss from '../ui/theme/tokens.css?raw'
  import {
    analyserCouleur,
    contrasteMinimal,
    lireJetons,
    SEUIL_AA_GRAPHIQUE,
    SEUIL_AA_TEXTE,
  } from '../lib/contraste'
  import HudAlerte from '../ui/hud/HudAlerte.svelte'
  import HudBouton from '../ui/hud/HudBouton.svelte'
  import HudCoins from '../ui/hud/HudCoins.svelte'
  import HudFenetreSysteme from '../ui/hud/HudFenetreSysteme.svelte'
  import HudIcone from '../ui/hud/HudIcone.svelte'
  import HudJauge from '../ui/hud/HudJauge.svelte'
  import HudPanneau from '../ui/hud/HudPanneau.svelte'
  import HudReticule from '../ui/hud/HudReticule.svelte'
  import HudValeur from '../ui/hud/HudValeur.svelte'
  import GraphiqueCanvas from '../ui/ecran/GraphiqueCanvas.svelte'
  import { dessinOscilloscope, dessinSpectre } from '../ui/ecran/dessins'
  import { moteur } from '../ui/ecran/moteur.svelte.ts'

  const AMBIANCES = ['cinema', 'aventure'] as const
  const QUALITES = ['haut', 'bas'] as const
  /** Fond clair : le pire cas pour la lisibilité (la Terre éclairée). */
  let fondClair = $state(false)

  onMount(() => {
    moteur.niveau = 'haut'
    moteur.lireCouleurs()
  })

  const PAIRES: readonly [string, string, number][] = [
    ['--hud-texte', '--hud-fond', SEUIL_AA_TEXTE],
    ['--hud-texte-doux', '--hud-fond', SEUIL_AA_TEXTE],
    ['--role-info', '--hud-fond', SEUIL_AA_TEXTE],
    ['--role-valide', '--hud-fond', SEUIL_AA_TEXTE],
    ['--hud-ligne', '--hud-fond', SEUIL_AA_TEXTE],
    ['--hud-texte', '--hud-fond-actif', SEUIL_AA_TEXTE],
    ['--hud-texte', '--hud-fond-alerte', SEUIL_AA_TEXTE],
    ['--role-deco', '--hud-fond', SEUIL_AA_GRAPHIQUE],
    ['--role-avert', '--hud-fond', SEUIL_AA_GRAPHIQUE],
    ['--role-alerte', '--hud-fond', SEUIL_AA_GRAPHIQUE],
  ]

  function contrastes(ambiance: (typeof AMBIANCES)[number]) {
    const jetons = lireJetons(jetonsCss, ambiance)
    return PAIRES.map(([texte, fond, seuil]) => {
      const rapport = contrasteMinimal(
        analyserCouleur(jetons[texte]),
        analyserCouleur(jetons[fond])
      )
      return { texte, fond, seuil, rapport, ok: rapport >= seuil }
    })
  }
</script>

<header class="entete">
  <h1>Kit HUD : tous les composants</h1>
  <label>
    <input type="checkbox" bind:checked={fondClair} />
    Fond clair (pire cas : la Terre éclairée)
  </label>
</header>

<div class="grille">
  {#each AMBIANCES as ambiance (ambiance)}
    {#each QUALITES as qualite (qualite)}
      <section
        class="cellule"
        class:clair={fondClair}
        data-ambiance={ambiance}
        data-qualite={qualite}
      >
        <h2>Ambiance « {ambiance} » · qualité « {qualite} »</h2>

        <HudPanneau
          id="demo-{ambiance}-{qualite}-p"
          titre="Panneau"
          flou={qualite === 'haut'}
        >
          <p>Texte courant, <span class="doux">texte atténué</span>.</p>
          <p class="ligne">
            <span>Énergie</span>
            <HudValeur valeur={82} unite=" %" />
          </p>
          <HudJauge etiquette="Énergie" valeur={0.82} />
          <HudJauge etiquette="Boucliers (bas)" valeur={0.15} />
          <HudJauge etiquette="Moteurs" valeur={0.38} variante="arc">
            <HudValeur valeur={38} />
          </HudJauge>
        </HudPanneau>

        <div class="rangee">
          <HudBouton etiquette="Voyage" libelleVisible onpresse={() => {}}>
            <HudIcone nom="navigation" />
          </HudBouton>
          <HudBouton
            etiquette="Scan (actif)"
            libelleVisible
            actif
            onpresse={() => {}}
          >
            <HudIcone nom="scan" />
          </HudBouton>
          <HudBouton etiquette="Radio" onpresse={() => {}}>
            <HudIcone nom="communications" />
          </HudBouton>
        </div>

        <div class="graphes">
          <GraphiqueCanvas dessiner={dessinOscilloscope} priorite={1} />
          <GraphiqueCanvas dessiner={dessinSpectre} priorite={2} />
        </div>

        <div class="boite">
          <HudCoins />
          <HudReticule
            ancre={{ x: 0.5, y: 0.5 }}
            boite={{ largeur: 240, hauteur: 90 }}
            etiquette="Cible : Lune"
          />
        </div>

        <HudAlerte message="Nouvelle cible : Lune" />

        <div class="fenetre">
          <HudFenetreSysteme
            id="demo-{ambiance}-{qualite}-f"
            entete="SYSTÈME"
            titre="Fenêtre"
            libelleFermer="Fermer"
            etat="ouverte"
            duree={0}
            boite={{ largeur: 340, hauteur: 190 }}
            flou={qualite === 'haut'}
            onfermer={() => {}}
          >
            <p>Aucune donnée pour l'instant.</p>
          </HudFenetreSysteme>
        </div>
      </section>
    {/each}
  {/each}
</div>

<section class="contrastes">
  <h2>Contraste contre le pire fond (fond du panneau sur blanc ou noir)</h2>
  <div class="deux">
    {#each AMBIANCES as ambiance (ambiance)}
      <table>
        <caption>« {ambiance} »</caption>
        <thead>
          <tr><th>Couleur</th><th>Fond</th><th>Rapport</th><th>Seuil</th></tr>
        </thead>
        <tbody>
          {#each contrastes(ambiance) as ligne (ligne.texte + ligne.fond)}
            <tr class:echec={!ligne.ok}>
              <td>{ligne.texte}</td>
              <td>{ligne.fond}</td>
              <td>{ligne.rapport.toFixed(2)}:1</td>
              <td>{ligne.seuil}:1 {ligne.ok ? '✓' : '✗'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/each}
  </div>
</section>

<style>
  .entete {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
    font: 16px system-ui;
  }

  h1,
  h2 {
    margin: 0;
    font-size: 1.1rem;
  }

  h2 {
    font-size: 0.95rem;
    color: #aab3bd;
  }

  .grille {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
    gap: 12px;
    padding: 0 16px 16px;
  }

  .cellule {
    position: relative;
    display: grid;
    align-content: start;
    gap: var(--esp-3);
    padding: var(--esp-3);
    border: 1px solid #2b333c;
    border-radius: 8px;
    /* Image de ciel sombre ou fond clair, pour juger la lisibilité. */
    background: radial-gradient(circle at 30% 20%, #1c3a6e, #05080f 70%);
    color: var(--hud-texte);
    font-family: var(--hud-font-titre);
    font-size: var(--txt-m);
  }

  .cellule.clair {
    background: #f4f6f8;
  }

  .cellule h2 {
    font-family: system-ui;
  }

  .doux {
    color: var(--hud-texte-doux);
  }

  p {
    margin: 0;
  }

  .ligne {
    display: flex;
    justify-content: space-between;
  }

  .rangee,
  .graphes {
    display: flex;
    flex-wrap: wrap;
    gap: var(--esp-2);
  }

  .graphes > :global(canvas) {
    flex: 1 1 8rem;
    height: 48px;
  }

  .boite,
  .fenetre {
    position: relative;
    height: 100px;
  }

  .fenetre {
    height: 220px;
  }

  .contrastes {
    padding: 0 16px 24px;
    font: 14px system-ui;
  }

  .deux {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 16px;
  }

  table {
    border-collapse: collapse;
  }

  caption {
    text-align: left;
    font-weight: 700;
  }

  th,
  td {
    padding: 2px 8px;
    border-bottom: 1px solid #2b333c;
    text-align: left;
  }

  .echec {
    color: #ff6b5e;
  }
</style>
