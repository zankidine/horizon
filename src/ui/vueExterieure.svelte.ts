/**
 * Vue extérieure : suit la taille réelle de son conteneur et plafonne le
 * ratio de pixels selon le niveau de qualité, pour que la grande vitre
 * panoramique ne coûte pas plus cher que l'ancien petit cercle.
 */
import { ratioPixelsPourZone } from '../lib/rendu'
import type { EtatHublot } from './hublot.svelte'

export class EtatVue {
  /** Taille du conteneur en pixels CSS, mesurée par le composant. */
  largeur = $state(0)
  hauteur = $state(0)

  readonly #hublot: EtatHublot

  constructor(hublot: EtatHublot) {
    this.#hublot = hublot
  }

  get ratioPixels(): number {
    return ratioPixelsPourZone(
      this.largeur,
      this.hauteur,
      this.#hublot.niveau,
      window.devicePixelRatio
    )
  }
}
