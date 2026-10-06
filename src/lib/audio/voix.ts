import { borner } from './db'

/**
 * Voix du copilote : enveloppe autour de speechSynthesis. Aucun texte ne part
 * vers un serveur externe : seules les voix locales (localService = true) sont
 * utilisées, sauf si l'option « voix en ligne » est activée explicitement.
 * Sans voix française locale, le copilote reste silencieux : chaque réplique
 * est de toute façon affichée en texte, le son est facultatif.
 */

/** Ce qu'on lit d'une voix de speechSynthesis. */
export interface VoixSynthese {
  readonly name: string
  readonly lang: string
  readonly localService: boolean
  readonly default?: boolean
}

/** Un énoncé à dire (SpeechSynthesisUtterance convient). */
export interface EnonceSynthese {
  text: string
  lang: string
  voice: VoixSynthese | null
  rate: number
  pitch: number
  volume: number
  onend: (() => void) | null
  onerror: (() => void) | null
}

/** Ce qu'on utilise de speechSynthesis. */
export interface Synthese {
  getVoices(): VoixSynthese[]
  speak(enonce: EnonceSynthese): void
  cancel(): void
  addEventListener?(type: 'voiceschanged', ecouteur: () => void): void
  removeEventListener?(type: 'voiceschanged', ecouteur: () => void): void
}

/** Délai entre un cancel() et le speak() suivant : certains appareils se bloquent sinon. */
export const DELAI_RELANCE_MS = 80
/** Nombre de répliques gardées en attente ; les plus anciennes sont abandonnées. */
export const FILE_MAX = 3
/** Nouveaux essais de lecture des voix quand getVoices() est vide au départ. */
export const ESSAIS_VOIX = 5
export const DELAI_ESSAI_VOIX_MS = 400
/** Volume maximal de la voix : jamais à fond. */
export const VOLUME_VOIX_MAX = 0.9
/** Débit un peu lent, plus facile à suivre pour un enfant. */
export const DEBIT_VOIX = 0.95
/** Si la fin d'un énoncé n'est jamais signalée, on passe au suivant après cette durée estimée. */
const MS_PAR_CARACTERE = 90
const MARGE_FIN_MS = 4000

export interface CritereVoix {
  /** Autorise les voix distantes (le texte part vers un service externe). Faux par défaut. */
  voixEnLigne: boolean
}

function estFrancaise(voix: VoixSynthese): boolean {
  return voix.lang.replace('_', '-').toLowerCase().startsWith('fr')
}

function score(voix: VoixSynthese): number {
  const lang = voix.lang.replace('_', '-').toLowerCase()
  return (lang === 'fr-fr' ? 4 : 0) + (voix.localService ? 2 : 0) + (voix.default === true ? 1 : 0)
}

/**
 * Choisit la voix : française, locale d'abord (fr-FR, puis voix par défaut).
 * Sans l'option « voix en ligne », une voix distante n'est jamais choisie :
 * s'il n'y a pas de voix locale, le résultat est null (silence).
 */
export function choisirVoix(voix: readonly VoixSynthese[], critere: CritereVoix): VoixSynthese | null {
  const candidates = voix.filter((v) => estFrancaise(v) && (critere.voixEnLigne || v.localService))
  let meilleure: VoixSynthese | null = null
  for (const v of candidates) {
    if (meilleure === null || score(v) > score(meilleure)) meilleure = v
  }
  return meilleure
}

export interface OptionsFileVoix {
  /** speechSynthesis, ou null (navigateur sans voix : silence). */
  synthese: Synthese | null
  creerEnonce: (texte: string) => EnonceSynthese
  /** Planifie `fn` dans `ms` millisecondes ; renvoie la fonction qui annule. */
  planifier: (fn: () => void, ms: number) => () => void
}

export interface ReglagesVoix {
  muet: boolean
  /** Volume du canal « voix » (0 à 1). */
  volume: number
  voixEnLigne: boolean
}

/** File de répliques lues une par une, avec interruption propre. */
export class FileVoix {
  readonly #o: OptionsFileVoix
  #reglages: ReglagesVoix = { muet: false, volume: 0.7, voixEnLigne: false }
  #voix: VoixSynthese | null = null
  #file: string[] = []
  #enCours = false
  /** Change à chaque arrêt : les rappels d'un énoncé annulé sont ignorés. */
  #generation = 0
  readonly #annulations = new Set<() => void>()
  /** Nouveaux essais de lecture des voix : ne sont pas annulés par arreter(). */
  readonly #essais = new Set<() => void>()
  readonly #surVoix = () => this.#actualiserVoix()

  constructor(options: OptionsFileVoix) {
    this.#o = options
    options.synthese?.addEventListener?.('voiceschanged', this.#surVoix)
    this.#actualiserVoix()
    if (this.#voix === null) this.#reessayer(ESSAIS_VOIX)
  }

  /** getVoices() est souvent vide au premier appel : on réessaie quelques fois. */
  #reessayer(restants: number): void {
    if (restants <= 0 || !this.#o.synthese) return
    const annuler = this.#o.planifier(() => {
      this.#essais.delete(annuler)
      this.#actualiserVoix()
      if (this.#voix === null) this.#reessayer(restants - 1)
    }, DELAI_ESSAI_VOIX_MS)
    this.#essais.add(annuler)
  }

  #actualiserVoix(): void {
    const voix = this.#o.synthese?.getVoices() ?? []
    this.#voix = choisirVoix(voix, { voixEnLigne: this.#reglages.voixEnLigne })
    if (this.#voix !== null && this.#file.length > 0) this.#suivant()
  }

  /** La voix actuellement choisie (null : silence), pour la démonstration. */
  get voixChoisie(): VoixSynthese | null {
    return this.#voix
  }

  /** La voix peut-elle parler maintenant ? (voix trouvée, pas muet, volume non nul) */
  get disponible(): boolean {
    return this.#voix !== null && !this.#reglages.muet && this.#reglages.volume > 0
  }

  definirReglages(reglages: ReglagesVoix): void {
    const changeEnLigne = reglages.voixEnLigne !== this.#reglages.voixEnLigne
    this.#reglages = { ...reglages, volume: borner(reglages.volume, 0, 1) }
    if (changeEnLigne) this.#actualiserVoix()
    if (!this.disponible) this.arreter()
  }

  /**
   * Dit une réplique. Silencieux (renvoie false) si la voix est indisponible ou
   * coupée. Avec `interrompre`, la réplique en cours est coupée proprement.
   */
  parler(texte: string, options: { interrompre?: boolean } = {}): boolean {
    const propre = texte.replace(/\s+/g, ' ').trim()
    if (propre === '' || !this.disponible) return false
    if (options.interrompre === true) this.arreter()
    this.#file.push(propre)
    while (this.#file.length > FILE_MAX) this.#file.shift()
    this.#suivant()
    return true
  }

  #suivant(): void {
    const synthese = this.#o.synthese
    if (this.#enCours || this.#file.length === 0 || !synthese || !this.disponible) return
    const texte = this.#file.shift()!
    this.#enCours = true
    const generation = this.#generation
    const fini = () => {
      if (generation !== this.#generation || !this.#enCours) return
      this.#enCours = false
      const annuler = this.#o.planifier(() => {
        this.#annulations.delete(annuler)
        this.#suivant()
      }, DELAI_RELANCE_MS)
      this.#annulations.add(annuler)
    }
    // cancel() avant chaque lecture, puis une courte pause : sinon certains appareils se bloquent.
    synthese.cancel()
    const annulerLecture = this.#o.planifier(() => {
      this.#annulations.delete(annulerLecture)
      if (generation !== this.#generation || !this.#voix) return
      const enonce = this.#o.creerEnonce(texte)
      enonce.voice = this.#voix
      enonce.lang = this.#voix.lang
      enonce.rate = DEBIT_VOIX
      enonce.pitch = 1
      enonce.volume = borner(this.#reglages.volume, 0, 1) * VOLUME_VOIX_MAX
      enonce.onend = fini
      enonce.onerror = fini
      synthese.speak(enonce)
      // Filet de sécurité : certains appareils ne signalent jamais la fin.
      const annulerFilet = this.#o.planifier(() => {
        this.#annulations.delete(annulerFilet)
        if (generation === this.#generation && this.#enCours) {
          synthese.cancel()
          fini()
        }
      }, texte.length * MS_PAR_CARACTERE + MARGE_FIN_MS)
      this.#annulations.add(annulerFilet)
    }, DELAI_RELANCE_MS)
    this.#annulations.add(annulerLecture)
  }

  /** Coupe la réplique en cours et vide la file. */
  arreter(): void {
    this.#generation += 1
    this.#file = []
    this.#enCours = false
    for (const annuler of this.#annulations) annuler()
    this.#annulations.clear()
    this.#o.synthese?.cancel()
  }

  /** Onglet caché : on coupe tout et on nettoie la file. */
  surVisibilite(cache: boolean): void {
    if (cache) this.arreter()
  }

  /** Libère l'écoute de voiceschanged. */
  detruire(): void {
    this.arreter()
    for (const annuler of this.#essais) annuler()
    this.#essais.clear()
    this.#o.synthese?.removeEventListener?.('voiceschanged', this.#surVoix)
  }
}
