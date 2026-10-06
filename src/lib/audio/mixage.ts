import { CANAUX, estCanal, type Canal } from './catalogue'
import { CLE_AUDIO, VERSION_AUDIO, VOLUMES_PAR_DEFAUT } from './constantes'
import { borner } from './db'

/**
 * Réglages du son du joueur : volume par canal, muet, voix en ligne. Lecture
 * tolérante (chaque valeur invalide est remplacée par sa valeur par défaut) et
 * sauvegarde dans une clé localStorage dédiée.
 */

export interface ReglagesAudio {
  volumes: Record<Canal, number>
  muet: boolean
  /**
   * Autorise les voix en ligne (le texte part vers un service externe). Désactivé
   * par défaut ; à n'activer qu'après avoir montré AVERTISSEMENT_VOIX_EN_LIGNE.
   */
  voixEnLigne: boolean
}

export const AVERTISSEMENT_VOIX_EN_LIGNE =
  'Les voix en ligne envoient le texte lu à un service externe. Activer seulement si un adulte est d’accord.'

export function reglagesParDefaut(): ReglagesAudio {
  return { volumes: { ...VOLUMES_PAR_DEFAUT }, muet: false, voixEnLigne: false }
}

/** Volume valide (0 à 1), ou null. */
export function volumeValide(valeur: unknown): number | null {
  return typeof valeur === 'number' && Number.isFinite(valeur) ? borner(valeur, 0, 1) : null
}

/** Lit des réglages bruts (JSON déjà analysé) ; ne lève jamais d'erreur. */
export function lireReglages(brut: unknown): ReglagesAudio {
  const reglages = reglagesParDefaut()
  if (typeof brut !== 'object' || brut === null || Array.isArray(brut)) return reglages
  const objet = brut as Record<string, unknown>
  if (typeof objet.volumes === 'object' && objet.volumes !== null) {
    for (const [canal, valeur] of Object.entries(objet.volumes)) {
      const v = volumeValide(valeur)
      if (estCanal(canal) && v !== null) reglages.volumes[canal] = v
    }
  }
  if (typeof objet.muet === 'boolean') reglages.muet = objet.muet
  if (typeof objet.voixEnLigne === 'boolean') reglages.voixEnLigne = objet.voixEnLigne
  return reglages
}

export function serialiserReglages(reglages: ReglagesAudio): string {
  return JSON.stringify({ version: VERSION_AUDIO, ...reglages })
}

/** Ce que le stockage doit offrir (localStorage convient). */
export interface Stockage {
  getItem(cle: string): string | null
  setItem(cle: string, valeur: string): void
}

/** Charge les réglages ; sans sauvegarde utilisable, valeurs par défaut. Ne lève jamais d'erreur. */
export function chargerReglages(stockage: Stockage | null | undefined): ReglagesAudio {
  try {
    const brut = stockage?.getItem(CLE_AUDIO)
    if (typeof brut !== 'string') return reglagesParDefaut()
    const donnees: unknown = JSON.parse(brut)
    if (typeof donnees !== 'object' || donnees === null || (donnees as { version?: unknown }).version !== VERSION_AUDIO) {
      return reglagesParDefaut()
    }
    return lireReglages(donnees)
  } catch {
    return reglagesParDefaut()
  }
}

/** Enregistre les réglages. Renvoie false si le stockage refuse (navigation privée, plein). */
export function sauvegarderReglages(stockage: Stockage | null | undefined, reglages: ReglagesAudio): boolean {
  try {
    if (!stockage) return false
    stockage.setItem(CLE_AUDIO, serialiserReglages(reglages))
    return true
  } catch {
    return false
  }
}

/** Le canal peut-il faire du bruit ? (pas muet, volume non nul) */
export function canalActif(reglages: ReglagesAudio, canal: Canal): boolean {
  return !reglages.muet && reglages.volumes[canal] > 0
}

export { CANAUX }
