import {
  HEURES_PAR_JOUR,
  JOURS_PAR_AN,
  JOURS_PAR_MOIS,
  METRES_PAR_KM,
  SECONDES_PAR_HEURE,
  SECONDES_PAR_MINUTE,
  VITESSE_LUMIERE_KM_S,
} from './constants'

/** Unités de durée, de la plus petite à la plus grande. */
export const UNITES_DUREE = ['seconde', 'minute', 'heure', 'jour', 'mois', 'an'] as const
export type UniteDuree = (typeof UNITES_DUREE)[number]

const SECONDES_PAR_JOUR = SECONDES_PAR_HEURE * HEURES_PAR_JOUR

/** Nombre de secondes dans une unité de durée. */
export const SECONDES_PAR_UNITE: Readonly<Record<UniteDuree, number>> = {
  seconde: 1,
  minute: SECONDES_PAR_MINUTE,
  heure: SECONDES_PAR_HEURE,
  jour: SECONDES_PAR_JOUR,
  mois: SECONDES_PAR_JOUR * JOURS_PAR_MOIS,
  an: SECONDES_PAR_JOUR * JOURS_PAR_AN,
}

export function metresEnKm(metres: number): number {
  return metres / METRES_PAR_KM
}

export function kmEnMetres(km: number): number {
  return km * METRES_PAR_KM
}

export function heuresEnSecondes(heures: number): number {
  return heures * SECONDES_PAR_HEURE
}

export function secondesEnHeures(secondes: number): number {
  return secondes / SECONDES_PAR_HEURE
}

/** Convertit une durée en secondes vers l'unité demandée. */
export function secondesEn(secondes: number, unite: UniteDuree): number {
  return secondes / SECONDES_PAR_UNITE[unite]
}

/** Durée d'un trajet en heures : distance / vitesse. */
export function dureeTrajetHeures(distanceKm: number, vitesseKmH: number): number {
  if (!(vitesseKmH > 0)) {
    throw new RangeError(`Vitesse invalide : ${vitesseKmH} km/h`)
  }
  return distanceKm / vitesseKmH
}

/** Durée d'un trajet en secondes : distance / vitesse. */
export function dureeTrajetSecondes(distanceKm: number, vitesseKmH: number): number {
  return heuresEnSecondes(dureeTrajetHeures(distanceKm, vitesseKmH))
}

/** Temps mis par la lumière pour parcourir la distance, en secondes. */
export function tempsLumiereSecondes(distanceKm: number): number {
  return distanceKm / VITESSE_LUMIERE_KM_S
}

/** Délai d'un message radio aller puis retour, en secondes. */
export function delaiRadioAllerRetourSecondes(distanceKm: number): number {
  return 2 * tempsLumiereSecondes(distanceKm)
}

/**
 * Choisit la plus grande unité dans laquelle la durée vaut au moins 1
 * (les durées de moins d'une seconde restent en secondes).
 */
export function uniteDureeLisible(secondes: number): UniteDuree {
  for (let i = UNITES_DUREE.length - 1; i > 0; i--) {
    const unite = UNITES_DUREE[i]
    if (secondes >= SECONDES_PAR_UNITE[unite]) return unite
  }
  return 'seconde'
}

/** Arrondit à un nombre de chiffres significatifs (0 reste 0). */
export function arrondirSignificatif(valeur: number, chiffres: number): number {
  if (valeur === 0 || !Number.isFinite(valeur)) return valeur
  return Number(valeur.toPrecision(chiffres))
}
