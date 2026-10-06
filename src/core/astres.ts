import {
  DIAMETRE_AFFICHE_MAX_DEG,
  DIAMETRE_AFFICHE_MIN_DEG,
  DIAMETRE_REEL_MAX_DEG,
  DIAMETRE_REEL_MIN_DEG,
  DISTANCE_TERRE_LUNE_KM,
  RAYON_LUNE_KM,
  RAYON_MOYEN_TERRE_KM,
} from './constants'
import type { EtatVaisseau, Vec3 } from './vaisseau'

/** Un astre sphérique : sa position (km, repère du monde) et son rayon (km). */
export interface Astre {
  readonly position: Vec3
  readonly rayonKm: number
}

/**
 * La Terre est à l'origine et la Lune à la distance moyenne Terre-Lune sur
 * l'axe x. La Lune est supposée immobile : le voyage dure quelques heures,
 * elle bouge de moins d'un degré sur son orbite.
 */
export const ASTRES = {
  terre: { position: [0, 0, 0], rayonKm: RAYON_MOYEN_TERRE_KM },
  lune: { position: [DISTANCE_TERRE_LUNE_KM, 0, 0], rayonKm: RAYON_LUNE_KM },
} as const satisfies Record<string, Astre>

export interface ApparenceAstre {
  /** Distance du vaisseau au centre de l'astre, en km. */
  distanceKm: number
  /** Direction du centre de l'astre (vecteur unitaire), dans le repère du monde. */
  direction: Vec3
  /**
   * Même direction dans le repère du vaisseau : x vers la droite, y vers le
   * haut, la caméra regarde vers −z. Le cap fait donc tourner le ciel.
   */
  directionVaisseau: Vec3
  /** Diamètre angulaire réel, en radians : 2 × atan(rayon / distance). */
  diametreAngulaireRad: number
}

/** Diamètre angulaire (radians) d'une sphère de rayon donné vue à une distance donnée. */
export function diametreAngulaire(rayonKm: number, distanceKm: number): number {
  if (!(distanceKm > 0)) return Math.PI
  return 2 * Math.atan(rayonKm / distanceKm)
}

/** Passe un vecteur du repère du monde au repère du vaisseau (inverse de lacet puis tangage). */
export function versRepereVaisseau(
  etat: Pick<EtatVaisseau, 'lacet' | 'tangage'>,
  v: Vec3
): Vec3 {
  const cosL = Math.cos(etat.lacet)
  const sinL = Math.sin(etat.lacet)
  const x1 = v[0] * cosL - v[2] * sinL
  const z1 = v[0] * sinL + v[2] * cosL
  const cosT = Math.cos(etat.tangage)
  const sinT = Math.sin(etat.tangage)
  return [x1, v[1] * cosT + z1 * sinT, -v[1] * sinT + z1 * cosT]
}

/** Direction, distance et diamètre angulaire d'un astre vu du vaisseau. */
export function apparenceAstre(etat: EtatVaisseau, astre: Astre): ApparenceAstre {
  const dx = astre.position[0] - etat.position[0]
  const dy = astre.position[1] - etat.position[1]
  const dz = astre.position[2] - etat.position[2]
  const distanceKm = Math.hypot(dx, dy, dz)
  // Au centre même de l'astre la direction n'existe pas : on garde l'avant.
  const direction: Vec3 =
    distanceKm > 0 ? [dx / distanceKm, dy / distanceKm, dz / distanceKm] : [0, 0, -1]
  return {
    distanceKm,
    direction,
    directionVaisseau: versRepereVaisseau(etat, direction),
    diametreAngulaireRad: diametreAngulaire(astre.rayonKm, distanceKm),
  }
}

const RAD_PAR_DEG = Math.PI / 180

/**
 * Taille à l'écran (radians) d'un astre dont le diamètre angulaire réel est
 * donné. Compression logarithmique : la taille réelle de DIAMETRE_REEL_MIN_DEG
 * à DIAMETRE_REEL_MAX_DEG est ramenée de DIAMETRE_AFFICHE_MIN_DEG à
 * DIAMETRE_AFFICHE_MAX_DEG, et bornée au-delà. Elle croît toujours avec la
 * taille réelle : un astre qui se rapproche grossit à l'écran.
 */
export function diametreAffiche(diametreReelRad: number): number {
  const reelMin = DIAMETRE_REEL_MIN_DEG * RAD_PAR_DEG
  const reelMax = DIAMETRE_REEL_MAX_DEG * RAD_PAR_DEG
  const afficheMin = DIAMETRE_AFFICHE_MIN_DEG * RAD_PAR_DEG
  const afficheMax = DIAMETRE_AFFICHE_MAX_DEG * RAD_PAR_DEG
  if (!(diametreReelRad > reelMin)) return afficheMin
  if (diametreReelRad >= reelMax) return afficheMax
  const t = Math.log(diametreReelRad / reelMin) / Math.log(reelMax / reelMin)
  return afficheMin + (afficheMax - afficheMin) * t
}
