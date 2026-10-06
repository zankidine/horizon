/**
 * Cycle de vie d'une fenêtre « système » : les états viennent de la fonction
 * pure etatSuivant, ce module ne fait que lancer les minuteries.
 */
import {
  dureeFermeture,
  dureeOuverture,
  DUREE_OUVERTURE_MS,
  etatSuivant,
  type EtatFenetre,
  type EvenementFenetre,
} from '../../lib/hud'

export class EtatFenetreSysteme {
  etat = $state<EtatFenetre>('fermee')
  /** Durée de l'animation en cours, lue par le CSS. */
  duree = $state(DUREE_OUVERTURE_MS)
  /** Appelée une fois la fenêtre complètement fermée. */
  surFermee: (() => void) | undefined

  #minuteur: ReturnType<typeof setTimeout> | undefined

  ouvrir(mouvementReduit: boolean): void {
    this.#aller('ouvrir', dureeOuverture(mouvementReduit))
  }

  fermer(mouvementReduit: boolean): void {
    this.#aller('fermer', dureeFermeture(mouvementReduit))
  }

  /** Repart de zéro : utile pour passer d'une fenêtre à une autre. */
  rouvrir(mouvementReduit: boolean): void {
    clearTimeout(this.#minuteur)
    this.etat = 'fermee'
    this.ouvrir(mouvementReduit)
  }

  #aller(evenement: EvenementFenetre, duree: number): void {
    const suivant = etatSuivant(this.etat, evenement)
    if (suivant === this.etat) return
    this.etat = suivant
    this.duree = duree
    clearTimeout(this.#minuteur)
    this.#minuteur = setTimeout(() => {
      this.etat = etatSuivant(this.etat, 'fin')
      if (this.etat === 'fermee') this.surFermee?.()
    }, duree)
  }

  arreter(): void {
    clearTimeout(this.#minuteur)
  }
}
