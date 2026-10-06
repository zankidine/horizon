/**
 * État du HUD sur la vitre : textes selon le profil, couche « tête » (légère
 * inertie), séquence d'allumage, panneaux repliables, fenêtre système,
 * masquage. Les composants .svelte ne font qu'afficher.
 */
import { tick } from 'svelte'
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
} from '../../lib/hud'
import type { MiseEnPage } from '../../lib/miseEnPage'
import type { Vecteur } from '../../lib/parallaxe'
import { appStore } from '../../lib/stores/app.svelte'
import { validerDonneesHud } from '../../lib/textes-hud'
import { EtatFenetreSysteme } from './fenetre.svelte.ts'

const DONNEES = validerDonneesHud(donneesHud)

/** Fenêtres encore vides : le contenu viendra avec leurs écrans. */
export const IDS_SYSTEME = ['navigation', 'scan', 'communications'] as const
/** Fenêtres qui montrent un panneau : accessibles par un bouton en bas. */
export const IDS_PANNEAUX = ['systemes', 'cible', 'trajet'] as const
export type IdPanneau = (typeof IDS_PANNEAUX)[number]
export type IdSysteme = (typeof IDS_SYSTEME)[number] | IdPanneau

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

export class EtatHud {
  readonly textes = DONNEES.textes
  readonly demo = DONNEES.demo
  readonly idsSysteme = IDS_SYSTEME
  readonly idsPanneaux = IDS_PANNEAUX
  readonly inertieMs = INERTIE_TETE_MS

  masque = $state(false)
  allumes = $state(0)

  systeme = $state<IdSysteme>('navigation')
  readonly fenetre = new EtatFenetreSysteme()

  readonly #contexte: ContexteHud
  #minuteurAllumage: ReturnType<typeof setInterval> | undefined
  #declencheur: HTMLElement | null = null

  constructor(contexte: ContexteHud) {
    this.#contexte = contexte
    this.fenetre.surFermee = () => {
      const declencheur = this.#declencheur
      this.#declencheur = null
      // Le reste de l'écran est inerte tant que la fenêtre est là : on attend qu'il se réveille.
      void tick().then(() => declencheur?.focus())
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

  /** Titre d'une fenêtre : le nom du panneau ou du système. */
  titreFenetre(id: IdSysteme): string {
    switch (id) {
      case 'systemes':
        return this.t(this.textes.ecran.tiroirSystemes)
      case 'cible':
        return this.t(this.textes.ecran.tiroirCible)
      case 'trajet':
        return this.t(this.textes.ecran.tiroirTrajet)
      default:
        return this.t(this.textes.icones[id])
    }
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
