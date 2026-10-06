import { ALTITUDE_ORBITE_LUNAIRE_KM, METRES_PAR_KM, RAYON_LUNE_KM, SAUT_TERRE_EXEMPLE_CM } from './constants'
import { astreParId, graviteMs2 } from './astres-donnees'

/**
 * Calculs physiques des missions, en TypeScript pur. Les missions (JSON) les
 * appellent par leur nom : { "calcul": "fractionOrbiteCachee" }. Chaque calcul
 * lit ses données dans constants.ts et astres.json.
 */

/** Gravité de surface de l'astre, en m/s² (astres.json) ; lève une erreur si la donnée manque. */
export function graviteSurfaceMs2(idAstre: string): number {
  const g = graviteMs2(astreParId(idAstre))
  if (g === null) throw new RangeError(`Gravité indisponible pour « ${idAstre} »`)
  return g
}

/** Rapport de la gravité de la Terre à celle de la Lune. */
export function rapportGravitesTerreLune(): number {
  return graviteSurfaceMs2('terre') / graviteSurfaceMs2('lune')
}

/** Hauteur d'un saut sur la Lune, en cm, pour un saut d'exemple sur Terre (même effort : hauteur × g constant). */
export function hauteurSautLuneCm(): number {
  return SAUT_TERRE_EXEMPLE_CM * rapportGravitesTerreLune()
}

/** Rayon de l'orbite lunaire du jeu, en km (rayon de la Lune plus l'altitude). */
export function rayonOrbiteLunaireKm(): number {
  return RAYON_LUNE_KM + ALTITUDE_ORBITE_LUNAIRE_KM
}

/** Période de l'orbite lunaire du jeu, en secondes : 2π √(a³ / (g R²)), avec g de astres.json. */
export function periodeOrbiteLunaireS(): number {
  const gKmS2 = graviteSurfaceMs2('lune') / METRES_PAR_KM
  const mu = gKmS2 * RAYON_LUNE_KM ** 2
  return 2 * Math.PI * Math.sqrt(rayonOrbiteLunaireKm() ** 3 / mu)
}

/**
 * Fraction de chaque orbite passée derrière la Lune, hors de vue de la Terre :
 * 2 asin(R / (R + h)) / (2π), pour un vaisseau qui passe derrière la Lune par
 * le centre de son disque vu de la Terre (cas le plus long).
 */
export function fractionOrbiteCachee(): number {
  return (2 * Math.asin(RAYON_LUNE_KM / rayonOrbiteLunaireKm())) / (2 * Math.PI)
}

/** Même fraction, en pourcentage. */
export function fractionOrbiteCacheePourcent(): number {
  return fractionOrbiteCachee() * 100
}

/** Durée de la coupure radio à chaque orbite, en secondes (ordre de grandeur). */
export function dureeOrbiteCacheeS(): number {
  return fractionOrbiteCachee() * periodeOrbiteLunaireS()
}

/** Calculs appelables depuis une mission. */
export const CALCULS_MISSION: Readonly<Record<string, () => number>> = {
  graviteLuneMs2: () => graviteSurfaceMs2('lune'),
  graviteTerreMs2: () => graviteSurfaceMs2('terre'),
  rapportGravitesTerreLune,
  hauteurSautLuneCm,
  periodeOrbiteLunaireS,
  fractionOrbiteCachee,
  fractionOrbiteCacheePourcent,
  dureeOrbiteCacheeS,
}

/** Valeur du calcul portant ce nom, ou undefined s'il n'existe pas. */
export function resoudreCalcul(nom: string): number | undefined {
  return Object.prototype.hasOwnProperty.call(CALCULS_MISSION, nom) ? CALCULS_MISSION[nom]() : undefined
}
