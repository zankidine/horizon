/**
 * Logique du poste de commandement : disposition, profondeur des couches,
 * interrupteurs et boutons. Les composants .svelte ne font qu'afficher.
 */
import { MediaQuery } from 'svelte/reactivity'
import { choisirDisposition, PROPORTION_VITRE } from '../../lib/disposition'
import {
  AUCUN_DECALAGE,
  decalageCouche,
  normaliserOrientation,
  normaliserPointeur,
  type Vecteur,
} from '../../lib/parallaxe'
import type { NiveauQualite } from '../../core/qualite'
import donneesHud from '../../data/hud.json'
import { validerDonneesHud } from '../../lib/textes-hud'
import { appStore } from '../../lib/stores/app.svelte'
import {
  CREDITS_TEXTURES,
  EtatHublot,
  REGLAGES_QUALITE,
} from '../hublot.svelte'

const TEXTES_HUD = validerDonneesHud(donneesHud).textes

export { CREDITS_TEXTURES, REGLAGES_QUALITE }

/** Profondeur de chaque couche : 0 = fond immobile, 1 = premier plan. */
export const PROFONDEURS = {
  vue: 0.15,
  vitre: 0.4,
  tableau: 0.7,
  premierPlan: 1,
} as const

/** Durée pendant laquelle le voyant d'alerte clignote. */
const DUREE_ALERTE_MS = 1800

type DemandeAutorisation = { requestPermission?: () => Promise<string> }

export class EtatPoste {
  readonly hublot = new EtatHublot()

  /** Taille du poste en pixels CSS, mesurée par le composant. */
  largeur = $state(0)
  hauteur = $state(0)

  /** Direction du regard, de -1 à 1, venant du pointeur ou de l'inclinaison. */
  regard = $state<Vecteur>({ ...AUCUN_DECALAGE })
  inclinaisonActive = $state(false)
  eclairage = $state(true)
  ecransAllumes = $state(true)
  alerte = $state(false)

  readonly disposition = $derived(
    choisirDisposition(this.largeur, this.hauteur)
  )
  readonly proportionVitre = $derived(PROPORTION_VITRE[this.disposition])

  /** L'inclinaison n'a de sens que sur un appareil tactile qui la mesure. */
  readonly inclinaisonDisponible =
    typeof window !== 'undefined' &&
    'DeviceOrientationEvent' in window &&
    navigator.maxTouchPoints > 0

  readonly #mouvementReduit = new MediaQuery('(prefers-reduced-motion: reduce)')
  #minuteurAlerte: ReturnType<typeof setTimeout> | undefined

  get mouvementReduit(): boolean {
    return this.#mouvementReduit.current
  }

  /** Niveau de qualité réellement utilisé (réglage automatique compris). */
  get niveauQualite(): NiveauQualite {
    return this.hublot.niveau
  }

  get copilote(): string {
    return appStore.copilote
  }

  /** Texte des écrans du tableau de bord tant qu'ils n'ont pas de contenu. */
  get texteVeille(): string {
    return TEXTES_HUD.veille[appStore.profile]
  }

  /** Valeur de `transform` pour une couche à cette profondeur. */
  decalage(profondeur: number): string {
    const { x, y } = decalageCouche(
      this.regard,
      profondeur,
      this.mouvementReduit
    )
    return `translate3d(${x}px, ${y}px, 0)`
  }

  surPointeur(evenement: PointerEvent): void {
    // Au doigt, le pointeur ne dit rien du regard : l'inclinaison s'en charge.
    if (evenement.pointerType === 'touch' || this.inclinaisonActive) return
    this.regard = normaliserPointeur(
      evenement.clientX,
      evenement.clientY,
      window.innerWidth,
      window.innerHeight
    )
  }

  readonly #surOrientation = (evenement: DeviceOrientationEvent): void => {
    this.regard = normaliserOrientation(evenement.gamma, evenement.beta)
  }

  /**
   * Active ou coupe le décalage par inclinaison. Sur iOS, l'autorisation
   * doit être demandée à la suite d'un geste : d'où l'interrupteur.
   */
  async basculerInclinaison(): Promise<void> {
    if (this.inclinaisonActive) {
      this.#arreterInclinaison()
      return
    }
    const demande = DeviceOrientationEvent as unknown as DemandeAutorisation
    if (typeof demande.requestPermission === 'function') {
      try {
        if ((await demande.requestPermission()) !== 'granted') return
      } catch {
        return
      }
    }
    window.addEventListener('deviceorientation', this.#surOrientation)
    this.inclinaisonActive = true
  }

  #arreterInclinaison(): void {
    window.removeEventListener('deviceorientation', this.#surOrientation)
    this.inclinaisonActive = false
    this.regard = { ...AUCUN_DECALAGE }
  }

  basculerEclairage(): void {
    this.eclairage = !this.eclairage
  }

  basculerEcrans(): void {
    this.ecransAllumes = !this.ecransAllumes
  }

  declencherAlerte(): void {
    this.alerte = true
    clearTimeout(this.#minuteurAlerte)
    this.#minuteurAlerte = setTimeout(() => {
      this.alerte = false
    }, DUREE_ALERTE_MS)
  }

  changerQualite(valeur: string): void {
    const choix = REGLAGES_QUALITE.find((option) => option.valeur === valeur)
    if (choix) this.hublot.choisirReglage(choix.valeur)
  }

  /** À appeler quand le poste disparaît : retire les écouteurs et minuteurs. */
  arreter(): void {
    this.#arreterInclinaison()
    clearTimeout(this.#minuteurAlerte)
  }
}
