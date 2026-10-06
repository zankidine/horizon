/**
 * Page de démonstration des polices du HUD, servie en mode dev :
 * http://localhost:5173/polices-demo.html
 * Elle affiche les caractères demandés dans chaque police, avec le repli
 * système, et signale ceux qui manquent. Elle n'est pas dans le build.
 */
import '../ui/theme/polices.css'
import '../ui/theme/tokens.css'
import { caracteresAbsents, CARACTERES_REQUIS } from '../lib/polices'

const POLICES = [
  { nom: 'Rajdhani', poids: 500, repli: 'système condensé' },
  { nom: 'Rajdhani', poids: 700, repli: 'système condensé' },
  { nom: 'Share Tech Mono', poids: 400, repli: 'monospace système' },
] as const

const ECHANTILLON =
  'Énergie 82 % · Cap 247° SO · « Où on va ? » × ÷ ≈ … œuvre – ç à è ê'

const racine = document.getElementById('demo')!
racine.style.cssText =
  'font:16px system-ui;padding:16px;background:#0b0e11;color:#e3e7ec;min-height:100vh'

/** Largeur d'un texte rendu avec la police puis un repli donné. */
function mesurer(
  contexte: CanvasRenderingContext2D,
  nom: string,
  poids: number,
  repli: string,
  texte: string
): number {
  contexte.font = `${poids} 32px "${nom}", ${repli}`
  return contexte.measureText(texte).width
}

async function afficher(): Promise<void> {
  const contexte = document.createElement('canvas').getContext('2d')!
  for (const { nom, poids, repli } of POLICES) {
    await document.fonts.load(`${poids} 32px "${nom}"`, CARACTERES_REQUIS)
    const chargee = document.fonts.check(
      `${poids} 32px "${nom}"`,
      CARACTERES_REQUIS
    )
    const absents = caracteresAbsents(CARACTERES_REQUIS, (famille, c) =>
      mesurer(
        contexte,
        nom,
        poids,
        famille === 'repli-a' ? 'monospace' : 'serif',
        c
      )
    )

    const bloc = document.createElement('section')
    bloc.style.cssText =
      'margin:0 0 24px;padding:12px;border:1px solid #345;border-radius:8px'
    const titre = document.createElement('h2')
    titre.style.cssText = 'margin:0 0 8px;font-size:1rem'
    titre.textContent = `${nom} ${poids} : ${
      chargee && absents.length === 0
        ? 'OK, tous les caractères sont dans la police'
        : `PROBLÈME (${chargee ? 'absents : ' + absents.join(' ') : 'police non chargée'})`
    }`
    titre.style.color = chargee && absents.length === 0 ? '#7fe3a0' : '#ff6b5e'

    const propre = document.createElement('p')
    propre.style.cssText = `margin:4px 0;font:${poids} 24px "${nom}", ${repli}`
    propre.textContent = `${CARACTERES_REQUIS} ${ECHANTILLON}`

    const secours = document.createElement('p')
    secours.style.cssText = `margin:4px 0;font:${poids} 24px ${
      nom === 'Share Tech Mono'
        ? 'ui-monospace, monospace'
        : "'Arial Narrow', system-ui, sans-serif"
    };opacity:.8`
    secours.textContent = `Repli (${repli}) : ${ECHANTILLON}`

    bloc.append(titre, propre, secours)
    racine.append(bloc)
  }
}

void afficher()
