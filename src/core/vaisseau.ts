import {
  DEPART_LACET_DEG,
  DEPART_POSITION_KM,
  DT_MAX_S,
  TANGAGE_MAX_DEG,
  VITESSE_DEMO_KM_S,
  VITESSE_ROTATION_CAP_MAX_DEG_S,
  VITESSE_VISUELLE_MAX_KM_S,
  VITESSE_VISUELLE_MIN_KM_S,
} from './constants'

/**
 * Vaisseau : état et mouvement, en TypeScript pur.
 *
 * Repère du monde : la Terre est à l'origine, la Lune est sur l'axe x (voir
 * astres.ts), y est « en haut ». Le vaisseau regarde vers −z quand son lacet
 * et son tangage sont nuls (comme la caméra de Three.js) ; un lacet positif
 * tourne vers la gauche, un tangage positif vers le haut.
 */

export type Vec3 = readonly [number, number, number]

export interface EtatVaisseau {
  /** Position en kilomètres, dans le repère du monde. */
  readonly position: Vec3
  /** Cap : rotation autour de l'axe vertical, en radians. */
  readonly lacet: number
  /** Cap : inclinaison vers le haut, en radians. */
  readonly tangage: number
  /** Vitesse le long du cap, en kilomètres par seconde. */
  readonly vitesseKmS: number
  /** Poussée active : sert aux effets (vibration), pas au calcul du mouvement. */
  readonly poussee: boolean
}

/** Cap que le vaisseau cherche à atteindre, en radians. */
export interface ConsigneCap {
  lacet: number
  tangage: number
}

export interface OptionsAvancer {
  /** Accélération du temps : multiplie le déplacement, pas la rotation. Par défaut 1. */
  facteurTemps?: number
  /** Si présente, le cap tourne vers cette consigne à vitesse de rotation bornée. */
  consigne?: ConsigneCap
}

const RAD_PAR_DEG = Math.PI / 180
const TANGAGE_MAX = TANGAGE_MAX_DEG * RAD_PAR_DEG
const ROTATION_MAX_RAD_S = VITESSE_ROTATION_CAP_MAX_DEG_S * RAD_PAR_DEG
const TOUR = 2 * Math.PI

/** Ramène un angle dans l'intervalle [−π, π]. */
export function normaliserAngle(angle: number): number {
  const reste = ((angle + Math.PI) % TOUR + TOUR) % TOUR
  return reste - Math.PI
}

export function borner(valeur: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, valeur))
}

/** État de départ : position et cap de départ, à la vitesse de la démonstration, sans poussée. */
export function creerVaisseau(): EtatVaisseau {
  return {
    position: DEPART_POSITION_KM,
    lacet: DEPART_LACET_DEG * RAD_PAR_DEG,
    tangage: 0,
    vitesseKmS: VITESSE_DEMO_KM_S,
    poussee: false,
  }
}

/** Direction (vecteur unitaire, repère du monde) dans laquelle regarde le vaisseau. */
export function directionCap(etat: Pick<EtatVaisseau, 'lacet' | 'tangage'>): Vec3 {
  const cosT = Math.cos(etat.tangage)
  return [
    -cosT * Math.sin(etat.lacet),
    Math.sin(etat.tangage),
    -cosT * Math.cos(etat.lacet),
  ]
}

/** Borne dt entre 0 et DT_MAX_S ; une valeur invalide (NaN, négative) donne 0. */
export function borneDt(dt: number): number {
  return Number.isFinite(dt) && dt > 0 ? Math.min(dt, DT_MAX_S) : 0
}

/** Facteur de temps valide : un nombre fini positif ou nul, sinon 0 (le vaisseau reste en place). */
function facteurValide(facteur: number): number {
  return Number.isFinite(facteur) && facteur > 0 ? facteur : 0
}

/** Fait tourner `actuel` vers `cible` d'au plus `pasMax` radians, par le plus court chemin. */
function tournerVers(actuel: number, cible: number, pasMax: number): number {
  const ecart = normaliserAngle(cible - actuel)
  return normaliserAngle(actuel + borner(ecart, -pasMax, pasMax))
}

/**
 * Fait avancer le vaisseau de dt secondes. Fonction pure : renvoie un nouvel état.
 *
 * - dt est borné à DT_MAX_S (retour d'un onglet resté inactif : pas de saut).
 * - Le déplacement vaut vitesse × dt × facteurTemps, le long du cap.
 * - Le cap tourne vers la consigne, au plus VITESSE_ROTATION_CAP_MAX_DEG_S, en
 *   temps réel (le facteur de temps ne l'accélère pas : confort de mouvement).
 */
export function avancer(
  etat: EtatVaisseau,
  dt: number,
  options: OptionsAvancer = {}
): EtatVaisseau {
  const pas = borneDt(dt)
  const facteur = facteurValide(options.facteurTemps ?? 1)

  let { lacet, tangage } = etat
  if (options.consigne) {
    const pasRotation = ROTATION_MAX_RAD_S * pas
    lacet = tournerVers(lacet, options.consigne.lacet, pasRotation)
    tangage = tournerVers(
      tangage,
      borner(options.consigne.tangage, -TANGAGE_MAX, TANGAGE_MAX),
      pasRotation
    )
  }
  tangage = borner(tangage, -TANGAGE_MAX, TANGAGE_MAX)

  const direction = directionCap({ lacet, tangage })
  const distanceKm = Math.max(0, etat.vitesseKmS) * pas * facteur
  return {
    ...etat,
    lacet,
    tangage,
    position: [
      etat.position[0] + direction[0] * distanceKm,
      etat.position[1] + direction[1] * distanceKm,
      etat.position[2] + direction[2] * distanceKm,
    ],
  }
}

/**
 * Convertit une vitesse réelle (km/s) en intensité visuelle entre 0 et 1,
 * sur une échelle logarithmique : chaque multiplication de la vitesse par
 * le même facteur ajoute la même intensité. Nulle au minimum de l'échelle
 * (et en dessous), plafonnée à 1 au maximum (et au-dessus).
 */
export function vitesseVisuelle(vitesseKmS: number): number {
  if (!Number.isFinite(vitesseKmS) || vitesseKmS <= VITESSE_VISUELLE_MIN_KM_S) return 0
  if (vitesseKmS >= VITESSE_VISUELLE_MAX_KM_S) return 1
  return (
    Math.log(vitesseKmS / VITESSE_VISUELLE_MIN_KM_S) /
    Math.log(VITESSE_VISUELLE_MAX_KM_S / VITESSE_VISUELLE_MIN_KM_S)
  )
}
