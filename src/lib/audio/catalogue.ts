import { VITESSE_VISUELLE_MAX_KM_S, VITESSE_VISUELLE_MIN_KM_S } from '../../core/constants'
import { borner } from './db'

/**
 * Catalogue des sons : données pures (identifiants, canal, crête, fréquence
 * minimale entre deux déclenchements). La synthèse est dans sons.ts. Pour
 * ajouter un son : voir docs/audio.md.
 */

export const CANAUX = ['ambiance', 'effets', 'voix'] as const
export type Canal = (typeof CANAUX)[number]

export function estCanal(valeur: unknown): valeur is Canal {
  return typeof valeur === 'string' && (CANAUX as readonly string[]).includes(valeur)
}

/** Libellés français des canaux (pour les curseurs). */
export const LIBELLES_CANAUX: Readonly<Record<Canal, string>> = {
  ambiance: 'Ambiance',
  effets: 'Effets',
  voix: 'Voix',
}

export interface InfoSon {
  canal: Exclude<Canal, 'voix'>
  /** Ponctuel : joué une fois. Continu : tourne jusqu'à l'arrêt, réglable. */
  type: 'ponctuel' | 'continu'
  /** Crête maximale du son seul, en gain linéaire avant les gains des canaux (0 à 1). */
  crete: number
  /** Intervalle minimal entre deux déclenchements du même son, en millisecondes. */
  intervalleMinMs: number
  /** Ce que l'oreille doit entendre, en une phrase (pour la documentation et la démo). */
  description: string
}

export const CATALOGUE = {
  'ambiance-cabine': {
    canal: 'ambiance',
    type: 'continu',
    crete: 0.1,
    intervalleMinMs: 0,
    description: 'Grondement grave et souffle doux de la cabine.',
  },
  respiration: {
    canal: 'ambiance',
    type: 'continu',
    crete: 0.07,
    intervalleMinMs: 0,
    description: 'Respiration simulée dans la combinaison, seule pendant la sortie.',
  },
  poussee: {
    canal: 'effets',
    type: 'continu',
    crete: 0.14,
    intervalleMinMs: 0,
    description: 'Bruit filtré des moteurs, intensité réglable.',
  },
  'poussee-impulsion': {
    canal: 'effets',
    type: 'ponctuel',
    crete: 0.15,
    intervalleMinMs: 800,
    description: 'Souffle court de la poussée chronométrée.',
  },
  'bip-ouverture': {
    canal: 'effets',
    type: 'ponctuel',
    crete: 0.16,
    intervalleMinMs: 120,
    description: 'Deux notes douces qui montent.',
  },
  'bip-fermeture': {
    canal: 'effets',
    type: 'ponctuel',
    crete: 0.16,
    intervalleMinMs: 120,
    description: 'Deux notes douces qui descendent.',
  },
  'bip-validation': {
    canal: 'effets',
    type: 'ponctuel',
    crete: 0.18,
    intervalleMinMs: 120,
    description: "Deux notes claires et gaies : c'est juste.",
  },
  'bip-erreur': {
    canal: 'effets',
    type: 'ponctuel',
    crete: 0.14,
    intervalleMinMs: 400,
    description: 'Note grave et douce qui glisse : on réessaie.',
  },
  'radio-debut': {
    canal: 'effets',
    type: 'ponctuel',
    crete: 0.12,
    intervalleMinMs: 800,
    description: "Bip puis crépitement : la radio s'ouvre.",
  },
  'radio-fin': {
    canal: 'effets',
    type: 'ponctuel',
    crete: 0.12,
    intervalleMinMs: 800,
    description: 'Crépitement puis bip grave : la radio se ferme.',
  },
  'radio-coupure': {
    canal: 'effets',
    type: 'ponctuel',
    crete: 0.12,
    intervalleMinMs: 800,
    description: 'Coupure nette : le signal disparaît derrière la Lune.',
  },
  alerte: {
    canal: 'effets',
    type: 'ponctuel',
    crete: 0.12,
    intervalleMinMs: 3000,
    description: 'Deux impulsions graves et douces.',
  },
  'fanfare-etoile': {
    canal: 'effets',
    type: 'ponctuel',
    crete: 0.14,
    intervalleMinMs: 1500,
    description: 'Petite montée de quatre notes pour une étoile.',
  },
  'fanfare-fin': {
    canal: 'effets',
    type: 'ponctuel',
    crete: 0.15,
    intervalleMinMs: 3000,
    description: 'Fanfare courte de fin de mission.',
  },
} as const satisfies Record<string, InfoSon>

export type IdSon = keyof typeof CATALOGUE
export const IDS_SONS = Object.keys(CATALOGUE) as IdSon[]

export type IdSonContinu = {
  [K in IdSon]: (typeof CATALOGUE)[K]['type'] extends 'continu' ? K : never
}[IdSon]
export type IdSonPonctuel = Exclude<IdSon, IdSonContinu>

export function estIdSon(valeur: unknown): valeur is IdSon {
  return typeof valeur === 'string' && Object.prototype.hasOwnProperty.call(CATALOGUE, valeur)
}

export function infoSon(id: IdSon): InfoSon {
  return CATALOGUE[id]
}

/** Réglages d'un son continu. */
export interface ParamsContinu {
  /** Intensité de 0 (silence) à 1 (pleine). */
  intensite?: number
}

/**
 * Intensité du bruit des moteurs de 0 à 1 selon la vitesse visuelle du vaisseau
 * (échelle logarithmique entre la vitesse visuelle minimale et maximale du jeu)
 * et la poussée. Sans poussée : silence. Avec poussée : au moins 0,25.
 */
export function intensitePoussee(vitesseKmS: number, pousseeActive: boolean): number {
  if (!pousseeActive) return 0
  const v = borner(Number.isFinite(vitesseKmS) ? vitesseKmS : 0, VITESSE_VISUELLE_MIN_KM_S, VITESSE_VISUELLE_MAX_KM_S)
  const t = Math.log(v / VITESSE_VISUELLE_MIN_KM_S) / Math.log(VITESSE_VISUELLE_MAX_KM_S / VITESSE_VISUELLE_MIN_KM_S)
  return 0.25 + 0.75 * t
}
