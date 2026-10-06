import {
  APOLLO_11_DUREE_TRAJET_JOURS,
  DISTANCE_TERRE_LUNE_KM,
  VITESSES_CROISIERE_KM_H,
  type VitesseCroisiere,
} from './constants'
import { distanceDestinationKm, type Destination } from './destinations'
import {
  SECONDES_PAR_UNITE,
  delaiRadioAllerRetourSecondes,
  dureeTrajetSecondes,
  secondesEn,
  tempsLumiereSecondes,
} from './units'

/** Les trois vitesses de croisière, de la plus lente à la plus rapide. */
export const VITESSES = Object.keys(VITESSES_CROISIERE_KM_H) as VitesseCroisiere[]

export interface Trajet {
  destinationId: string
  vitesse: VitesseCroisiere
  vitesseKmH: number
  distanceKm: number
  dureeSecondes: number
  tempsLumiereSecondes: number
  delaiRadioSecondes: number
  /** Combien de fois la vitesse du vaisseau dépasse la vitesse moyenne d'Apollo 11 vers la Lune. */
  foisPlusRapideQueApollo: number
}

/** Durée du trajet d'Apollo 11 vers la Lune, en secondes. */
export const APOLLO_11_DUREE_TRAJET_SECONDES =
  APOLLO_11_DUREE_TRAJET_JOURS * SECONDES_PAR_UNITE.jour

/** Vitesse moyenne d'Apollo 11 sur le trajet Terre-Lune, en km/h. */
export function vitesseMoyenneApolloKmH(): number {
  return DISTANCE_TERRE_LUNE_KM / secondesEn(APOLLO_11_DUREE_TRAJET_SECONDES, 'heure')
}

/**
 * Calcule le trajet jusqu'à une destination à une vitesse de croisière.
 * Refuse une destination désactivée (« bientôt ») : elle n'a pas de distance.
 */
export function calculerTrajet(destination: Destination, vitesse: VitesseCroisiere): Trajet {
  const distanceKm = distanceDestinationKm(destination)
  if (distanceKm === undefined) {
    throw new Error(`La destination « ${destination.id} » n'est pas disponible`)
  }
  if (!Object.prototype.hasOwnProperty.call(VITESSES_CROISIERE_KM_H, vitesse)) {
    throw new RangeError(`Vitesse inconnue : ${String(vitesse)}`)
  }
  const vitesseKmH = VITESSES_CROISIERE_KM_H[vitesse]
  return {
    destinationId: destination.id,
    vitesse,
    vitesseKmH,
    distanceKm,
    dureeSecondes: dureeTrajetSecondes(distanceKm, vitesseKmH),
    tempsLumiereSecondes: tempsLumiereSecondes(distanceKm),
    delaiRadioSecondes: delaiRadioAllerRetourSecondes(distanceKm),
    foisPlusRapideQueApollo: vitesseKmH / vitesseMoyenneApolloKmH(),
  }
}
