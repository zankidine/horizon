import { comparer } from '../core/comparisons'
import { DISTANCE_TERRE_LUNE_KM } from '../core/constants'
import { paliers, profilDepuisNiveau, type Niveau } from '../core/niveaux'
import { formaterComparaison } from './format-fr'

/**
 * Phrase d'exemple d'un niveau : la distance Terre-Lune comparée selon le
 * profil du niveau, avec les chiffres significatifs de ses paliers.
 */
export function phraseExempleNiveau(niveau: Niveau): string {
  const [comparaison] = comparer(
    DISTANCE_TERRE_LUNE_KM,
    profilDepuisNiveau(niveau),
    paliers(niveau).chiffresSignificatifs
  )
  return formaterComparaison(comparaison).phrase
}
