/**
 * État du HUD sur la vitre : textes selon le profil, couche « tête » (légère
 * inertie), séquence d'allumage, panneaux repliables, fenêtre système,
 * masquage. Les composants .svelte ne font qu'afficher.
 */
import {
  distanceDestinationKm,
  validerDestinations,
} from '../../core/destinations'
import type { TexteProfil } from '../../core/validation'
import type { NiveauQualite } from '../../core/qualite'
import donneesDestinations from '../../data/destinations.json'
import donneesHud from '../../data/hud.json'
import { formaterNombre, remplir } from '../../lib/format-fr'
import {
  decalageTete,
  elementsAllumes,
  estToucheMasquer,
  fenetreVisible,
  INERTIE_TETE_MS,
  PAS_ALLUMAGE_MS,
  type Ancre,
} from '../../lib/hud'
import type { Vecteur } from '../../lib/parallaxe'
import { appStore } from '../../lib/stores/app.svelte'
import { validerDonneesHud } from '../../lib/textes-hud'
import { EtatFenetreSysteme } from './fenetre.svelte.ts'

const DONNEES = validerDonneesHud(donneesHud)
const DESTINATIONS = validerDestinations(donneesDestinations)

export const IDS_SYSTEME = ['navigation', 'scan', 'communications'] as const
export type IdSysteme = (typeof IDS_SYSTEME)[number]

/** Rangs de la séquence d'allumage, dans l'ordre d'apparition. */
export const RANGS = {
  cap: 0,
  statut: 1,
  cible: 2,
  copilote: 3,
  icones: 4,
  reticule: 5,
} as const
const TOTAL_ELEMENTS = Object.keys(RANGS).length

/** Ce que le HUD lit du poste qui l'héberge. */
export interface ContexteHud {
  readonly disposition: 'paysage' | 'portrait'
  readonly regard: Vecteur
  readonly mouvementReduit: boolean
  readonly niveauQualite: NiveauQualite
  readonly alerte: boolean
  readonly copilote: string
}

/** Vitre claire au centre : la fenêtre s'y place par défaut. */
const ANCRE_FENETRE: Ancre = { x: 0.5, y: 0.5 }

export class EtatHud {
  readonly textes = DONNEES.textes
  readonly demo = DONNEES.demo
  readonly idsSysteme = IDS_SYSTEME
  readonly inertieMs = INERTIE_TETE_MS
  readonly ancreFenetre = ANCRE_FENETRE

  /** Taille de la vitre, mesurée par le composant (pixels CSS). */
  largeur = $state(0)
  hauteur = $state(0)

  masque = $state(false)
  allumes = $state(0)
  /** Panneaux repliables : choix explicites ; sinon ouverts en paysage seulement. */
  #ouverts = $state<Record<string, boolean>>({})

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

  get disposition(): 'paysage' | 'portrait' {
    return this.#contexte.disposition
  }

  get mouvementReduit(): boolean {
    return this.#contexte.mouvementReduit
  }

  /** Le flou d'arrière-plan coûte cher : coupé au niveau « bas ». */
  get flou(): boolean {
    return this.#contexte.niveauQualite !== 'bas'
  }

  get alerte(): boolean {
    return this.#contexte.alerte
  }

  get copilote(): string {
    return this.#contexte.copilote || 'Sans nom'
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

  // --- Données de démonstration, en attendant l'état réel du vaisseau -------

  get cap(): number {
    return this.demo.cap
  }

  /** Nom de la destination visée, selon le profil. */
  get nomCible(): string {
    const destination = DESTINATIONS.find((d) => d.id === this.demo.destination)
    return destination ? this.t(destination.nom) : ''
  }

  /** Distance de la destination, calculée à partir de constants.ts. */
  get distanceKm(): number {
    const destination = DESTINATIONS.find((d) => d.id === this.demo.destination)
    return (destination && distanceDestinationKm(destination)) || 0
  }

  get texteDistance(): string {
    return remplir(this.t(this.textes.cible.distance), {
      valeur: `${formaterNombre(this.distanceKm)} km`,
    })
  }

  get texteReticule(): string {
    return remplir(this.t(this.textes.cible.reticule), { nom: this.nomCible })
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

  // --- Panneaux repliables -----------------------------------------------------

  estOuvert(id: string): boolean {
    return this.#ouverts[id] ?? this.disposition === 'paysage'
  }

  basculerPanneau(id: string): void {
    this.#ouverts[id] = !this.estOuvert(id)
  }

  // --- Masquer l'interface -----------------------------------------------------

  basculerMasque(): void {
    this.masque = !this.masque
    if (this.masque) this.fenetre.fermer(this.mouvementReduit)
  }

  surTouche(evenement: KeyboardEvent): void {
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
