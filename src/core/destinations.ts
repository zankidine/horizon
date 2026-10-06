import * as constantes from './constants'
import {
  ErreurValidation,
  estObjet,
  verifierTexteProfil,
  type TexteProfil,
} from './validation'

export interface Destination {
  id: string
  /** Une destination désactivée (« bientôt ») n'a pas de distance et aucun calcul. */
  active: boolean
  nom: TexteProfil
  description: TexteProfil
  /** Nom d'une constante de constants.ts (en km), présente seulement si la destination est active. */
  distanceConstante?: string
  /** Identifiant d'un astre de astres.json (facultatif). Son existence est vérifiée par un test. */
  astre?: string
}

const FORMAT_ID = /^[a-z0-9-]+$/
const SUFFIXE_DISTANCE = '_KM'

/** Valeur de la constante de constants.ts portant ce nom, si c'est un nombre. */
function valeurConstante(nom: string): number | undefined {
  if (!Object.prototype.hasOwnProperty.call(constantes, nom)) return undefined
  const valeur = (constantes as Record<string, unknown>)[nom]
  return typeof valeur === 'number' ? valeur : undefined
}

function verifierDistanceConstante(nom: unknown, chemin: string, problemes: string[]) {
  if (typeof nom !== 'string' || nom === '') {
    problemes.push(`${chemin}.distanceConstante : nom de constante attendu pour une destination active`)
    return
  }
  const valeur = valeurConstante(nom)
  if (valeur === undefined) {
    problemes.push(`${chemin}.distanceConstante : la constante « ${nom} » n'existe pas dans constants.ts`)
  } else if (!nom.endsWith(SUFFIXE_DISTANCE)) {
    problemes.push(`${chemin}.distanceConstante : « ${nom} » n'est pas une distance (nom en ${SUFFIXE_DISTANCE})`)
  } else if (!(valeur > 0)) {
    problemes.push(`${chemin}.distanceConstante : « ${nom} » doit être strictement positive`)
  }
}

/** Valide les données JSON des destinations ; lève ErreurValidation avec tous les problèmes. */
export function validerDestinations(donnees: unknown): Destination[] {
  const problemes: string[] = []
  const liste = estObjet(donnees) ? donnees.destinations : undefined
  if (!Array.isArray(liste) || liste.length === 0) {
    throw new ErreurValidation('destinations', ['« destinations » : tableau non vide attendu'])
  }

  const ids = new Set<string>()
  liste.forEach((brut: unknown, i) => {
    const chemin = `destinations[${i}]`
    if (!estObjet(brut)) {
      problemes.push(`${chemin} : objet attendu`)
      return
    }
    if (typeof brut.id !== 'string' || !FORMAT_ID.test(brut.id)) {
      problemes.push(`${chemin}.id : identifiant en minuscules, chiffres et tirets attendu`)
    } else if (ids.has(brut.id)) {
      problemes.push(`${chemin}.id : « ${brut.id} » est en double`)
    } else {
      ids.add(brut.id)
    }
    if (brut.astre !== undefined && (typeof brut.astre !== 'string' || !FORMAT_ID.test(brut.astre))) {
      problemes.push(`${chemin}.astre : identifiant d'astre (minuscules, chiffres, tirets) attendu s'il est présent`)
    }
    if (typeof brut.active !== 'boolean') problemes.push(`${chemin}.active : booléen attendu`)
    verifierTexteProfil(brut.nom, `${chemin}.nom`, problemes)
    verifierTexteProfil(brut.description, `${chemin}.description`, problemes)

    if (brut.active === true) {
      verifierDistanceConstante(brut.distanceConstante, chemin, problemes)
    } else if (brut.distanceConstante !== undefined) {
      problemes.push(`${chemin}.distanceConstante : interdite pour une destination désactivée (aucun calcul)`)
    }
  })

  if (problemes.length > 0) throw new ErreurValidation('destinations', problemes)
  return liste as Destination[]
}

/** Distance en km d'une destination active, lue dans constants.ts ; undefined si désactivée. */
export function distanceDestinationKm(destination: Destination): number | undefined {
  if (!destination.active || destination.distanceConstante === undefined) return undefined
  return valeurConstante(destination.distanceConstante)
}
