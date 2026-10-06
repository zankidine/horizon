import type { TexteProfil } from './validation'

/**
 * Types d'une mission décrite en données (src/data/missions/*.json).
 *
 * Règle : le JSON ne contient aucune valeur calculable. Un nombre vient du code
 * par une référence { "ref": "NOM_DE_CONSTANTE" } (constants.ts), éventuellement
 * combinée par une expression (produit, quotient, somme), ou par un calcul
 * nommé du code ({ "calcul": "fractionOrbiteCachee" }, mission-calculs.ts). Seules exceptions : la
 * part du trajet d'un jalon (0 à 1) et les identifiants.
 *
 * Textes : chaque texte existe en version « enfant » et « adulte ». Les niveaux 1
 * et 2 utilisent les textes « enfant », les niveaux 3 et 4 les textes « adulte »
 * (profilDepuisNiveau, niveaux.ts). Les {marqueurs} sont remplacés par des valeurs.
 */

/** Expression numérique évaluée par le code. */
export type Expr =
  | { ref: string }
  | { produit: Expr[] }
  | { quotient: [Expr, Expr] }
  | { somme: Expr[] }
  | { calcul: string }

/** Façon d'écrire une valeur dans un texte. */
export const FORMATS_VALEUR = [
  'km',
  'km/h',
  'km/s',
  'm',
  'cm',
  'm/s',
  'pourcent',
  'kpa',
  'kg',
  'heures',
  'secondes',
  'nombre',
] as const
export type FormatValeur = (typeof FORMATS_VALEUR)[number]

/** Valeur nommée, utilisable comme {nom} dans les textes de la mission. */
export interface DefValeur {
  expr: Expr
  format: FormatValeur
  /** Aux niveaux 1 et 2, écrit « environ » devant la valeur arrondie. Par défaut non. */
  approximatif?: boolean
}

export const LOCUTEURS = ['copilote', 'controle', 'narrateur'] as const
export type Locuteur = (typeof LOCUTEURS)[number]

export const TYPES_ETAPE = [
  'dialogue',
  'choix',
  'calcul',
  'action',
  'timing',
  'voyage',
  'observation',
  'descente',
] as const
export type TypeEtape = (typeof TYPES_ETAPE)[number]

export const MODES_OBSERVATION = ['reperer', 'scanner'] as const
export type ModeObservation = (typeof MODES_OBSERVATION)[number]

export const ORDRES_ACTION = ['libre', 'impose'] as const
export type OrdreAction = (typeof ORDRES_ACTION)[number]

export const TYPES_JALON = ['radio', 'observation', 'journal'] as const
export type TypeJalon = (typeof TYPES_JALON)[number]

export interface EtapeBase {
  id: string
  type: TypeEtape
  /** Identifiant de la scène (parmi mission.scenes). */
  scene: string
  /** Objectif affiché à l'écran pendant l'étape. */
  objectif: TexteProfil
  /** Rappel doux si le joueur ne fait rien ; à défaut, l'objectif est répété. */
  rappel?: TexteProfil
  /** Étape suivante. Absente seulement pour un choix (chaque option a sa suite) ou une étape finale. */
  suivant?: string
  /** Vrai pour la dernière étape de la mission. */
  fin?: boolean
  /** Effets que l'interface joue au début de l'étape (noms libres : vibration, decollage…). */
  effetsEntree?: string[]
  /** Effets joués à la réussite de l'étape. */
  effetsSortie?: string[]
  /** Entrée du journal de bord débloquée à la fin de l'étape. */
  journal?: string
  /**
   * « J'ai appris » : court texte positif ajouté au journal quand l'étape se
   * termine après un indice ou la solution (obligatoire pour une étape qui a une aide).
   */
  appris?: TexteProfil
  /** Une étoile est gagnée si l'étape est réussie sans avoir eu besoin de la solution expliquée. */
  etoile?: boolean
}

export interface EtapeDialogue extends EtapeBase {
  type: 'dialogue'
  locuteur: Locuteur
  texte: TexteProfil
}

export interface OptionChoix {
  id: string
  texte: TexteProfil
  suivant: string
}

export interface EtapeChoix extends EtapeBase {
  type: 'choix'
  question: TexteProfil
  options: OptionChoix[]
}

/** Aide donnée après une erreur : des indices, puis la solution expliquée. */
export interface AideEtape {
  indices: TexteProfil[]
  solution: TexteProfil
}

export interface EtapeCalcul extends EtapeBase, AideEtape {
  type: 'calcul'
  question: TexteProfil
  /** Réponse attendue, calculée par le code ({reponse} dans les textes d'aide). */
  reponse: Expr
  /** Format de {reponse} dans les textes. */
  formatReponse: FormatValeur
}

export interface Interrupteur {
  id: string
  libelle: TexteProfil
}

export interface EtapeAction extends EtapeBase, AideEtape {
  type: 'action'
  interrupteurs: Interrupteur[]
  /** « impose » : il faut les actionner dans l'ordre de la liste ; « libre » : n'importe lequel. */
  ordre: OrdreAction
}

export interface EtapeTiming extends EtapeBase, AideEtape {
  type: 'timing'
  /** Ce que le joueur doit faire (par exemple « Appuie quand le voyant devient vert »). */
  consigne: TexteProfil
}

export interface Jalon {
  /** Part de la distance parcourue, strictement entre 0 et 1. */
  part: number
  type: TypeJalon
  texte: TexteProfil
  /** Pour une observation : l'astre à regarder. */
  astre?: string
  /** Entrée du journal débloquée à ce jalon. */
  journal?: string
}

export interface EtapeVoyage extends EtapeBase {
  type: 'voyage'
  /** Astre vers lequel le vaisseau fait route. */
  cible: string
  /** Départ : en orbite autour d'un astre, à une altitude, en direction de la cible. */
  depart: { astre: string; altitude: Expr }
  /** Vitesse du vaisseau, en km/s. */
  vitesse: Expr
  /** Accélération du temps (facteur de avancer()). */
  facteurTemps: Expr
  /** Le voyage s'arrête à cette distance du centre de la cible, en km. */
  arrivee: Expr
  jalons: Jalon[]
}

export interface EtapeObservation extends EtapeBase, AideEtape {
  type: 'observation'
  /** L'astre à repérer ou à scanner. */
  cible: string
  mode: ModeObservation
}

export interface EtapeDescente extends EtapeBase, AideEtape {
  type: 'descente'
  /** Ce que le joueur doit faire (garder la vitesse dans la zone). */
  consigne: TexteProfil
  /** Astre sur lequel on descend : sa gravité de surface vient de astres.json. */
  astre: string
  /** Altitude de départ, en mètres. */
  altitudeDepart: Expr
  /** Zone de réussite : vitesse de toucher entre min et max, en m/s. */
  vitesseZone: { min: Expr; max: Expr }
  /** Force du moteur, en multiples de la gravité de l'astre. */
  poussee: Expr
}

export type Etape =
  | EtapeDialogue
  | EtapeChoix
  | EtapeCalcul
  | EtapeAction
  | EtapeTiming
  | EtapeVoyage
  | EtapeObservation
  | EtapeDescente

export interface Scene {
  id: string
  titre: TexteProfil
}

export interface EntreeJournal {
  id: string
  titre: TexteProfil
  texte: TexteProfil
}

export interface Mission {
  id: string
  titre: TexteProfil
  /** Première étape. */
  debut: string
  scenes: Scene[]
  valeurs: Record<string, DefValeur>
  journal: EntreeJournal[]
  etapes: Etape[]
}
