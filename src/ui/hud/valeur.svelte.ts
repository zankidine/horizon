/** Compteur animé : la valeur affichée rejoint la cible en quelques centaines de ms. */
import { DUREE_COMPTEUR_MS, valeurAnimee } from '../../lib/hud'

export class CompteurAnime {
  /** Valeur affichée. */
  valeur = $state(0)
  #image: number | undefined

  /** Vise une nouvelle cible, à partir de la valeur affichée. */
  viser(cible: number, mouvementReduit: boolean): void {
    this.#annuler()
    const depart = this.valeur
    if (mouvementReduit || typeof requestAnimationFrame === 'undefined') {
      this.valeur = cible
      return
    }
    const debut = performance.now()
    const pas = (maintenant: number): void => {
      const ecoule = maintenant - debut
      this.valeur = valeurAnimee(depart, cible, ecoule, DUREE_COMPTEUR_MS)
      this.#image =
        ecoule < DUREE_COMPTEUR_MS ? requestAnimationFrame(pas) : undefined
    }
    this.#image = requestAnimationFrame(pas)
  }

  #annuler(): void {
    if (this.#image !== undefined) cancelAnimationFrame(this.#image)
    this.#image = undefined
  }

  arreter(): void {
    this.#annuler()
  }
}
