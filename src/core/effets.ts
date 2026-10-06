import { ROULIS_AMPLITUDE_MAX_DEG } from './constants'
import { vitesseVisuelle, type Vec3 } from './vaisseau'

/**
 * Réglages visuels qui dépendent du mouvement du vaisseau, en TypeScript pur.
 * Le rendu (hublot.svelte.ts) les applique ; c'est ici que se décident les
 * règles, dont celles du mouvement réduit (prefers-reduced-motion).
 */

/** Vitesse de défilement de la poussée à pleine intensité, en unités de scène par seconde. */
export const VITESSE_POUSSIERE_MAX = 14

/**
 * Étirement maximal des étoiles à pleine vitesse : leur longueur est
 * multipliée par 1 + ETIREMENT_ETOILES_MAX (2,5 fois). Licence artistique : à
 * 30 km/s les étoiles, à l'infini, ne bougent pas du tout ; on les allonge
 * légèrement pour que la vitesse se sente.
 */
export const ETIREMENT_ETOILES_MAX = 1.5

/** Étirement maximal des grains de poussière proches, à pleine vitesse. */
export const ETIREMENT_POUSSIERE_MAX = 6

/** Part de l'intensité de la poussière conservée en mouvement réduit. */
export const INTENSITE_POUSSIERE_MOUVEMENT_REDUIT = 0.4

export interface EffetsMouvement {
  /** Éclat de la poussière, de 0 à 1. */
  intensitePoussiere: number
  /** Défilement de la poussière, en unités de scène par seconde. */
  vitessePoussiere: number
  /** Étirement des étoiles : 0 = points ronds. */
  etirementEtoiles: number
  /** Étirement de la poussière : 0 = points ronds. */
  etirementPoussiere: number
  /** Vibration visée de la caméra, de 0 à 1 (le rendu lisse la transition). */
  vibration: number
  /** Amplitude du roulis de dérive, en radians (0 = pas de roulis). */
  roulisMaxRad: number
}

/**
 * Effets visuels du mouvement. En mouvement réduit : ni vibration, ni
 * étirement des étoiles (ni de la poussière), ni roulis de dérive ; la
 * poussière reste, avec une intensité réduite.
 */
export function effetsMouvement(
  vitesseKmS: number,
  poussee: boolean,
  mouvementReduit: boolean
): EffetsMouvement {
  const intensite = vitesseVisuelle(vitesseKmS)
  return {
    intensitePoussiere:
      intensite * (mouvementReduit ? INTENSITE_POUSSIERE_MOUVEMENT_REDUIT : 1),
    vitessePoussiere: intensite * VITESSE_POUSSIERE_MAX,
    etirementEtoiles: mouvementReduit ? 0 : intensite * ETIREMENT_ETOILES_MAX,
    etirementPoussiere: mouvementReduit ? 0 : intensite * ETIREMENT_POUSSIERE_MAX,
    vibration: poussee && !mouvementReduit ? 1 : 0,
    roulisMaxRad: mouvementReduit ? 0 : (ROULIS_AMPLITUDE_MAX_DEG * Math.PI) / 180,
  }
}

/** Angle (radians) sous lequel le halo du Soleil est à pleine intensité, et au-delà duquel il s'éteint. */
export const HALO_ANGLE_PLEIN = (20 * Math.PI) / 180
export const HALO_ANGLE_NUL = (60 * Math.PI) / 180

/**
 * Intensité du halo du Soleil selon l'angle entre la direction du regard et
 * celle du Soleil : pleine quand le Soleil est dans le champ de vision, nulle
 * quand il est loin hors du champ, progressive entre les deux.
 */
export function intensiteHaloSoleil(regard: Vec3, soleil: Vec3): number {
  const norme = Math.hypot(...regard) * Math.hypot(...soleil)
  if (!(norme > 0)) return 0
  const cos = (regard[0] * soleil[0] + regard[1] * soleil[1] + regard[2] * soleil[2]) / norme
  const angle = Math.acos(Math.min(1, Math.max(-1, cos)))
  if (angle <= HALO_ANGLE_PLEIN) return 1
  if (angle >= HALO_ANGLE_NUL) return 0
  const t = (angle - HALO_ANGLE_PLEIN) / (HALO_ANGLE_NUL - HALO_ANGLE_PLEIN)
  return 1 - t * t * (3 - 2 * t)
}
