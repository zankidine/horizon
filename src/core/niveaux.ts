import {
  CATEGORIES_AJOUTEES_NIVEAU,
  CHIFFRES_SIGNIFICATIFS_NIVEAU,
  COMPARAISONS_IMAGEES_NIVEAU,
  DELAI_RAPPEL_S_NIVEAU,
  DESCENTE_MARGE_ASSISTANCE_NIVEAU,
  INDICES_MAX_NIVEAU,
  TIMING_FENETRE_S_NIVEAU,
  TOLERANCE_CALCUL_NIVEAU,
  FORMULES_VISIBLES_NIVEAU,
  NOTATION_SCIENTIFIQUE_NIVEAU,
} from './constants'
import type { Profil } from './comparisons'

/**
 * Niveau de connaissance du joueur : il monte quand il apprend.
 * À ne pas confondre avec les grades (Cadet à Amiral), qui viendront plus tard.
 */
export type Niveau = 1 | 2 | 3 | 4

export interface InfoNiveau {
  id: Niveau
  nom: string
  description: string
}

export const NIVEAUX: readonly InfoNiveau[] = [
  { id: 1, nom: 'Découverte', description: 'Des mots simples et des images' },
  { id: 2, nom: 'Explorateur', description: 'Des images et un peu plus de précision' },
  { id: 3, nom: 'Navigateur', description: 'Les chiffres précis et les formules' },
  { id: 4, nom: 'Expert', description: 'Toute la précision et la notation scientifique' },
]

export const NIVEAU_PAR_DEFAUT: Niveau = 1

/** Catégories d'information que le HUD peut afficher. */
export const CATEGORIES_INFO = [
  'distance',
  'vitesse',
  'temps',
  'lumiere',
  'radio',
  'temperature',
  'gravite',
  'atmosphere',
  'orbite',
] as const
export type CategorieInfo = (typeof CATEGORIES_INFO)[number]

/** L'aide donnée dans les missions : jamais d'échec définitif, mais plus ou moins de secours. */
export interface AideNiveau {
  /** Écart relatif toléré pour une réponse numérique (0,1 = 10 %). */
  tolerance: number
  /** Indices donnés avant la solution expliquée. */
  indicesMax: number
  /** Largeur de la fenêtre d'une poussée chronométrée, en secondes (large = assistée). */
  fenetreTimingS: number
  /** Secondes d'inactivité avant un rappel doux de l'objectif. */
  delaiRappelS: number
  /**
   * Descente assistée : le copilote freine quand la vitesse dépasse la vitesse
   * maximale de la zone multipliée par ce nombre (1 = toujours dans la zone) ;
   * null = pas d'aide pendant la descente.
   */
  margeAssistanceDescente: number | null
}

export interface Paliers {
  chiffresSignificatifs: number
  comparaisonsImagees: boolean
  formules: boolean
  notationScientifique: boolean
  /** Catégories visibles, dans l'ordre de CATEGORIES_INFO. */
  categories: readonly CategorieInfo[]
  aide: AideNiveau
}

export function estNiveau(valeur: unknown): valeur is Niveau {
  return valeur === 1 || valeur === 2 || valeur === 3 || valeur === 4
}

/** Ce que le joueur voit à un niveau donné (valeurs : constants.ts, section « Niveaux »). */
export function paliers(niveau: Niveau): Paliers {
  const ajoutees = new Set<string>()
  for (const n of NIVEAUX) {
    if (n.id <= niveau) CATEGORIES_AJOUTEES_NIVEAU[n.id].forEach((c) => ajoutees.add(c))
  }
  return {
    chiffresSignificatifs: CHIFFRES_SIGNIFICATIFS_NIVEAU[niveau],
    comparaisonsImagees: COMPARAISONS_IMAGEES_NIVEAU[niveau],
    formules: FORMULES_VISIBLES_NIVEAU[niveau],
    notationScientifique: NOTATION_SCIENTIFIQUE_NIVEAU[niveau],
    categories: CATEGORIES_INFO.filter((c) => ajoutees.has(c)),
    aide: {
      tolerance: TOLERANCE_CALCUL_NIVEAU[niveau],
      indicesMax: INDICES_MAX_NIVEAU[niveau],
      fenetreTimingS: TIMING_FENETRE_S_NIVEAU[niveau],
      delaiRappelS: DELAI_RAPPEL_S_NIVEAU[niveau],
      margeAssistanceDescente: DESCENTE_MARGE_ASSISTANCE_NIVEAU[niveau],
    },
  }
}

/**
 * Profil de texte pour un niveau : les niveaux 1 et 2 utilisent les textes
 * « enfant », les niveaux 3 et 4 les textes « adulte » (données JSON).
 */
export function profilDepuisNiveau(niveau: Niveau): Profil {
  return niveau <= 2 ? 'enfant' : 'adulte'
}

/** Ce que le jeu sait de la progression du joueur (à compléter avec les grades). */
export interface EtatApprentissage {
  niveau: Niveau
}

/** Niveau à proposer au joueur. Préparation seulement : aucune logique pour l'instant. */
export function niveauSuivantSuggere(_etat: EtatApprentissage): Niveau | null {
  return null
}
