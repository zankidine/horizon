/**
 * Logique du panneau de réglage du vaisseau, réservé au mode développement.
 * Il pilote le singleton `vaisseau` pour tester le rendu : vitesse, cap,
 * poussée, accélération du temps, démonstration.
 */
import { ASTRES, apparenceAstre, type Astre } from '../../core/astres'
import { vitesseVisuelle } from '../../core/vaisseau'
import { formaterNombre } from '../../lib/format-fr'
import { vaisseau } from '../vaisseau.svelte'

const CLE_OUVERT = 'horizon.dev.panneauVaisseau.ouvert'
const RAD_PAR_DEG = Math.PI / 180

/** Largeur et hauteur minimales de la fenêtre pour que le panneau soit ouvert d'emblée. */
const FENETRE_MIN_OUVERT = { largeur: 700, hauteur: 500 }

function lireOuvert(): boolean {
  try {
    const memorise = localStorage.getItem(CLE_OUVERT)
    if (memorise) return memorise === 'oui'
  } catch {
    // Sans stockage, on décide selon la taille de la fenêtre.
  }
  // Sur un petit écran, replié d'emblée : il ne cache pas le poste de commandement.
  return (
    window.innerWidth >= FENETRE_MIN_OUVERT.largeur &&
    window.innerHeight >= FENETRE_MIN_OUVERT.hauteur
  )
}

export class EtatPanneauVaisseau {
  ouvert = $state(lireOuvert())

  readonly vaisseau = vaisseau

  basculer(): void {
    this.ouvert = !this.ouvert
    try {
      localStorage.setItem(CLE_OUVERT, this.ouvert ? 'oui' : 'non')
    } catch {
      // Sans stockage, le choix vaut pour la session seulement.
    }
  }

  get lacetDeg(): number {
    return Math.round(vaisseau.etat.lacet / RAD_PAR_DEG)
  }

  get tangageDeg(): number {
    return Math.round(vaisseau.etat.tangage / RAD_PAR_DEG)
  }

  get intensiteVisuelle(): string {
    return formaterNombre(Math.round(vitesseVisuelle(vaisseau.etat.vitesseKmS) * 100)) + ' %'
  }

  get distances(): { terre: string; lune: string } {
    const km = (astre: Astre) =>
      formaterNombre(Math.round(apparenceAstre(vaisseau.etat, astre).distanceKm)) + ' km'
    return { terre: km(ASTRES.terre), lune: km(ASTRES.lune) }
  }

  choisirLacet(deg: number): void {
    vaisseau.choisirCap(deg * RAD_PAR_DEG, vaisseau.consigne.tangage)
  }

  choisirTangage(deg: number): void {
    vaisseau.choisirCap(vaisseau.consigne.lacet, deg * RAD_PAR_DEG)
  }

  basculerDemo(actif: boolean): void {
    vaisseau.demo = actif
  }

  basculerPoussee(): void {
    vaisseau.choisirPoussee(!vaisseau.etat.poussee)
  }
}
