/**
 * Logique du sélecteur de niveau : les cartes (nom, description, phrase
 * d'exemple) et la lecture/écriture du niveau dans le store.
 */
import { NIVEAUX, type InfoNiveau, type Niveau } from '../../core/niveaux'
import { phraseExempleNiveau } from '../../lib/niveaux-fr'
import { appStore } from '../../lib/stores/app.svelte'

export interface CarteNiveau extends InfoNiveau {
  /** Phrase pour 384 400 km, produite par comparer() à ce niveau. */
  exemple: string
}

export const CARTES_NIVEAU: readonly CarteNiveau[] = NIVEAUX.map((n) => ({
  ...n,
  exemple: phraseExempleNiveau(n.id),
}))

export const MENTION_CHANGEMENT = 'Tu pourras changer plus tard'

export class EtatSelecteurNiveau {
  get niveau(): Niveau {
    return appStore.niveau
  }

  choisir(niveau: Niveau): void {
    appStore.niveau = niveau
  }
}
