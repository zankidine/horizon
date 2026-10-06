import type { EvenementMission } from '../../core/mission-moteur'
import { CATALOGUE, intensitePoussee, type IdSon, type IdSonContinu, type IdSonPonctuel, type ParamsContinu } from './catalogue'

/**
 * Pont entre le moteur de missions et le son. sonPourEvenement() est une
 * fonction pure : un événement du moteur donne des commandes sonores. Le
 * moteur de missions n'est jamais modifié : on s'abonne avec ecouter(), en
 * lecture seule. Chaque information sonore existe aussi à l'écran (le moteur
 * émet déjà le texte) : aucun son n'est indispensable.
 */

export type Commande =
  | { type: 'jouer'; id: IdSonPonctuel; apresMs?: number }
  | { type: 'demarrer'; id: IdSonContinu; params?: ParamsContinu }
  | { type: 'regler'; id: IdSonContinu; params: ParamsContinu }
  | { type: 'arreter'; id: IdSonContinu }
  | { type: 'parler'; texte: string }
  | { type: 'arreter-voix' }

/** Délai avant le bip de fin de radio, en ms (après le bip de début). */
export const DELAI_FIN_RADIO_MS = 2500

/** La scène de la sortie dans l'espace : l'ambiance se coupe, il reste la respiration. */
export const SCENE_SORTIE = 'sortie'

const jouer = (id: IdSonPonctuel, apresMs?: number): Commande => ({ type: 'jouer', id, ...(apresMs ? { apresMs } : {}) })

/** Commandes sonores d'un événement du moteur de missions (vide si l'événement n'a pas de son). */
export function sonPourEvenement(evenement: EvenementMission): Commande[] {
  switch (evenement.type) {
    case 'mission-demarree':
      return [{ type: 'demarrer', id: 'ambiance-cabine' }]
    case 'scene':
      // Pendant la sortie : plus d'ambiance, seulement la respiration simulée. Sinon : la cabine.
      return evenement.id === SCENE_SORTIE
        ? [
            { type: 'arreter', id: 'ambiance-cabine' },
            { type: 'arreter', id: 'poussee' },
            { type: 'demarrer', id: 'respiration' },
          ]
        : [
            { type: 'arreter', id: 'respiration' },
            { type: 'arreter', id: 'poussee' },
            { type: 'demarrer', id: 'ambiance-cabine' },
          ]
    case 'effet':
      switch (evenement.nom) {
        case 'decollage':
        case 'descente':
          return [{ type: 'demarrer', id: 'poussee', params: { intensite: evenement.nom === 'decollage' ? intensitePoussee(0, true) : 0 } }]
        case 'poussee':
          return [jouer('poussee-impulsion')]
        case 'coupure-radio':
          return [jouer('radio-coupure')]
        case 'radio-retablie':
          return [jouer('radio-debut')]
        default:
          return []
      }
    case 'moteur':
      return [{ type: 'regler', id: 'poussee', params: { intensite: evenement.actif ? 0.8 : 0 } }]
    case 'dialogue':
      if (evenement.locuteur === 'controle') return [jouer('radio-debut'), { type: 'parler', texte: evenement.texte }, jouer('radio-fin', DELAI_FIN_RADIO_MS)]
      return [{ type: 'parler', texte: evenement.texte }]
    case 'radio':
      return [jouer('radio-debut'), jouer('radio-fin', DELAI_FIN_RADIO_MS)]
    case 'reponse':
      return [jouer(evenement.correcte ? 'bip-validation' : 'bip-erreur')]
    case 'contact':
      return [jouer(evenement.dansLaZone ? 'bip-validation' : 'bip-erreur')]
    case 'interrupteur':
      return evenement.actif ? [jouer('bip-validation')] : [jouer('bip-fermeture')]
    case 'choix':
    case 'indice':
      return [jouer('bip-ouverture')]
    case 'fenetre':
      return evenement.etat === 'ouverte' ? [jouer('bip-ouverture')] : []
    case 'observation':
      return [jouer('bip-validation')]
    case 'rappel':
    case 'assistance':
      return [jouer('alerte')]
    case 'etoile':
      return [jouer('fanfare-etoile')]
    case 'mission-terminee':
      return [
        { type: 'arreter', id: 'poussee' },
        { type: 'arreter', id: 'respiration' },
        jouer('fanfare-fin'),
      ]
    default:
      return []
  }
}

/** Intervalle minimal du son d'une commande « jouer », en ms. */
function intervalleDe(id: IdSon): number {
  return CATALOGUE[id].intervalleMinMs
}

/**
 * Anti-répétition : refuse un même son rejoué avant son intervalle minimal
 * (catalogue). L'horloge est injectée (millisecondes) pour les tests.
 */
export function creerAntiRepetition(horloge: () => number): (commande: Commande) => boolean {
  const dernier = new Map<IdSon, number>()
  return (commande) => {
    if (commande.type !== 'jouer') return true
    const maintenant = horloge()
    const avant = dernier.get(commande.id)
    if (avant !== undefined && maintenant - avant < intervalleDe(commande.id)) return false
    dernier.set(commande.id, maintenant)
    return true
  }
}

/** Fonction « événement → commandes » avec anti-répétition (une par abonnement). */
export function creerTraducteur(horloge: () => number): (evenement: EvenementMission) => Commande[] {
  const autoriser = creerAntiRepetition(horloge)
  return (evenement) => sonPourEvenement(evenement).filter(autoriser)
}

/** Ce que le pont attend d'un moteur de missions : seulement s'abonner. */
export interface SourceEvenements {
  ecouter(ecouteur: (evenement: EvenementMission) => void): () => void
}
