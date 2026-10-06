/**
 * Radar circulaire : angles, rayons et intensité des points, en fonctions pures.
 * Les astres (Lune, Terre) sont placés d'après leur vraie direction ; les
 * autres points sont décoratifs et marqués « simulation » à l'écran.
 */
import { bruitFractal, hash } from './bruit'
import type { Direction } from './projection'

const DEUX_PI = 2 * Math.PI

/** Durée d'un tour de balayage, en secondes. */
export const PERIODE_BALAYAGE_S = 4

/** Angle du balayage à l'instant t, dans [0, 2π[ (0 = devant, sens horaire). */
export function angleBalayage(t: number, periode = PERIODE_BALAYAGE_S): number {
  if (!Number.isFinite(t) || !(periode > 0)) return 0
  const tour = (t / periode) % 1
  return (tour < 0 ? tour + 1 : tour) * DEUX_PI
}

/** Azimut d'une direction du repère du vaisseau : 0 devant, positif vers la droite (radians, ]−π, π]). */
export function azimut(direction: Direction): number {
  const a = Math.atan2(direction[0], -direction[2])
  return a === 0 ? 0 : a
}

/**
 * Rayon sur le radar, de 0 (centre) à 1 (bord), à l'échelle logarithmique :
 * la Lune et les objets proches restent lisibles à côté de la Terre lointaine.
 */
export function rayonRadar(distanceKm: number, distanceMaxKm: number): number {
  if (!(distanceKm >= 0) || !(distanceMaxKm > 0)) return 1
  return Math.min(1, Math.log10(1 + distanceKm) / Math.log10(1 + distanceMaxKm))
}

/** Intensité d'un point : 1 quand le balayage vient de passer, puis il s'éteint. */
export function intensiteBlip(
  angleBlip: number,
  angleBalayageRad: number
): number {
  const ecart = (((angleBalayageRad - angleBlip) % DEUX_PI) + DEUX_PI) % DEUX_PI
  return 1 - ecart / DEUX_PI
}

export interface PointRadar {
  /** Angle en radians, 0 devant. */
  angle: number
  /** Rayon de 0 à 1. */
  rayon: number
}

/** Points décoratifs qui dérivent lentement : `n` points, déterministes. */
export function pointsDecoratifs(
  n: number,
  t: number,
  graine = 0
): PointRadar[] {
  const nombre = Math.max(0, Math.floor(n))
  return Array.from({ length: nombre }, (_, i) => ({
    angle:
      (hash(i, graine) * DEUX_PI + 0.15 * t * (hash(i, graine + 1) - 0.5)) %
      DEUX_PI,
    rayon: 0.2 + 0.7 * bruitFractal(t * 0.05 + i * 3.1, graine + 2, 2),
  }))
}
