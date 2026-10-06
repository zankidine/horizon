/**
 * Ratio de pixels du rendu 3D, selon la taille réelle de la zone affichée
 * et le niveau de qualité. Fonction pure.
 */
import { ratioPixelsPlafonne, type NiveauQualite } from '../core/qualite'

/** Nombre maximal de pixels réels rendus par image, par niveau de qualité. */
export const BUDGET_PIXELS: Readonly<Record<NiveauQualite, number>> = {
  bas: 900_000,
  moyen: 1_800_000,
  haut: 3_500_000,
}

/** En dessous, l'image devient trop floue : on préfère laisser le budget. */
export const RATIO_PIXELS_MIN = 0.75

/**
 * Ratio de pixels pour une zone de `largeur` x `hauteur` pixels CSS :
 * le plafond du niveau, abaissé si la zone est si grande que le budget de
 * pixels serait dépassé.
 */
export function ratioPixelsPourZone(
  largeur: number,
  hauteur: number,
  niveau: NiveauQualite,
  ratioAppareil: number | undefined
): number {
  const plafond = ratioPixelsPlafonne(ratioAppareil, niveau)
  const surface = largeur * hauteur
  if (!Number.isFinite(surface) || surface <= 0) return plafond
  const ratioBudget = Math.sqrt(BUDGET_PIXELS[niveau] / surface)
  return Math.max(RATIO_PIXELS_MIN, Math.min(plafond, ratioBudget))
}
