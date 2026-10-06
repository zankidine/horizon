import { formaterValeur } from '../core/mission-valeurs'
import type { FormatValeur } from '../core/mission-types'
import type { Niveau } from '../core/niveaux'

/**
 * Réponses à choisir (niveaux 1 et 2) pour une étape de calcul : la bonne
 * valeur et deux fausses, toutes écrites comme le fait le moteur. Fonctions
 * pures. Les fausses valeurs valent la moitié et le double de la bonne : elles
 * sont toujours hors de la tolérance (au plus 10 %), donc jamais acceptées.
 */

export const FACTEURS_FAUSSES_REPONSES = [0.5, 2] as const

export interface ReponsePossible {
  valeur: number
  libelle: string
  /** Vrai pour la bonne réponse (utile aux tests, pas à l'affichage). */
  correcte: boolean
}

/** Nombre entre 0 et 2, stable pour une graine : la place de la bonne réponse. */
export function placeBonneReponse(graine: string): 0 | 1 | 2 {
  let h = 2166136261
  for (let i = 0; i < graine.length; i++) h = Math.imul(h ^ graine.charCodeAt(i), 16777619) >>> 0
  return (h % 3) as 0 | 1 | 2
}

export function reponsesPossibles(attendu: number, format: FormatValeur, niveau: Niveau, graine: string): ReponsePossible[] {
  const fausses = FACTEURS_FAUSSES_REPONSES.map((f) => attendu * f)
  const ecrire = (valeur: number) => formaterValeur(valeur, { format }, niveau)
  const liste: ReponsePossible[] = fausses.map((valeur) => ({ valeur, libelle: ecrire(valeur), correcte: false }))
  liste.splice(placeBonneReponse(graine), 0, { valeur: attendu, libelle: ecrire(attendu), correcte: true })
  return liste
}

/** Unité à écrire à côté de la saisie. */
export function uniteSaisie(format: FormatValeur): string {
  switch (format) {
    case 'pourcent':
      return '%'
    case 'kpa':
      return 'kPa'
    case 'heures':
      return 'h'
    case 'secondes':
      return 's'
    case 'nombre':
      return ''
    default:
      return format
  }
}
