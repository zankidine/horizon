/**
 * Disposition du poste de commandement selon la forme de l'écran.
 * Fonction pure : le code d'interface lui passe la taille mesurée.
 */

export type Disposition = 'portrait' | 'paysage'

/** Plus large que haut : paysage. Carré ou invalide : portrait (mobile d'abord). */
export function choisirDisposition(
  largeur: number,
  hauteur: number
): Disposition {
  const valide = Number.isFinite(largeur) && Number.isFinite(hauteur)
  return valide && largeur > hauteur ? 'paysage' : 'portrait'
}

/** Part de la hauteur occupée par la vitre panoramique, par disposition. */
export const PROPORTION_VITRE: Readonly<Record<Disposition, number>> = {
  paysage: 0.6,
  portrait: 0.45,
}
