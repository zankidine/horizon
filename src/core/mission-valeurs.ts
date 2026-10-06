import { formaterDuree, formaterGrandeur, formaterNombre } from '../lib/format-fr'
import * as constantes from './constants'
import { paliers, profilDepuisNiveau, type Niveau } from './niveaux'
import { heuresEnSecondes, arrondirSignificatif } from './units'
import { resoudreCalcul } from './mission-calculs'
import type { DefValeur, Expr } from './mission-types'

/**
 * Valeurs calculées par le code pour les missions : références à constants.ts,
 * expressions, mise en forme française selon le niveau.
 */

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)
}

/**
 * Valeur de la constante de constants.ts portant ce nom : un nombre, ou
 * « NOM.cle » pour une entrée d'une table de nombres (VITESSES_CROISIERE_KM_H.normale).
 */
export function resoudreRef(nom: string): number | undefined {
  const [racine, cle, ...reste] = nom.split('.')
  if (reste.length > 0 || !Object.prototype.hasOwnProperty.call(constantes, racine)) return undefined
  const valeur = (constantes as Record<string, unknown>)[racine]
  if (cle === undefined) return typeof valeur === 'number' && Number.isFinite(valeur) ? valeur : undefined
  if (!estObjet(valeur) || !Object.prototype.hasOwnProperty.call(valeur, cle)) return undefined
  const entree = valeur[cle]
  return typeof entree === 'number' && Number.isFinite(entree) ? entree : undefined
}

/** Calcule une expression ; lève une erreur si une référence est inconnue. */
export function evaluer(expr: Expr): number {
  if ('ref' in expr) {
    const valeur = resoudreRef(expr.ref)
    if (valeur === undefined) throw new RangeError(`Constante inconnue : « ${expr.ref} »`)
    return valeur
  }
  if ('calcul' in expr) {
    const valeur = resoudreCalcul(expr.calcul)
    if (valeur === undefined) throw new RangeError(`Calcul inconnu : « ${expr.calcul} »`)
    return valeur
  }
  if ('produit' in expr) return expr.produit.reduce((total, e) => total * evaluer(e), 1)
  if ('somme' in expr) return expr.somme.reduce((total, e) => total + evaluer(e), 0)
  const [dividende, diviseur] = expr.quotient
  const d = evaluer(diviseur)
  if (d === 0) throw new RangeError('Division par zéro dans une expression')
  return evaluer(dividende) / d
}

/** Nombre arrondi suivi de son unité, séparés par une espace insécable. */
function avecUnite(valeur: number, chiffres: number, unite: string): string {
  return `${formaterNombre(arrondirSignificatif(valeur, chiffres))}\u00a0${unite}`
}

/**
 * Écrit une valeur pour un niveau : arrondie à ses chiffres significatifs, avec
 * « environ » aux niveaux 1 et 2 si la valeur est approximative.
 */
export function formaterValeur(valeur: number, def: Pick<DefValeur, 'format' | 'approximatif'>, niveau: Niveau): string {
  const chiffres = paliers(niveau).chiffresSignificatifs
  const environ = def.approximatif === true && profilDepuisNiveau(niveau) === 'enfant' ? 'environ ' : ''
  switch (def.format) {
    case 'km':
    case 'km/h':
    case 'km/s':
      return environ + formaterGrandeur({ valeur: arrondirSignificatif(valeur, chiffres), unite: def.format })
    case 'm':
    case 'cm':
    case 'm/s':
    case 'kg':
      return environ + avecUnite(valeur, chiffres, def.format)
    case 'pourcent':
      return environ + avecUnite(valeur, chiffres, '%')
    case 'kpa':
      return environ + avecUnite(valeur, chiffres, 'kPa')
    case 'heures':
      return environ + formaterDuree(heuresEnSecondes(valeur), chiffres)
    case 'secondes':
      return environ + formaterDuree(valeur, chiffres)
    case 'nombre':
      return environ + formaterNombre(arrondirSignificatif(valeur, chiffres))
  }
}

/** Les {marqueurs} d'un texte. */
export function marqueursDe(texte: string): string[] {
  return [...texte.matchAll(/\{(\w+)\}/g)].map((m) => m[1])
}
