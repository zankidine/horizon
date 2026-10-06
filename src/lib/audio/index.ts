import { creerContexteReel, sessionAudioDuNavigateur } from './contexte'
import { intensitePoussee, estCanal, estIdSon, type Canal } from './catalogue'
import { creerTraducteur, type Commande, type SourceEvenements } from './evenements'
import { chargerReglages, type ReglagesAudio, type Stockage } from './mixage'
import { MoteurAudio } from './moteur'
import { FileVoix, type EnonceSynthese, type Synthese } from './voix'
import { estContinu } from './sons'

/**
 * Façade de l'audio : l'interface n'utilise que ces fonctions.
 *
 *   initialiser()                au premier geste (clic sur « Décollage »)
 *   jouer(id)                    un son ponctuel du catalogue
 *   parler(texte)                la voix du copilote (le texte reste affiché)
 *   arreter()                    coupe voix et sons
 *   definirVolume(canal, v)      volume d'un canal, de 0 à 1
 *   muet(booleen)                coupe tout, ou rétablit
 *
 * Complément : connecterMission(moteur) relie le moteur de missions au son,
 * piloterPoussee() règle le bruit des moteurs. Rien n'est indispensable : sans
 * audio, le jeu s'affiche et fonctionne pareil.
 */

export { CATALOGUE, CANAUX, IDS_SONS, LIBELLES_CANAUX, type Canal, type IdSon } from './catalogue'
export { AVERTISSEMENT_VOIX_EN_LIGNE } from './mixage'
export type { ReglagesAudio } from './mixage'

interface Environnement {
  moteur: MoteurAudio
  voix: FileVoix
}

let env: Environnement | null = null

function stockageNavigateur(): Stockage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null // accès au stockage refusé (navigation privée stricte)
  }
}

function syntheseNavigateur(): Synthese | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  return window.speechSynthesis as unknown as Synthese
}

function creerEnonceNavigateur(texte: string): EnonceSynthese {
  return new SpeechSynthesisUtterance(texte) as unknown as EnonceSynthese
}

function planifierNavigateur(fn: () => void, ms: number): () => void {
  const id = setTimeout(fn, ms)
  return () => clearTimeout(id)
}

function environnement(): Environnement {
  if (env) return env
  const moteur = new MoteurAudio({
    creerContexte: creerContexteReel,
    stockage: stockageNavigateur(),
    session: sessionAudioDuNavigateur(),
  })
  const voix = new FileVoix({
    synthese: syntheseNavigateur(),
    creerEnonce: creerEnonceNavigateur,
    planifier: planifierNavigateur,
  })
  env = { moteur, voix }
  appliquerReglagesVoix(env)
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      env?.moteur.surVisibilite(document.hidden)
      env?.voix.surVisibilite(document.hidden)
    })
  }
  return env
}

function appliquerReglagesVoix({ moteur, voix }: Environnement): void {
  const r = moteur.reglages()
  voix.definirReglages({ muet: r.muet, volume: r.volumes.voix, voixEnLigne: r.voixEnLigne })
}

/** À appeler au premier geste du joueur : crée le contexte audio, ou le reprend s'il est suspendu. */
export function initialiser(): void {
  environnement().moteur.initialiser()
}

/** Joue un son ponctuel du catalogue. Sans effet si l'id est inconnu, si l'audio n'est pas initialisé ou coupé. */
export function jouer(id: string): void {
  const { moteur } = environnement()
  if (estIdSon(id) && !estContinu(id)) moteur.jouer(id)
}

/** Fait dire une réplique au copilote (voix locale seulement) ; sans voix, silence. Le texte doit rester affiché. */
export function parler(texte: string): void {
  environnement().voix.parler(texte)
}

/** Coupe la voix et tous les sons. */
export function arreter(): void {
  const { moteur, voix } = environnement()
  voix.arreter()
  moteur.arreterTout()
}

/** Volume d'un canal, de 0 à 1 (enregistré). */
export function definirVolume(canal: Canal, valeur: number): void {
  if (!estCanal(canal)) return
  const e = environnement()
  e.moteur.definirVolume(canal, valeur)
  appliquerReglagesVoix(e)
}

/** Coupe (true) ou rétablit (false) tout le son (enregistré). */
export function muet(coupe: boolean): void {
  const e = environnement()
  e.moteur.definirMuet(coupe)
  appliquerReglagesVoix(e)
}

/** Réglages actuels (volumes, muet, voix en ligne). */
export function reglages(): ReglagesAudio {
  return environnement().moteur.reglages()
}

/**
 * Option « voix en ligne » : désactivée par défaut. Activée, le texte lu peut
 * être envoyé à un service externe. Montrer AVERTISSEMENT_VOIX_EN_LIGNE avant.
 */
export function definirVoixEnLigne(actif: boolean): void {
  const e = environnement()
  e.moteur.definirVoixEnLigne(actif)
  appliquerReglagesVoix(e)
}

/** Règle le bruit des moteurs d'après la vitesse visuelle (km/s) et la poussée. Peut être appelé à chaque image : le moteur ignore les petits changements. */
export function piloterPoussee(vitesseKmS: number, pousseeActive: boolean): void {
  const { moteur } = environnement()
  moteur.regler('poussee', { intensite: intensitePoussee(vitesseKmS, pousseeActive) })
}

/** Exécute une commande sonore (utilisé par le pont d'événements et la démonstration). */
export function executer(commande: Commande): void {
  const { moteur, voix } = environnement()
  switch (commande.type) {
    case 'jouer':
      if (commande.apresMs) setTimeout(() => moteur.jouer(commande.id), commande.apresMs)
      else moteur.jouer(commande.id)
      break
    case 'demarrer':
      moteur.demarrer(commande.id, commande.params)
      break
    case 'regler':
      moteur.regler(commande.id, commande.params)
      break
    case 'arreter':
      moteur.arreter(commande.id)
      break
    case 'parler':
      voix.parler(commande.texte)
      break
    case 'arreter-voix':
      voix.arreter()
      break
  }
}

/**
 * Relie un moteur de missions au son, en lecture seule (ecouter()). Renvoie la
 * fonction qui déconnecte. Le texte des répliques reste affiché par l'interface.
 */
export function connecterMission(source: SourceEvenements): () => void {
  const traduire = creerTraducteur(() => Date.now())
  return source.ecouter((evenement) => {
    for (const commande of traduire(evenement)) executer(commande)
  })
}

/** État pour la page de démonstration : contexte, nombre de sons, voix choisie. */
export function diagnostic(): { contexte: string; sonsActifs: number; voix: string | null; voixDisponible: boolean } {
  const { moteur, voix } = environnement()
  return {
    contexte: moteur.etatContexte,
    sonsActifs: moteur.sonsActifs,
    voix: voix.voixChoisie?.name ?? null,
    voixDisponible: voix.disponible,
  }
}

/** Réglages enregistrés sans créer le contexte (pour afficher les curseurs avant le premier geste). */
export function reglagesEnregistres(): ReglagesAudio {
  return chargerReglages(stockageNavigateur())
}

/** Pour les tests de la façade : oublie l'environnement. */
export function _reinitialiserPourTests(): void {
  env = null
}
