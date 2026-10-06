/**
 * État partagé du vaisseau : la scène 3D le lit, le panneau de développement
 * et, plus tard, le joueur le pilotent. Un seul vaisseau existe dans le jeu,
 * d'où le singleton `vaisseau` : SceneHublot l'utilise par défaut, ce qui
 * permet de la monter (par exemple depuis VueExterieure) sans rien lui passer.
 */
import { FACTEUR_ACCELERATION_TEMPS } from '../core/constants'
import { creerDemo, pilotageDemo, type EtatDemo } from '../core/demo'
import {
  avancer,
  creerVaisseau,
  type ConsigneCap,
  type EtatVaisseau,
} from '../core/vaisseau'

export class SimulationVaisseau {
  /** État physique, remplacé à chaque image (jamais modifié sur place). */
  etat = $state.raw<EtatVaisseau>(creerVaisseau())
  /** Cap visé : le cap réel tourne vers lui, à vitesse bornée. */
  consigne = $state<ConsigneCap>({ lacet: this.etat.lacet, tangage: this.etat.tangage })
  /** Accélération du temps : une seconde réelle fait avancer le vaisseau de ce nombre de secondes. */
  facteurTemps = $state(FACTEUR_ACCELERATION_TEMPS)
  /** Pilotage automatique de la démonstration. */
  demo = $state(true)

  #etatDemo: EtatDemo = creerDemo()

  /**
   * Avance d'une image. En mouvement réduit, le pilotage automatique ne vire
   * plus : le cap ne tourne que sur action du panneau (ou plus tard du joueur).
   * Sans virage, la démonstration foncerait droit sur la Terre en quelques
   * secondes (zoom rapide, puis traversée) : en mouvement réduit elle tourne
   * donc au temps réel (facteur 1). Le facteur choisi au panneau, lui, est respecté.
   */
  mettreAJour(dt: number, mouvementReduit: boolean): void {
    if (this.demo) {
      if (mouvementReduit) {
        this.consigne = { lacet: this.etat.lacet, tangage: this.etat.tangage }
      } else {
        const pilotage = pilotageDemo(this.etat, this.#etatDemo, dt)
        this.#etatDemo = pilotage.demo
        this.consigne = pilotage.consigne
      }
    }
    this.etat = avancer(this.etat, dt, {
      facteurTemps: this.demo && mouvementReduit ? 1 : this.facteurTemps,
      consigne: this.consigne,
    })
  }

  /** Le joueur (ou le panneau) prend la main : fin du pilotage automatique. */
  reprendreLaMain(): void {
    this.demo = false
  }

  choisirVitesse(vitesseKmS: number): void {
    this.etat = { ...this.etat, vitesseKmS }
  }

  choisirPoussee(poussee: boolean): void {
    this.etat = { ...this.etat, poussee }
  }

  /** Vise un cap (radians) : arrête la démonstration. */
  choisirCap(lacet: number, tangage: number): void {
    this.reprendreLaMain()
    this.consigne = { lacet, tangage }
  }
}

export const vaisseau = new SimulationVaisseau()
