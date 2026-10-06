/**
 * Mise en page du HUD plein écran, selon la taille de l'écran. Fonction pure.
 *  - portrait : tiroirs repliables en haut et en bas, centre libre ;
 *  - compact : téléphone en paysage (vitre basse), au plus 25 % de l'écran ;
 *  - paysage : colonnes à gauche et à droite, au plus 35 % de l'écran.
 */
import { choisirDisposition } from './disposition'

export type MiseEnPage = 'portrait' | 'compact' | 'paysage'

/** En dessous de cette hauteur, un écran en paysage passe en mode compact. */
export const HAUTEUR_COMPACTE_PX = 520

/** Part maximale de l'écran couverte par le HUD, par mise en page (hors tiroirs ouverts). */
export const COUVERTURE_MAX: Readonly<Record<MiseEnPage, number>> = {
  portrait: 0.25,
  compact: 0.25,
  paysage: 0.35,
}

export function choisirMiseEnPage(
  largeur: number,
  hauteur: number
): MiseEnPage {
  if (choisirDisposition(largeur, hauteur) === 'portrait') return 'portrait'
  return hauteur < HAUTEUR_COMPACTE_PX ? 'compact' : 'paysage'
}
