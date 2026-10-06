import {
  DIAMETRE_TERRE_KM,
  DISTANCE_TERRE_LUNE_KM,
  HAUTEUR_TOUR_EIFFEL_M,
  LONGUEUR_TERRAIN_FOOT_M,
  VITESSE_LUMIERE_KM_S,
  VITESSE_MARCHE_KM_H,
  VITESSE_VOITURE_KM_H,
} from './constants'
import {
  arrondirSignificatif,
  dureeTrajetHeures,
  heuresEnSecondes,
  metresEnKm,
  SECONDES_PAR_UNITE,
  secondesEn,
  tempsLumiereSecondes,
  uniteDureeLisible,
  type UniteDuree,
} from './units'

export type Profil = 'enfant' | 'adulte'

/** Objets de référence auxquels on compare une longueur. */
export type ObjetReference = 'distance-terre-lune' | 'diametre-terre' | 'tour-eiffel' | 'terrain-foot'

export type TypeComparaison = ObjetReference | 'temps-lumiere' | 'trajet-marche' | 'trajet-voiture'

/** Unité de la valeur : un objet de référence (« 30 diamètres terrestres ») ou une durée. */
export type UniteComparaison = ObjetReference | UniteDuree

export type UniteFormule = 'km' | 'km/s' | 'km/h' | 's' | 'h'

export interface Grandeur {
  valeur: number
  /** Absente pour un rapport sans unité (nombre de fois). */
  unite?: UniteFormule
}

/** Formule du calcul (profil adulte) : dividende ÷ diviseur = résultat. */
export interface Formule {
  dividende: Grandeur
  diviseur: Grandeur
  resultat: Grandeur
  /** Vrai si le résultat affiché est exact, faux s'il a été arrondi. */
  resultatExact: boolean
}

export interface Comparaison {
  type: TypeComparaison
  /** Valeur arrondie selon le profil, toujours supérieure ou égale à 1. */
  valeur: number
  unite: UniteComparaison
  /** Vrai si la valeur doit être présentée avec « environ ». */
  approximatif: boolean
  formule?: Formule
}

/** Nombre maximal de comparaisons renvoyées. */
export const MAX_COMPARAISONS = 3

/** Chiffres significatifs gardés selon le profil. */
export const CHIFFRES_SIGNIFICATIFS: Readonly<Record<Profil, number>> = {
  enfant: 2,
  adulte: 4,
}

/**
 * Un objet est « parlant » s'il tient au moins ce nombre de fois dans la distance :
 * « environ 30 diamètres terrestres » plutôt que « 1 fois la distance Terre-Lune ».
 */
export const FOIS_MINIMUM_PARLANT = 2

/** Objets de référence, du plus grand au plus petit. */
const OBJETS: ReadonlyArray<{ type: ObjetReference; longueurKm: number }> = [
  { type: 'distance-terre-lune', longueurKm: DISTANCE_TERRE_LUNE_KM },
  { type: 'diametre-terre', longueurKm: DIAMETRE_TERRE_KM },
  { type: 'tour-eiffel', longueurKm: metresEnKm(HAUTEUR_TOUR_EIFFEL_M) },
  { type: 'terrain-foot', longueurKm: metresEnKm(LONGUEUR_TERRAIN_FOOT_M) },
]

/**
 * Choisit l'objet de référence le plus grand qui tient au moins
 * FOIS_MINIMUM_PARLANT fois dans la distance, à défaut au moins une fois.
 */
function choisirObjet(distanceKm: number) {
  return (
    OBJETS.find((o) => distanceKm / o.longueurKm >= FOIS_MINIMUM_PARLANT) ??
    OBJETS.find((o) => distanceKm / o.longueurKm >= 1)
  )
}

function arrondirResultat(valeur: number, unite?: UniteFormule) {
  const arrondi = arrondirSignificatif(valeur, CHIFFRES_SIGNIFICATIFS.adulte)
  return { resultat: { valeur: arrondi, unite }, resultatExact: arrondi === valeur }
}

/**
 * Exprime une durée dans l'unité la plus lisible puis l'arrondit. Si l'arrondi
 * atteint l'unité suivante (60 secondes), la durée passe dans cette unité (1 minute).
 */
export function dureeArrondie(secondes: number, chiffres: number) {
  let unite = uniteDureeLisible(secondes)
  let valeur = arrondirSignificatif(secondesEn(secondes, unite), chiffres)
  const uniteApresArrondi = uniteDureeLisible(valeur * SECONDES_PAR_UNITE[unite])
  if (uniteApresArrondi !== unite) {
    valeur = arrondirSignificatif(
      secondesEn(valeur * SECONDES_PAR_UNITE[unite], uniteApresArrondi),
      chiffres
    )
    unite = uniteApresArrondi
  }
  return { valeur, unite }
}

function comparerObjet(distanceKm: number, profil: Profil): Comparaison | undefined {
  const objet = choisirObjet(distanceKm)
  if (!objet) return undefined
  const fois = distanceKm / objet.longueurKm
  const comparaison: Comparaison = {
    type: objet.type,
    valeur: arrondirSignificatif(fois, CHIFFRES_SIGNIFICATIFS[profil]),
    unite: objet.type,
    approximatif: profil === 'enfant',
  }
  if (profil === 'adulte') {
    comparaison.formule = {
      dividende: { valeur: distanceKm, unite: 'km' },
      diviseur: { valeur: objet.longueurKm, unite: 'km' },
      ...arrondirResultat(fois),
    }
  }
  return comparaison
}

function comparerDuree(
  type: TypeComparaison,
  secondes: number,
  profil: Profil,
  formule: () => Formule
): Comparaison | undefined {
  if (secondes < SECONDES_PAR_UNITE.seconde) return undefined
  const { valeur, unite } = dureeArrondie(secondes, CHIFFRES_SIGNIFICATIFS[profil])
  const comparaison: Comparaison = { type, valeur, unite, approximatif: profil === 'enfant' }
  if (profil === 'adulte') comparaison.formule = formule()
  return comparaison
}

function comparerTrajet(
  type: 'trajet-marche' | 'trajet-voiture',
  distanceKm: number,
  vitesseKmH: number,
  profil: Profil
) {
  const heures = dureeTrajetHeures(distanceKm, vitesseKmH)
  return comparerDuree(type, heuresEnSecondes(heures), profil, () => ({
    dividende: { valeur: distanceKm, unite: 'km' },
    diviseur: { valeur: vitesseKmH, unite: 'km/h' },
    ...arrondirResultat(heures, 'h'),
  }))
}

/**
 * Compare une distance (en km) à des objets et à des durées de trajet.
 * Ne garde que les comparaisons dont la valeur vaut au moins 1, au plus MAX_COMPARAISONS,
 * dans cet ordre : objet de référence, temps de la lumière, à pied, en voiture.
 */
export function comparer(distanceKm: number, profil: Profil): Comparaison[] {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    throw new RangeError(`Distance invalide : ${distanceKm} km`)
  }
  const secondesLumiere = tempsLumiereSecondes(distanceKm)
  const candidates = [
    comparerObjet(distanceKm, profil),
    comparerDuree('temps-lumiere', secondesLumiere, profil, () => ({
      dividende: { valeur: distanceKm, unite: 'km' },
      diviseur: { valeur: VITESSE_LUMIERE_KM_S, unite: 'km/s' },
      ...arrondirResultat(secondesLumiere, 's'),
    })),
    comparerTrajet('trajet-marche', distanceKm, VITESSE_MARCHE_KM_H, profil),
    comparerTrajet('trajet-voiture', distanceKm, VITESSE_VOITURE_KM_H, profil),
  ]
  return candidates
    .filter((c): c is Comparaison => c !== undefined && c.valeur >= 1)
    .slice(0, MAX_COMPARAISONS)
}
