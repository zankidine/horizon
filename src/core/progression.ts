import { estObjet } from './validation'
import type { Mission } from './mission-types'

/**
 * Progression du joueur dans une mission : un état simple, sérialisable, et sa
 * sauvegarde versionnée. Fonctions pures : le stockage (localStorage) est
 * injecté, le cœur n'importe rien du navigateur. Les grades viendront plus
 * tard : pour l'instant, seulement un compteur d'étoiles.
 */

export const CLE_PROGRESSION = 'horizon.progression'
export const VERSION_PROGRESSION = 1

export interface EtatProgression {
  mission: string
  /** Étape en cours ; null quand la mission est terminée. */
  etape: string | null
  /** Nombre d'erreurs par étape (elles donnent des indices, jamais un échec). */
  tentatives: Record<string, number>
  /** Entrées du journal de bord débloquées, dans l'ordre. */
  journal: string[]
  /** Étapes dont l'entrée « J'ai appris » est débloquée (étape terminée après un indice ou la solution). */
  appris: string[]
  /** Étapes qui ont rapporté une étoile (une étape ne rapporte qu'une fois). */
  etapesEtoilees: string[]
  /** Nombre d'étoiles : toujours le nombre d'étapes étoilées. */
  etoiles: number
  terminee: boolean
}

/** Ce que le stockage doit offrir (localStorage convient). */
export interface Stockage {
  getItem(cle: string): string | null
  setItem(cle: string, valeur: string): void
}

/** Progression d'un joueur qui commence la mission. */
export function progressionInitiale(mission: Mission): EtatProgression {
  return {
    mission: mission.id,
    etape: mission.debut,
    tentatives: {},
    journal: [],
    appris: [],
    etapesEtoilees: [],
    etoiles: 0,
    terminee: false,
  }
}

/** Nombre d'étoiles qu'on peut gagner dans la mission. */
export function etoilesMax(mission: Mission): number {
  return mission.etapes.filter((e) => e.etoile === true).length
}

/**
 * Lit un état enregistré. Chaque valeur invalide est ignorée séparément :
 * une étape inconnue ramène au début, un identifiant inconnu est écarté.
 * Renvoie null si ce n'est pas l'état de cette mission.
 */
export function lireEtatProgression(brut: unknown, mission: Mission): EtatProgression | null {
  if (!estObjet(brut) || brut.mission !== mission.id) return null
  const etat = progressionInitiale(mission)
  const etapes = new Map(mission.etapes.map((e) => [e.id, e]))
  const entreesJournal = new Set(mission.journal.map((e) => e.id))

  if (estObjet(brut.tentatives)) {
    for (const [id, n] of Object.entries(brut.tentatives)) {
      if (etapes.has(id) && Number.isInteger(n) && (n as number) >= 0) etat.tentatives[id] = n as number
    }
  }
  if (Array.isArray(brut.journal)) {
    for (const id of brut.journal) {
      if (typeof id === 'string' && entreesJournal.has(id) && !etat.journal.includes(id)) etat.journal.push(id)
    }
  }
  if (Array.isArray(brut.appris)) {
    for (const id of brut.appris) {
      if (typeof id === 'string' && etapes.get(id)?.appris !== undefined && !etat.appris.includes(id)) etat.appris.push(id)
    }
  }
  if (Array.isArray(brut.etapesEtoilees)) {
    for (const id of brut.etapesEtoilees) {
      if (typeof id === 'string' && etapes.get(id)?.etoile === true && !etat.etapesEtoilees.includes(id)) {
        etat.etapesEtoilees.push(id)
      }
    }
  }
  etat.etoiles = etat.etapesEtoilees.length

  if (brut.terminee === true) {
    etat.terminee = true
    etat.etape = null
  } else if (typeof brut.etape === 'string' && etapes.has(brut.etape)) {
    etat.etape = brut.etape
  }
  return etat
}

export function serialiserSauvegarde(etats: Readonly<Record<string, EtatProgression>>): string {
  return JSON.stringify({ version: VERSION_PROGRESSION, missions: etats })
}

/** Lit la sauvegarde brute : les états par mission, ou {} si le contenu est absent, illisible ou d'une autre version. */
export function lireSauvegarde(brut: string | null | undefined): Record<string, unknown> {
  if (typeof brut !== 'string') return {}
  let donnees: unknown
  try {
    donnees = JSON.parse(brut)
  } catch {
    return {}
  }
  if (!estObjet(donnees) || donnees.version !== VERSION_PROGRESSION || !estObjet(donnees.missions)) return {}
  return donnees.missions
}

/** Charge la progression d'une mission ; sans sauvegarde utilisable, le joueur recommence au début. Ne lève jamais d'erreur. */
export function chargerProgression(stockage: Stockage, mission: Mission): EtatProgression {
  try {
    const brut = lireSauvegarde(stockage.getItem(CLE_PROGRESSION))[mission.id]
    return lireEtatProgression(brut, mission) ?? progressionInitiale(mission)
  } catch {
    // Stockage indisponible (navigation privée) : on recommence au début.
    return progressionInitiale(mission)
  }
}

/** Enregistre la progression d'une mission en gardant celle des autres. Renvoie false si le stockage refuse. */
export function sauvegarderProgression(stockage: Stockage, etat: EtatProgression): boolean {
  try {
    const existants = lireSauvegarde(stockage.getItem(CLE_PROGRESSION))
    const etats: Record<string, EtatProgression> = {}
    for (const [id, brut] of Object.entries(existants)) {
      // On ne recopie que ce qui a la forme d'un état ; le reste est abandonné.
      if (estObjet(brut) && brut.mission === id) etats[id] = brut as unknown as EtatProgression
    }
    etats[etat.mission] = etat
    stockage.setItem(CLE_PROGRESSION, serialiserSauvegarde(etats))
    return true
  } catch {
    return false
  }
}
