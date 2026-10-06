/**
 * Budget des graphes animés : le HUD ne doit jamais dégrader la 3D.
 * Fonctions pures ; le moteur (src/ui/ecran/moteur.svelte.ts) les applique.
 */
import type { NiveauQualite } from '../core/qualite'

/** Images par seconde des graphes, selon le niveau de qualité. */
export const IMAGES_PAR_SECONDE: Readonly<Record<NiveauQualite, number>> = {
  haut: 30,
  moyen: 20,
  bas: 10,
}

/** Nombre maximal de canvas animés en même temps. */
export const MAX_CANVAS_ANIMES = 6

/** Plafond du ratio de pixels des canvas du HUD. */
export const RATIO_PIXELS_CANVAS_MAX = 1.5

export function ratioPixelsCanvas(ratioAppareil: number | undefined): number {
  const ratio =
    ratioAppareil !== undefined &&
    Number.isFinite(ratioAppareil) &&
    ratioAppareil > 0
      ? ratioAppareil
      : 1
  return Math.min(ratio, RATIO_PIXELS_CANVAS_MAX)
}

/** Faut-il dessiner une nouvelle image ? `dernierMs` vaut null avant la première. */
export function imageDue(
  maintenantMs: number,
  dernierMs: number | null,
  fps: number
): boolean {
  if (dernierMs === null || !(fps > 0)) return true
  return maintenantMs - dernierMs >= 1000 / fps - 1
}

export interface ConditionsAnimation {
  ongletVisible: boolean
  hudMasque: boolean
  panneauReplie: boolean
  mouvementReduit: boolean
}

/** Un graphe s'anime seulement si rien ne le met en pause et si le mouvement n'est pas réduit. */
export function doitAnimer(c: ConditionsAnimation): boolean {
  return (
    c.ongletVisible && !c.hudMasque && !c.panneauReplie && !c.mouvementReduit
  )
}

/** Un graphe se dessine (même figé) tant que le HUD est visible et le panneau déplié. */
export function doitDessiner(c: ConditionsAnimation): boolean {
  return c.ongletVisible && !c.hudMasque && !c.panneauReplie
}

/** Garde au plus `max` éléments actifs, les premiers par ordre de priorité. */
export function selectionnerAnimes<T extends { priorite: number }>(
  actifs: readonly T[],
  max = MAX_CANVAS_ANIMES
): T[] {
  return [...actifs]
    .sort((a, b) => a.priorite - b.priorite)
    .slice(0, Math.max(0, max))
}

/** Moyenne glissante pour les statistiques : garde les `taille` dernières valeurs. */
export function moyenneGlissante(
  valeurs: readonly number[],
  nouvelle: number,
  taille = 60
): number[] {
  const suite = [...valeurs, nouvelle]
  return suite.length > taille ? suite.slice(suite.length - taille) : suite
}

export function moyenne(valeurs: readonly number[]): number {
  return valeurs.length === 0
    ? 0
    : valeurs.reduce((a, b) => a + b, 0) / valeurs.length
}
