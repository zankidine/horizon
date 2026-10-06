/**
 * Niveaux de qualité graphique du hublot.
 *
 * Fonction pure : aucune dépendance au navigateur. Le code d'interface lit
 * les capacités de l'appareil et les passe ici.
 */

export type NiveauQualite = 'bas' | 'moyen' | 'haut'

export const NIVEAUX_QUALITE: readonly NiveauQualite[] = [
  'bas',
  'moyen',
  'haut',
]

export type TailleTexture = '1k' | '2k' | '4k'

export interface ParametresQualite {
  /** Plafond du ratio de pixels (devicePixelRatio). */
  ratioPixelsMax: number
  /** Nombre de points du ciel étoilé. */
  nombreEtoiles: number
  /** Variante de texture chargée (fichiers déjà redimensionnés). */
  tailleTexture: TailleTexture
  /** Segments en largeur des sphères (la hauteur en est la moitié). */
  segmentsSphere: number
}

export const PARAMETRES_QUALITE: Readonly<
  Record<NiveauQualite, Readonly<ParametresQualite>>
> = {
  bas: {
    ratioPixelsMax: 1.25,
    nombreEtoiles: 2000,
    tailleTexture: '1k',
    segmentsSphere: 32,
  },
  moyen: {
    ratioPixelsMax: 1.5,
    nombreEtoiles: 4000,
    tailleTexture: '2k',
    segmentsSphere: 48,
  },
  haut: {
    ratioPixelsMax: 2,
    nombreEtoiles: 8000,
    tailleTexture: '4k',
    segmentsSphere: 64,
  },
}

/**
 * Capacités de l'appareil. Chaque champ peut manquer : par exemple
 * navigator.deviceMemory n'existe pas sur Safari ni sur iOS.
 */
export interface CapacitesAppareil {
  /** navigator.hardwareConcurrency */
  coeurs?: number
  /** navigator.deviceMemory, en Go */
  memoireGo?: number
  /** window.devicePixelRatio */
  ratioPixels?: number
  /** Plus petit côté de l'écran, en pixels CSS */
  petitCoteEcran?: number
}

/**
 * Valeurs supposées quand le navigateur ne dit rien : un appareil moyen de
 * gamme. Elles ne permettent jamais, seules, d'atteindre le niveau « haut ».
 */
export const CAPACITES_PAR_DEFAUT: Readonly<Required<CapacitesAppareil>> = {
  coeurs: 4,
  memoireGo: 4,
  ratioPixels: 1,
  petitCoteEcran: 768,
}

function valeurOuDefaut(valeur: number | undefined, defaut: number): number {
  return valeur !== undefined && Number.isFinite(valeur) && valeur > 0
    ? valeur
    : defaut
}

/** Choisit automatiquement le niveau de qualité. */
export function choisirQualite(
  capacites: CapacitesAppareil = {}
): NiveauQualite {
  const coeurs = valeurOuDefaut(capacites.coeurs, CAPACITES_PAR_DEFAUT.coeurs)
  const memoireGo = valeurOuDefaut(
    capacites.memoireGo,
    CAPACITES_PAR_DEFAUT.memoireGo
  )
  const ratioPixels = valeurOuDefaut(
    capacites.ratioPixels,
    CAPACITES_PAR_DEFAUT.ratioPixels
  )
  const petitCote = valeurOuDefaut(
    capacites.petitCoteEcran,
    CAPACITES_PAR_DEFAUT.petitCoteEcran
  )

  if (coeurs <= 2 || memoireGo <= 2) return 'bas'

  // Un petit écran très dense (téléphone) coûte cher en pixels.
  const telephoneDense = petitCote < 600 && ratioPixels >= 3

  if (coeurs >= 8 && memoireGo >= 8 && !telephoneDense) return 'haut'
  return 'moyen'
}

/** Ratio de pixels à utiliser, plafonné selon le niveau. */
export function ratioPixelsPlafonne(
  ratioAppareil: number | undefined,
  niveau: NiveauQualite
): number {
  const ratio = valeurOuDefaut(ratioAppareil, CAPACITES_PAR_DEFAUT.ratioPixels)
  return Math.min(ratio, PARAMETRES_QUALITE[niveau].ratioPixelsMax)
}

/** Chemin du fichier de texture pour un niveau, ex. textures/earth-day-2k.jpg */
export function cheminTexture(nom: string, niveau: NiveauQualite): string {
  return `textures/${nom}-${PARAMETRES_QUALITE[niveau].tailleTexture}.jpg`
}
