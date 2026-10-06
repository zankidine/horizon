/**
 * État du HUD sur la vitre : textes selon le profil, couche « tête » (légère
 * inertie), séquence d'allumage, panneaux repliables, fenêtre système,
 * masquage. Les composants .svelte ne font qu'afficher.
 */
import type { TexteProfil } from '../../core/validation'
import type { NiveauQualite } from '../../core/qualite'
import donneesHud from '../../data/hud.json'
import {
  decalageTete,
  elementsAllumes,
  estToucheMasquer,
  fenetreVisible,
  INERTIE_TETE_MS,
  PAS_ALLUMAGE_MS,
  type Ancre,
} from '../../lib/hud'
import type { MiseEnPage } from '../../lib/miseEnPage'
import type { Vecteur } from '../../lib/parallaxe'
import { appStore } from '../../lib/stores/app.svelte'
import { validerDonneesHud } from '../../lib/textes-hud'
import { EtatFenetreSysteme } from './fenetre.svelte.ts'

const DONNEES = validerDonneesHud(donneesHud)

export const IDS_SYSTEME = ['navigation', 'scan', 'communications'] as const
export type IdSysteme = (typeof IDS_SYSTEME)[number]

/** Rangs de la séquence d'allumage, dans l'ordre d'apparition. */
export const RANGS = {
  haut: 0,
  systemes: 1,
  cible: 2,
  trajet: 3,
  copilote: 4,
  reticule: 5,
} as const

const TOTAL_ELEMENTS = Object.keys(RANGS).length

/** Tiroirs des petits écrans : un seul est ouvert à la fois. */
export type IdTiroir = 'systemes' | 'cible' | 'trajet'

/** Ce que le HUD lit de l'écran qui l'héberge. */
export interface ContexteHud {
  readonly miseEnPage: MiseEnPage
  readonly regard: Vecteur
  readonly mouvementReduit: boolean
  readonly niveauQualite: NiveauQualite
  /** Message d'alerte en cours, ou chaîne vide. */
  readonly alerte: string
  /** Taille de l'écran en pixels CSS. */
  readonly largeur: number
  readonly hauteur: number
}

/** Centre de la fenêtre : le milieu de l'écran, que le HUD laisse libre. */
const ANCRE_FENETRE: Ancre = { x: 0.5, y: 0.5 }

export class EtatHud {
  readonly textes = DONNEES.textes
  readonly demo = DONNEES.demo
  readonly idsSysteme = IDS_SYSTEME
  readonly inertieMs = INERTIE_TETE_MS
  readonly ancreFenetre = ANCRE_FENETRE

  masque = $state(false)
  allumes = $state(0)
  /** Tiroir ouvert sur un petit écran (portrait ou compact). */
  tiroir = $state<IdTiroir | null>(null)

  systeme = $state<IdSysteme>('navigation')
  readonly fenetre = new EtatFenetreSysteme()

  readonly #contexte: ContexteHud
  #minuteurAllumage: ReturnType<typeof setInterval> | undefined
  #declencheur: HTMLElement | null = null

  constructor(contexte: ContexteHud) {
    this.#contexte = contexte
    this.fenetre.surFermee = () => {
      this.#declencheur?.focus()
      this.#declencheur = null
    }
  }

  get largeur(): number {
    return this.#contexte.largeur
  }

  get hauteur(): number {
    return this.#contexte.hauteur
  }

  get miseEnPage(): MiseEnPage {
    return this.#contexte.miseEnPage
  }

  /** Portrait et compact replient leurs panneaux dans des tiroirs. */
  get tiroirs(): boolean {
    return this.miseEnPage !== 'paysage'
  }

  get mouvementReduit(): boolean {
    return this.#contexte.mouvementReduit
  }

  /** Le flou d'arrière-plan coûte cher : coupé au niveau « bas ». */
  get flou(): boolean {
    return this.#contexte.niveauQualite !== 'bas'
  }

  get alerte(): string {
    return this.#contexte.alerte
  }

  /** Décalage de la couche « tête », avec son inertie (transition CSS). */
  get transformTete(): string {
    const { x, y } = decalageTete(
      this.#contexte.regard,
      this.#contexte.mouvementReduit
    )
    return `translate3d(${x}px, ${y}px, 0)`
  }

  /** Texte à afficher selon le profil. */
  t(texte: TexteProfil): string {
    return texte[appStore.profile]
  }

  // --- Séquence d'allumage ---------------------------------------------------

  estAllume(rang: number): boolean {
    return rang < this.allumes
  }

  demarrerAllumage(): void {
    clearInterval(this.#minuteurAllumage)
    const debut = performance.now()
    const avancer = (): void => {
      this.allumes = elementsAllumes(
        performance.now() - debut,
        TOTAL_ELEMENTS,
        PAS_ALLUMAGE_MS,
        this.#contexte.mouvementReduit
      )
      if (this.allumes >= TOTAL_ELEMENTS) clearInterval(this.#minuteurAllumage)
    }
    avancer()
    if (this.allumes < TOTAL_ELEMENTS) {
      this.#minuteurAllumage = setInterval(avancer, PAS_ALLUMAGE_MS / 2)
    }
  }

  // --- Tiroirs ---------------------------------------------------------------

  basculerTiroir(id: IdTiroir): void {
    this.tiroir = this.tiroir === id ? null : id
  }

  /** Vrai si ce panneau est affiché : toujours en paysage, sur demande ailleurs. */
  estAffiche(id: IdTiroir): boolean {
    return !this.tiroirs || this.tiroir === id
  }

  // --- Masquer l'interface -----------------------------------------------------

  basculerMasque(): void {
    this.masque = !this.masque
    if (this.masque) this.fenetre.fermer(this.mouvementReduit)
  }

  surTouche(evenement: KeyboardEvent): void {
    // Échap ferme la fenêtre, où que soit le focus.
    if (evenement.key === 'Escape' && this.fenetreVisible) {
      this.fermerSysteme()
      return
    }
    const cible =
      evenement.target instanceof Element ? evenement.target.tagName : ''
    const touche = {
      key: evenement.key,
      ctrlKey: evenement.ctrlKey,
      metaKey: evenement.metaKey,
      altKey: evenement.altKey,
      repeat: evenement.repeat,
      cible,
    }
    if (!estToucheMasquer(touche)) return
    this.basculerMasque()
  }

  // --- Fenêtre système ---------------------------------------------------------

  get fenetreVisible(): boolean {
    return fenetreVisible(this.fenetre.etat)
  }

  /** Vrai si cette fenêtre est ouverte ou en train de s'ouvrir. */
  estSystemeOuvert(id: IdSysteme): boolean {
    return (
      this.systeme === id &&
      (this.fenetre.etat === 'ouverte' || this.fenetre.etat === 'ouverture')
    )
  }

  basculerSysteme(id: IdSysteme, declencheur: HTMLElement | null): void {
    this.#declencheur = declencheur
    if (this.estSystemeOuvert(id)) {
      this.fenetre.fermer(this.mouvementReduit)
      return
    }
    const autre = this.fenetreVisible && this.systeme !== id
    this.systeme = id
    if (autre) this.fenetre.rouvrir(this.mouvementReduit)
    else this.fenetre.ouvrir(this.mouvementReduit)
  }

  fermerSysteme(): void {
    this.fenetre.fermer(this.mouvementReduit)
  }

  arreter(): void {
    clearInterval(this.#minuteurAllumage)
    this.fenetre.arreter()
  }
}
