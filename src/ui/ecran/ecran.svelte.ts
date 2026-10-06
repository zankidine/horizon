/**
 * État de l'écran plein écran : la vue 3D occupe toute la page, le HUD flotte
 * devant. Cette classe échantillonne le vaisseau (5 fois par seconde), calcule
 * les valeurs réelles affichées (src/lib/vol.ts), déroule le scan de la cible
 * et porte les alertes. Les composants .svelte ne font qu'afficher.
 */
import { MediaQuery } from 'svelte/reactivity'
import type { NiveauQualite } from '../../core/qualite'
import { formaterHorloge } from '../../lib/horloge'
import { construireFiche, phaseScan, PAS_SCAN_MS } from '../../lib/fiche'
import { lignesJournal } from '../../lib/journal'
import { choisirMiseEnPage, type MiseEnPage } from '../../lib/miseEnPage'
import {
  AUCUN_DECALAGE,
  normaliserOrientation,
  normaliserPointeur,
  type Vecteur,
} from '../../lib/parallaxe'
import { projeterSurEcran, type PointEcran } from '../../lib/projection'
import { appStore } from '../../lib/stores/app.svelte'
import {
  calculerVol,
  choisirCible,
  directionAstre,
  progression,
  type CibleId,
  type DonneesVol,
} from '../../lib/vol'
import {
  CAMERA,
  CREDITS_TEXTURES,
  EtatHublot,
  REGLAGES_QUALITE,
} from '../hublot.svelte'
import { EtatHud } from '../hud/hud.svelte.ts'
import { vaisseau } from '../vaisseau.svelte'
import { moteur } from './moteur.svelte.ts'

export { CREDITS_TEXTURES, REGLAGES_QUALITE }

/** Échantillonnage des valeurs affichées : 5 Hz suffisent à l'œil. */
const PERIODE_ECHANTILLON_MS = 200
/** Une nouvelle cible doit rester la plus proche du cap ce nombre d'échantillons. */
const ECHANTILLONS_CHANGEMENT_CIBLE = 2
const DUREE_ALERTE_MS = 4000
const DUREE_PAROLE_MS = 3000
const PERIODE_JOURNAL_MS = 1400
const LIGNES_JOURNAL = 2
const GRAINE_JOURNAL = 7

type DemandeAutorisation = { requestPermission?: () => Promise<string> }

export class EtatEcran {
  readonly hublot = new EtatHublot()
  readonly hud: EtatHud

  /** Taille de l'écran en pixels CSS, mesurée par le composant. */
  largeur = $state(0)
  hauteur = $state(0)

  /** Direction du regard, de -1 à 1, venant du pointeur ou de l'inclinaison. */
  regard = $state<Vecteur>({ ...AUCUN_DECALAGE })

  // --- Données réelles, échantillonnées ----------------------------------------
  vol = $state.raw<DonneesVol>(calculerVol(vaisseau.etat, 'lune'))
  tempsMission = $state(0)
  /** Distance à la cible quand elle a été choisie : sert à la progression. */
  distanceDepartKm = $state(1)
  #scanDebutMs = $state(0)
  #scanMaintenantMs = $state(0)
  /** Message d'alerte en cours (zone role="status"), ou chaîne vide. */
  alerte = $state('')
  parle = $state(false)
  indexJournal = $state(0)

  readonly #mouvementReduit = new MediaQuery('(prefers-reduced-motion: reduce)')
  #minuteurs: ReturnType<typeof setInterval>[] = []
  #minuteurAlerte: ReturnType<typeof setTimeout> | undefined
  #minuteurParole: ReturnType<typeof setTimeout> | undefined
  #dernierMs = 0
  #candidate: CibleId | null = null
  #votes = 0
  #cible: CibleId = 'lune'
  #orientationActive = false

  readonly miseEnPage = $derived<MiseEnPage>(
    choisirMiseEnPage(this.largeur, this.hauteur)
  )

  /** Cible suivie : la plus proche du cap (stabilisée). */
  get cible(): CibleId {
    return this.#cible
  }

  constructor() {
    this.hud = new EtatHud(this)
    this.#cible = choisirCible(vaisseau.etat)
    this.#reinitialiserCible(this.#cible)
  }

  // --- Contexte lu par EtatHud ------------------------------------------------

  get mouvementReduit(): boolean {
    return this.#mouvementReduit.current
  }

  /** Niveau de qualité réellement utilisé (réglage automatique compris). */
  get niveauQualite(): NiveauQualite {
    return this.hublot.niveau
  }

  get copilote(): string {
    return appStore.copilote || 'Sans nom'
  }

  // --- Valeurs dérivées ----------------------------------------------------------

  get horloge(): string {
    return formaterHorloge(this.tempsMission)
  }

  readonly fiche = $derived(construireFiche(this.vol))

  get avancement(): number {
    return progression(this.distanceDepartKm, this.vol.distanceCibleKm)
  }

  /** Avancement du scan de la cible : lignes révélées, fin. */
  get scan() {
    return phaseScan(
      this.#scanMaintenantMs - this.#scanDebutMs,
      this.fiche.length,
      this.mouvementReduit
    )
  }

  get journal(): { index: number; texte: string }[] {
    const textes = lignesJournal(
      this.indexJournal,
      LIGNES_JOURNAL,
      GRAINE_JOURNAL
    )
    return textes.map((texte, i) => ({
      texte,
      index: this.indexJournal - (LIGNES_JOURNAL - 1 - i),
    }))
  }

  /** Où la cible tombe sur l'écran (fractions), pour le réticule. */
  get ancreReticule(): PointEcran {
    const aspect = this.hauteur > 0 ? this.largeur / this.hauteur : 1
    return projeterSurEcran(
      directionAstre(vaisseau.etat, this.#cible),
      CAMERA.fov,
      aspect
    )
  }

  // --- Cycle de vie ----------------------------------------------------------------

  demarrer(): void {
    this.#dernierMs = performance.now()
    this.#minuteurs.push(
      setInterval(() => this.#echantillonner(), PERIODE_ECHANTILLON_MS),
      setInterval(() => {
        // Le scan se révèle ligne après ligne, plus vite que l'échantillonnage.
        if (!this.scan.termine) this.#scanMaintenantMs = performance.now()
      }, PAS_SCAN_MS / 2),
      setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return
        if (this.hud.masque) return
        this.indexJournal += 1
      }, PERIODE_JOURNAL_MS)
    )
    this.#echantillonner()
    this.#activerOrientationSiPossible()
    this.parler()
  }

  arreter(): void {
    for (const minuteur of this.#minuteurs) clearInterval(minuteur)
    this.#minuteurs = []
    clearTimeout(this.#minuteurAlerte)
    clearTimeout(this.#minuteurParole)
    window.removeEventListener('deviceorientation', this.#surOrientation)
    this.hud.arreter()
  }

  #echantillonner(): void {
    const maintenant = performance.now()
    const dt = (maintenant - this.#dernierMs) / 1000
    this.#dernierMs = maintenant
    if (typeof document !== 'undefined' && document.hidden) return

    this.tempsMission += dt * vaisseau.facteurTemps
    const etat = vaisseau.etat
    const plusProche = choisirCible(etat)
    if (plusProche !== this.#cible) {
      this.#votes = this.#candidate === plusProche ? this.#votes + 1 : 1
      this.#candidate = plusProche
      if (this.#votes >= ECHANTILLONS_CHANGEMENT_CIBLE) {
        this.#cible = plusProche
        this.#reinitialiserCible(plusProche)
        this.declencherAlerte(
          this.hud
            .t(this.hud.textes.ecran.nouvelleCible)
            .replace('{nom}', this.hud.t(this.hud.textes.cibles[plusProche]))
        )
      }
    } else {
      this.#candidate = null
      this.#votes = 0
    }
    this.vol = calculerVol(etat, this.#cible)
    this.#scanMaintenantMs = maintenant
  }

  #reinitialiserCible(cible: CibleId): void {
    this.vol = calculerVol(vaisseau.etat, cible)
    this.distanceDepartKm = Math.max(1, this.vol.distanceCibleKm)
    this.#scanDebutMs = performance.now()
    this.#scanMaintenantMs = this.#scanDebutMs
  }

  // --- Alertes et parole du copilote ---------------------------------------------------

  declencherAlerte(message: string): void {
    this.alerte = message
    clearTimeout(this.#minuteurAlerte)
    this.#minuteurAlerte = setTimeout(() => {
      this.alerte = ''
    }, DUREE_ALERTE_MS)
    this.parler()
  }

  /** Le copilote « parle » : l'onde s'anime quelques secondes. */
  parler(): void {
    this.parle = true
    clearTimeout(this.#minuteurParole)
    this.#minuteurParole = setTimeout(() => {
      this.parle = false
    }, DUREE_PAROLE_MS)
  }

  // --- Regard : pointeur et inclinaison ---------------------------------------------------

  surPointeur(evenement: PointerEvent): void {
    // Au doigt, le pointeur ne dit rien du regard : l'inclinaison s'en charge.
    if (evenement.pointerType === 'touch' || this.#orientationActive) return
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
   * L'inclinaison ne s'active seule que là où aucune autorisation n'est
   * demandée (Android) : sur iOS elle exigerait un geste, le pointeur suffit.
   */
  #activerOrientationSiPossible(): void {
    if (
      typeof window === 'undefined' ||
      !('DeviceOrientationEvent' in window) ||
      navigator.maxTouchPoints === 0
    ) {
      return
    }
    const demande = DeviceOrientationEvent as unknown as DemandeAutorisation
    if (typeof demande.requestPermission === 'function') return
    window.addEventListener('deviceorientation', this.#surOrientation)
    this.#orientationActive = true
  }

  changerQualite(valeur: string): void {
    const choix = REGLAGES_QUALITE.find((option) => option.valeur === valeur)
    if (choix) this.hublot.choisirReglage(choix.valeur)
  }

  /** Relie le moteur de graphes aux réglages de l'écran (qualité, mouvement, thème). */
  synchroniserMoteur(): void {
    moteur.niveau = this.niveauQualite
    moteur.mouvementReduit = this.mouvementReduit
    moteur.lireCouleurs()
  }
}
