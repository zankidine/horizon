/**
 * Fiche de la cible : seulement ce que le jeu sait réellement (constants.ts
 * et calculs). Le reste vaut `null` : l'écran affiche « scan en cours » puis
 * « donnée indisponible ». Aucune température ni gravité inventée.
 */
import type { Categorie } from './categories'
import type { DonneesVol } from './vol'

export type CleLigne =
  | 'distance'
  | 'diametre'
  | 'taille'
  | 'vitesse'
  | 'duree'
  | 'lumiere'
  | 'radio'
  | 'temperature'
  | 'gravite'
  | 'atmosphere'
  | 'orbite'

export type UniteFiche = 'km' | 'km/h' | 'deg' | 's'

export interface LigneFiche {
  cle: CleLigne
  categorie: Categorie
  /** Valeur réelle, ou null si le jeu ne la connaît pas. */
  valeur: { nombre: number; unite: UniteFiche } | null
  /** Vrai si la valeur vient d'une constante sourcée (NASA) plutôt que d'un calcul du vol. */
  sourcee: boolean
}

export function construireFiche(vol: DonneesVol): LigneFiche[] {
  const calculee = (
    cle: CleLigne,
    categorie: Categorie,
    nombre: number | null,
    unite: UniteFiche
  ): LigneFiche => ({
    cle,
    categorie,
    valeur: nombre === null ? null : { nombre, unite },
    sourcee: false,
  })
  return [
    calculee('distance', 'distance', vol.distanceCibleKm, 'km'),
    {
      ...calculee('diametre', 'distance', vol.diametreCibleKm, 'km'),
      sourcee: true,
    },
    calculee('taille', 'distance', vol.diametreApparentDeg, 'deg'),
    calculee('vitesse', 'vitesse', vol.vitesseKmH, 'km/h'),
    calculee('duree', 'temps', vol.dureeRestanteS, 's'),
    calculee('lumiere', 'lumiere', vol.lumiereCibleS, 's'),
    calculee('radio', 'radio', vol.radioTerreAllerRetourS, 's'),
    calculee('temperature', 'temperature', null, 'km'),
    calculee('gravite', 'gravite', null, 'km'),
    calculee('atmosphere', 'atmosphere', null, 'km'),
    calculee('orbite', 'orbite', null, 'km'),
  ]
}

/** Délai entre deux lignes révélées pendant le scan. */
export const PAS_SCAN_MS = 420

export interface PhaseScan {
  /** Nombre de lignes déjà révélées. */
  revelees: number
  /** Vrai quand le scan est fini : les lignes sans donnée passent à « indisponible ». */
  termine: boolean
}

/** Avancement du scan : une ligne de plus tous les `pas` ms, puis un court temps de fin. */
export function phaseScan(
  ecouleMs: number,
  nbLignes: number,
  mouvementReduit = false,
  pas = PAS_SCAN_MS
): PhaseScan {
  if (nbLignes <= 0) return { revelees: 0, termine: true }
  if (mouvementReduit || !Number.isFinite(ecouleMs))
    return { revelees: nbLignes, termine: true }
  const revelees = Math.min(
    nbLignes,
    Math.max(0, Math.floor(ecouleMs / pas) + 1)
  )
  return { revelees, termine: ecouleMs >= (nbLignes + 1) * pas }
}
