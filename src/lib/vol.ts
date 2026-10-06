/**
 * Données de vol réelles, calculées par le jeu à partir de l'état du vaisseau :
 * cap, vitesse, distance, durée, lumière, délai radio. Fonctions pures.
 * Les constantes viennent de core/constants.ts, qui donne leurs sources.
 */
import { ASTRES } from '../core/astres'
import {
  DIAMETRE_LUNE_KM,
  DIAMETRE_TERRE_KM,
  SECONDES_PAR_HEURE,
} from '../core/constants'
import { distance3D } from '../core/math'
import {
  delaiRadioAllerRetourSecondes,
  tempsLumiereSecondes,
} from '../core/units'
import { directionCap, type EtatVaisseau, type Vec3 } from '../core/vaisseau'
import { diametreAngulaire, versRepereVaisseau } from '../core/astres'

export type CibleId = 'lune' | 'terre'

export const CIBLES: readonly CibleId[] = ['lune', 'terre']

const DEG_PAR_RAD = 180 / Math.PI

/** Cap de boussole en degrés ([0, 360[, 0 = cap de départ, croît vers la droite). */
export function capBoussoleDeg(lacetRad: number): number {
  if (!Number.isFinite(lacetRad)) return 0
  const cap = (((-lacetRad * DEG_PAR_RAD) % 360) + 360) % 360
  return cap === 360 ? 0 : cap
}

/** Direction d'un astre dans le repère du vaisseau (vecteur unitaire). */
function distance(a: Vec3, b: Vec3): number {
  return distance3D(a[0], a[1], a[2], b[0], b[1], b[2])
}

export function directionAstre(etat: EtatVaisseau, cible: CibleId): Vec3 {
  const astre = ASTRES[cible]
  const d = distance(etat.position, astre.position)
  if (!(d > 0)) return [0, 0, -1]
  const monde: Vec3 = [
    (astre.position[0] - etat.position[0]) / d,
    (astre.position[1] - etat.position[1]) / d,
    (astre.position[2] - etat.position[2]) / d,
  ]
  return versRepereVaisseau(etat, monde)
}

/** La cible est l'astre le plus proche du cap : celui qu'on regarde. */
export function choisirCible(etat: EtatVaisseau): CibleId {
  const lune = directionAstre(etat, 'lune')[2]
  const terre = directionAstre(etat, 'terre')[2]
  // La direction « devant » est −z : plus z est négatif, plus l'astre est dans l'axe.
  return lune <= terre ? 'lune' : 'terre'
}

export interface DonneesVol {
  cible: CibleId
  capDeg: number
  vitesseKmS: number
  vitesseKmH: number
  /** Distance au centre de la cible, en km. */
  distanceCibleKm: number
  /** Distance à la surface de la cible, en km (jamais négative). */
  distanceSurfaceKm: number
  /** Durée restante jusqu'à la surface à la vitesse actuelle (temps de mission), ou null si on ne s'en approche pas. */
  dureeRestanteS: number | null
  /** Temps que met la lumière pour venir de la cible, en secondes. */
  lumiereCibleS: number
  /** Distance à la Terre et délai d'un message radio aller-retour avec elle. */
  distanceTerreKm: number
  radioTerreAllerRetourS: number
  /** Diamètre apparent de la cible, en degrés. */
  diametreApparentDeg: number
  /** Diamètre réel de la cible, en km. */
  diametreCibleKm: number
}

const DIAMETRES_KM: Readonly<Record<CibleId, number>> = {
  lune: DIAMETRE_LUNE_KM,
  terre: DIAMETRE_TERRE_KM,
}

/** Toutes les valeurs réelles du HUD pour un état du vaisseau et une cible. */
export function calculerVol(etat: EtatVaisseau, cible: CibleId): DonneesVol {
  const astre = ASTRES[cible]
  const distanceCibleKm = distance(etat.position, astre.position)
  const distanceSurfaceKm = Math.max(0, distanceCibleKm - astre.rayonKm)
  const distanceTerreKm = distance(etat.position, ASTRES.terre.position)
  const cap = directionCap(etat)
  const versCible = directionAstre(etat, cible)
  // On s'approche si la cible est devant (z < 0) et que la vitesse est positive.
  const approche = etat.vitesseKmS > 0 && versCible[2] < 0
  return {
    cible,
    capDeg: capBoussoleDeg(etat.lacet),
    vitesseKmS: etat.vitesseKmS,
    vitesseKmH: etat.vitesseKmS * SECONDES_PAR_HEURE,
    distanceCibleKm,
    distanceSurfaceKm,
    dureeRestanteS:
      approche && cap
        ? distanceSurfaceKm / (etat.vitesseKmS * -versCible[2])
        : null,
    lumiereCibleS: tempsLumiereSecondes(distanceCibleKm),
    distanceTerreKm,
    radioTerreAllerRetourS: delaiRadioAllerRetourSecondes(distanceTerreKm),
    diametreApparentDeg:
      diametreAngulaire(astre.rayonKm, distanceCibleKm) * DEG_PAR_RAD,
    diametreCibleKm: DIAMETRES_KM[cible],
  }
}

/** Avancement de 0 à 1 vers la cible depuis la distance de départ. */
export function progression(
  distanceDepartKm: number,
  distanceKm: number
): number {
  if (!(distanceDepartKm > 0) || !Number.isFinite(distanceKm)) return 0
  return Math.min(1, Math.max(0, 1 - distanceKm / distanceDepartKm))
}

export interface CadreTrajet {
  /** Pixels par km. */
  echelle: number
  /** Position de l'origine du monde dans la zone, en pixels. */
  origineX: number
  origineY: number
}

/**
 * Cadre de la carte du trajet, vue du dessus (x vers la droite, z vers le bas) :
 * l'échelle et le décalage qui font tenir tous les points, marge comprise.
 */
export function cadrerTrajet(
  points: readonly Vec3[],
  largeur: number,
  hauteur: number,
  marge = 0
): CadreTrajet {
  if (points.length === 0 || !(largeur > 0) || !(hauteur > 0)) {
    return { echelle: 1, origineX: 0, origineY: 0 }
  }
  const xs = points.map((p) => p[0])
  const zs = points.map((p) => p[2])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minZ = Math.min(...zs)
  const maxZ = Math.max(...zs)
  const utileL = Math.max(1, largeur - 2 * marge)
  const utileH = Math.max(1, hauteur - 2 * marge)
  const etendueX = Math.max(maxX - minX, 1)
  const etendueZ = Math.max(maxZ - minZ, 1)
  const echelle = Math.min(utileL / etendueX, utileH / etendueZ)
  return {
    echelle,
    origineX: marge + (utileL - etendueX * echelle) / 2 - minX * echelle,
    origineY: marge + (utileH - etendueZ * echelle) / 2 - minZ * echelle,
  }
}
