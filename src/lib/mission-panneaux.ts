import type { TypeEtape } from '../core/mission-types'

/** Les panneaux d'information du HUD qu'une mission peut juger utiles. */
export type PanneauInfo = 'systemes' | 'cible' | 'trajet'

/**
 * Pendant une mission, seuls les panneaux utiles à l'étape en cours restent
 * ouverts : le trajet pendant le voyage, la cible quand il faut observer. Les
 * autres se replient (leur bouton reste là pour les ouvrir). Fonction pure.
 */
export function panneauxUtiles(etape: TypeEtape | null): readonly PanneauInfo[] {
  switch (etape) {
    case 'voyage':
      return ['trajet']
    case 'observation':
      return ['cible']
    default:
      return []
  }
}
