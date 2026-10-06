import {
  CANAUX,
  CATALOGUE,
  estIdSon,
  type Canal,
  type IdSon,
  type IdSonContinu,
  type ParamsContinu,
} from './catalogue'
import type { ContexteAudio, GainNoeud, NoeudAudio, SessionAudio } from './contexte'
import { COMPRESSEUR, FILTRE_SORTIE_HZ, GAIN_MAITRE_DB, PLAFOND_SORTIE, POLYPHONIE_MAX } from './constantes'
import { borner, dbEnGain, volumeEnGain } from './db'
import {
  canalActif,
  chargerReglages,
  sauvegarderReglages,
  type ReglagesAudio,
  type Stockage,
  volumeValide,
} from './mixage'
import { creerAtelier, demarrerContinu, estContinu, jouerPonctuel, type Atelier, type VoixContinue, type VoixSon } from './sons'

/**
 * Moteur audio : un seul contexte Web Audio, créé au premier geste du joueur,
 * un bus principal avec compresseur-limiteur, des canaux (ambiance, effets,
 * voix), le plafond de polyphonie et les réglages sauvegardés.
 *
 * Chaîne : son → canal → maître → compresseur → passe-bas → plafond → sortie.
 */

/** Courbe du plafond : plafond × tanh(x / plafond). Toujours strictement sous le plafond. */
export function courbePlafond(x: number, plafond: number = PLAFOND_SORTIE): number {
  return plafond * Math.tanh(x / plafond)
}

/** Table de la courbe pour un WaveShaper, de −1 à +1 en `n` points (n impair). */
export function tableCourbePlafond(n = 1025, plafond: number = PLAFOND_SORTIE): Float32Array {
  const table = new Float32Array(n)
  for (let i = 0; i < n; i++) table[i] = courbePlafond((i / (n - 1)) * 2 - 1, plafond)
  return table
}

export interface OptionsMoteurAudio {
  /** Fabrique le contexte (null : pas de Web Audio). Appelée une seule fois, au premier geste. */
  creerContexte: () => ContexteAudio | null
  stockage?: Stockage | null
  /** navigator.audioSession quand il existe (iOS) : son type est réglé sur « playback ». */
  session?: SessionAudio
}

interface Bus {
  canaux: Record<Canal, GainNoeud>
  maitre: GainNoeud
}

interface Actif {
  id: IdSon
  voix: VoixSon
}

export class MoteurAudio {
  readonly #options: OptionsMoteurAudio
  #reglages: ReglagesAudio
  #ctx: ContexteAudio | null = null
  #atelier: Atelier | null = null
  #bus: Bus | null = null
  #cache = false
  #desactive = false
  readonly #ponctuels = new Set<Actif>()
  readonly #continus = new Map<IdSonContinu, { voix: VoixContinue; params: ParamsContinu } | null>()
  /** Sons continus voulus par le jeu : relancés quand leur canal revient. */
  readonly #voulus = new Map<IdSonContinu, ParamsContinu>()

  constructor(options: OptionsMoteurAudio) {
    this.#options = options
    this.#reglages = chargerReglages(options.stockage)
  }

  /** Le contexte existe-t-il (le premier geste a eu lieu) ? */
  get initialise(): boolean {
    return this.#ctx !== null
  }

  /** État du contexte, pour la démonstration et les tests. */
  get etatContexte(): string {
    return this.#ctx?.state ?? 'absent'
  }

  /** Nombre de sons en cours (ponctuels et continus). */
  get sonsActifs(): number {
    let n = this.#ponctuels.size
    for (const c of this.#continus.values()) if (c) n += 1
    return n
  }

  reglages(): ReglagesAudio {
    return { volumes: { ...this.#reglages.volumes }, muet: this.#reglages.muet, voixEnLigne: this.#reglages.voixEnLigne }
  }

  /**
   * À appeler au premier geste du joueur (clic, touche). Crée le contexte une
   * seule fois ; les appels suivants le reprennent s'il est suspendu. Sans
   * Web Audio, le moteur reste silencieux, sans erreur.
   */
  initialiser(): void {
    if (this.#desactive) return
    if (!this.#ctx) {
      let ctx: ContexteAudio | null
      try {
        ctx = this.#options.creerContexte()
      } catch {
        ctx = null
      }
      if (!ctx) {
        this.#desactive = true
        return
      }
      this.#ctx = ctx
      this.#regleSession()
      this.#atelier = creerAtelier(ctx)
      this.#bus = this.#construireBus(ctx)
      this.#appliquerGains()
    }
    this.#actualiserEtat()
    this.#relancerVoulus()
  }

  /** Sur iOS, « playback » fait passer le son même quand le commutateur de sonnerie est coupé. */
  #regleSession(): void {
    const session = this.#options.session
    if (!session || !('type' in session)) return
    try {
      session.type = 'playback'
    } catch {
      // Session non modifiable : le son suivra le réglage du téléphone.
    }
  }

  #construireBus(ctx: ContexteAudio): Bus {
    const maitre = ctx.createGain()
    maitre.gain.setValueAtTime(dbEnGain(GAIN_MAITRE_DB), ctx.currentTime)
    const compresseur = ctx.createDynamicsCompressor()
    compresseur.threshold.setValueAtTime(COMPRESSEUR.seuilDb, ctx.currentTime)
    compresseur.knee.setValueAtTime(COMPRESSEUR.genouDb, ctx.currentTime)
    compresseur.ratio.setValueAtTime(COMPRESSEUR.rapport, ctx.currentTime)
    compresseur.attack.setValueAtTime(COMPRESSEUR.attaqueS, ctx.currentTime)
    compresseur.release.setValueAtTime(COMPRESSEUR.relachementS, ctx.currentTime)
    const passeBas = ctx.createBiquadFilter()
    passeBas.type = 'lowpass'
    passeBas.frequency.setValueAtTime(FILTRE_SORTIE_HZ, ctx.currentTime)
    passeBas.Q.setValueAtTime(0.7, ctx.currentTime)
    const plafond = ctx.createWaveShaper()
    plafond.curve = tableCourbePlafond()
    plafond.oversample = '2x'
    maitre.connect(compresseur)
    compresseur.connect(passeBas)
    passeBas.connect(plafond)
    plafond.connect(ctx.destination)
    const canaux = {} as Record<Canal, GainNoeud>
    for (const canal of CANAUX) {
      const gain = ctx.createGain()
      gain.connect(maitre)
      canaux[canal] = gain
    }
    return { canaux, maitre }
  }

  // --- Réglages ---------------------------------------------------------------

  definirVolume(canal: Canal, valeur: number): void {
    const v = volumeValide(valeur)
    if (v === null) return
    this.#reglages.volumes[canal] = v
    this.#changement()
  }

  definirMuet(muet: boolean): void {
    this.#reglages.muet = muet
    this.#changement()
  }

  definirVoixEnLigne(actif: boolean): void {
    this.#reglages.voixEnLigne = actif
    sauvegarderReglages(this.#options.stockage, this.#reglages)
  }

  #changement(): void {
    sauvegarderReglages(this.#options.stockage, this.#reglages)
    if (!this.#ctx) return
    this.#appliquerGains()
    this.#actualiserEtat()
    this.#relancerVoulus()
  }

  #appliquerGains(): void {
    if (!this.#ctx || !this.#bus) return
    const t = this.#ctx.currentTime
    for (const canal of CANAUX) {
      const gain = this.#bus.canaux[canal].gain
      gain.cancelScheduledValues(t)
      gain.setTargetAtTime(canalActif(this.#reglages, canal) ? volumeEnGain(this.#reglages.volumes[canal]) : 0, t, 0.05)
    }
    // Un canal coupé n'a plus de source qui tourne : on arrête et on déconnecte.
    for (const [id, actif] of this.#continus) {
      if (actif && !canalActif(this.#reglages, CATALOGUE[id].canal)) {
        actif.voix.arreter()
        this.#continus.set(id, null) // le fondu finit seul ; le son peut être relancé tout de suite
      }
    }
    for (const a of [...this.#ponctuels]) {
      if (!canalActif(this.#reglages, CATALOGUE[a.id].canal)) a.voix.arreter()
    }
  }

  // --- Onglet caché, contexte suspendu ------------------------------------------

  /** À appeler quand la visibilité de l'onglet change (document.hidden). */
  surVisibilite(cache: boolean): void {
    this.#cache = cache
    if (!this.#ctx) return
    this.#actualiserEtat()
  }

  /** Le contexte tourne seulement si un canal sonore est actif et que l'onglet est visible. */
  #doitTourner(): boolean {
    return !this.#cache && (canalActif(this.#reglages, 'ambiance') || canalActif(this.#reglages, 'effets'))
  }

  #actualiserEtat(): void {
    const ctx = this.#ctx
    if (!ctx) return
    if (this.#doitTourner()) {
      // « suspended » (autoplay, onglet repris) mais aussi « interrupted » (iOS après un appel).
      if (ctx.state !== 'running' && ctx.state !== 'closed') void ctx.resume().catch(() => undefined)
    } else if (ctx.state === 'running') {
      void ctx.suspend().catch(() => undefined)
    }
  }

  // --- Sons ---------------------------------------------------------------------

  #peutJouer(id: IdSon): boolean {
    return (
      this.#ctx !== null &&
      !this.#cache &&
      canalActif(this.#reglages, CATALOGUE[id].canal) &&
      this.sonsActifs < POLYPHONIE_MAX
    )
  }

  /** Joue un son ponctuel. Renvoie false s'il est ignoré (pas initialisé, coupé, trop de sons). */
  jouer(id: string): boolean {
    if (!estIdSon(id) || estContinu(id)) return false
    if (!this.#peutJouer(id) || !this.#atelier || !this.#bus) return false
    const atelier = this.#atelier
    const actif: Actif = { id, voix: { arreter: () => undefined } }
    actif.voix = jouerPonctuel(atelier, id, this.#bus.canaux[CATALOGUE[id].canal], () => this.#ponctuels.delete(actif))
    this.#ponctuels.add(actif)
    this.#actualiserEtat()
    return true
  }

  /** Démarre un son continu (ou change ses réglages s'il tourne déjà). */
  demarrer(id: IdSonContinu, params: ParamsContinu = {}): boolean {
    this.#voulus.set(id, { ...this.#voulus.get(id), ...params })
    return this.#lancer(id)
  }

  #lancer(id: IdSonContinu): boolean {
    const existant = this.#continus.get(id)
    const voulus = this.#voulus.get(id) ?? {}
    if (existant) {
      existant.voix.regler(voulus)
      return true
    }
    if (!this.#peutJouer(id) || !this.#atelier || !this.#bus) return false
    const atelier = this.#atelier
    const entree = { voix: null as unknown as VoixContinue, params: voulus }
    entree.voix = demarrerContinu(
      atelier,
      id,
      this.#bus.canaux[CATALOGUE[id].canal],
      () => {
        if (this.#continus.get(id) === entree) this.#continus.set(id, null)
      },
      voulus
    )
    this.#continus.set(id, entree)
    this.#actualiserEtat()
    return true
  }

  #relancerVoulus(): void {
    for (const id of this.#voulus.keys()) {
      if (!this.#continus.get(id)) this.#lancer(id)
    }
  }

  /** Règle un son continu qui tourne ; sans effet s'il est arrêté. */
  regler(id: IdSonContinu, params: ParamsContinu): void {
    if (this.#voulus.has(id)) this.#voulus.set(id, { ...this.#voulus.get(id), ...params })
    this.#continus.get(id)?.voix.regler(params)
  }

  /** Arrête un son continu (fondu court) et l'oublie. */
  arreter(id: IdSonContinu): void {
    this.#voulus.delete(id)
    const actif = this.#continus.get(id)
    if (actif) {
      actif.voix.arreter()
      this.#continus.set(id, null)
    }
  }

  /** Arrête tous les sons, continus et ponctuels. */
  arreterTout(): void {
    for (const id of [...this.#voulus.keys()]) this.arreter(id)
    for (const a of [...this.#ponctuels]) a.voix.arreter()
  }

  /** Le son continu est-il en train de tourner ? */
  tourne(id: IdSonContinu): boolean {
    return Boolean(this.#continus.get(id))
  }

  /** Gain du bus d'un canal (0 si coupé), pour les tests et la démonstration. */
  gainCanal(canal: Canal): number {
    return canalActif(this.#reglages, canal) ? volumeEnGain(this.#reglages.volumes[canal]) : 0
  }

  /** Nœud d'entrée du bus (pour les tests). */
  get noeudMaitre(): NoeudAudio | null {
    return this.#bus?.maitre ?? null
  }
}

export { borner }
