/* global HTMLElementTagNameMap */
import {
  AVERTISSEMENT_VOIX_EN_LIGNE,
  CANAUX,
  CATALOGUE,
  IDS_SONS,
  LIBELLES_CANAUX,
  arreter,
  definirVolume,
  definirVoixEnLigne,
  diagnostic,
  executer,
  initialiser,
  jouer,
  muet,
  parler,
  piloterPoussee,
  reglagesEnregistres,
  reglages,
  type Canal,
} from './index'
import { estContinu } from './sons'

/**
 * Page de démonstration du son (développement seulement : audio-demo.html n'est
 * pas une entrée de la production, elle n'est donc pas dans dist/). Un bouton
 * par son, des curseurs de volume, un test de voix et la liste des voix détectées.
 */

function element<K extends keyof HTMLElementTagNameMap>(
  nom: K,
  proprietes: Partial<HTMLElementTagNameMap[K]> = {},
  enfants: (Node | string)[] = []
): HTMLElementTagNameMap[K] {
  const e = Object.assign(document.createElement(nom), proprietes)
  e.append(...enfants)
  return e
}

function construire(racine: HTMLElement): void {
  const etat = element('pre', { id: 'etat' })
  const rafraichir = () => {
    const d = diagnostic()
    etat.textContent = [
      `Contexte audio : ${d.contexte}`,
      `Sons en cours : ${d.sonsActifs}`,
      `Voix choisie : ${d.voix ?? 'aucune (silence)'}${d.voixDisponible ? '' : ' (indisponible)'}`,
    ].join('\n')
  }

  // 1. Premier geste : le contexte audio n'existe qu'après ce clic.
  const demarrer = element('button', { textContent: 'Activer le son (premier geste)' })
  demarrer.addEventListener('click', () => {
    initialiser()
    rafraichir()
  })

  // 2. Un bouton par son.
  const sons = element('div')
  for (const id of IDS_SONS) {
    const info = CATALOGUE[id]
    const bouton = element('button', { textContent: id, title: info.description })
    if (estContinu(id)) {
      bouton.setAttribute('aria-pressed', 'false')
      bouton.addEventListener('click', () => {
        initialiser()
        const actif = bouton.getAttribute('aria-pressed') === 'true'
        executer(actif ? { type: 'arreter', id } : { type: 'demarrer', id, params: { intensite: 0.7 } })
        bouton.setAttribute('aria-pressed', String(!actif))
        rafraichir()
      })
    } else {
      bouton.addEventListener('click', () => {
        initialiser()
        jouer(id)
        rafraichir()
      })
    }
    sons.append(bouton, element('small', { textContent: ` ${info.description}` }), element('br'))
  }

  // 3. Poussée pilotée par la vitesse visuelle.
  const vitesse = element('input', { type: 'range', min: '0', max: '100', value: '30' })
  const pousseeActive = element('input', { type: 'checkbox', checked: true })
  const piloter = () => {
    initialiser()
    piloterPoussee(Number(vitesse.value), pousseeActive.checked)
  }
  vitesse.addEventListener('input', piloter)
  pousseeActive.addEventListener('change', piloter)

  // 4. Volumes par canal et muet.
  const volumes = element('div')
  const enregistres = reglagesEnregistres()
  for (const canal of CANAUX) {
    const curseur = element('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(enregistres.volumes[canal]) })
    curseur.addEventListener('input', () => definirVolume(canal as Canal, Number(curseur.value)))
    volumes.append(element('label', {}, [`${LIBELLES_CANAUX[canal]} `, curseur]))
  }
  const caseMuet = element('input', { type: 'checkbox', checked: enregistres.muet })
  caseMuet.addEventListener('change', () => muet(caseMuet.checked))

  // 5. Voix : test, option en ligne, liste des voix.
  const texte = element('input', { type: 'text', value: 'Bonjour, je suis ton copilote. Prêt pour le décollage ?' })
  const dire = element('button', { textContent: 'Dire ce texte' })
  dire.addEventListener('click', () => {
    initialiser()
    parler(texte.value)
    rafraichir()
  })
  const enLigne = element('input', { type: 'checkbox', checked: reglages().voixEnLigne })
  enLigne.addEventListener('change', () => definirVoixEnLigne(enLigne.checked))
  const liste = element('pre')
  const lireVoix = () => {
    const voix = 'speechSynthesis' in window ? window.speechSynthesis.getVoices() : []
    liste.textContent =
      voix.length === 0
        ? 'Aucune voix détectée pour le moment (la liste arrive parfois après le chargement).'
        : voix.map((v) => `${v.localService ? 'locale ' : 'DISTANTE'} ${v.lang.padEnd(6)} ${v.name}${v.default ? ' (défaut)' : ''}`).join('\n')
    rafraichir()
  }
  if ('speechSynthesis' in window) window.speechSynthesis.addEventListener('voiceschanged', lireVoix)

  const toutArreter = element('button', { textContent: 'Tout arrêter' })
  toutArreter.addEventListener('click', () => {
    arreter()
    sons.querySelectorAll('button[aria-pressed]').forEach((b) => b.setAttribute('aria-pressed', 'false'))
    rafraichir()
  })

  racine.append(
    element('h1', { textContent: 'Horizon : démo audio (développement)' }),
    element('p', { textContent: 'Aucun fichier audio : tous les sons sont synthétisés avec Web Audio. Chaque son se retrouve aussi à l’écran dans le jeu.' }),
    demarrer,
    toutArreter,
    etat,
    element('h2', { textContent: 'Sons' }),
    sons,
    element('h2', { textContent: 'Poussée des moteurs (démarrer « poussee » d’abord)' }),
    element('label', {}, ['Vitesse visuelle (de 0 à 100 km/s) ', vitesse]),
    element('label', {}, [pousseeActive, ' Poussée active']),
    element('h2', { textContent: 'Volumes' }),
    volumes,
    element('label', {}, [caseMuet, ' Muet']),
    element('h2', { textContent: 'Voix du copilote' }),
    texte,
    dire,
    element('label', {}, [enLigne, ' Autoriser les voix en ligne']),
    element('p', { className: 'alerte', textContent: AVERTISSEMENT_VOIX_EN_LIGNE }),
    element('h2', { textContent: 'Voix détectées' }),
    liste
  )
  lireVoix()
  setInterval(rafraichir, 1000)
}

const racine = document.getElementById('demo')
if (racine) construire(racine)
