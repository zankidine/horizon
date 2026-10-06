/**
 * Interface minimale du contexte Web Audio, pour pouvoir le remplacer par un
 * faux contexte dans les tests. Le vrai AudioContext la satisfait (voir
 * contexte-reel.ts). Seuls les nœuds réellement utilisés sont décrits.
 */

export interface ParamAudio {
  value: number
  setValueAtTime(valeur: number, t: number): unknown
  linearRampToValueAtTime(valeur: number, t: number): unknown
  setTargetAtTime(cible: number, t: number, constanteDeTemps: number): unknown
  cancelScheduledValues(t: number): unknown
}

export interface NoeudAudio {
  connect(destination: NoeudAudio | ParamAudio): unknown
  disconnect(): void
}

export interface GainNoeud extends NoeudAudio {
  gain: ParamAudio
}

export interface SourceAudio extends NoeudAudio {
  start(t?: number, decalage?: number): void
  stop(t?: number): void
  onended: (() => void) | null
}

export type TypeOnde = 'sine' | 'triangle' | 'square' | 'sawtooth'

export interface OscillateurNoeud extends SourceAudio {
  type: TypeOnde
  frequency: ParamAudio
}

export type TypeFiltre = 'lowpass' | 'highpass' | 'bandpass'

export interface FiltreNoeud extends NoeudAudio {
  type: TypeFiltre
  frequency: ParamAudio
  Q: ParamAudio
}

export interface CompresseurNoeud extends NoeudAudio {
  threshold: ParamAudio
  knee: ParamAudio
  ratio: ParamAudio
  attack: ParamAudio
  release: ParamAudio
}

export interface FormeurNoeud extends NoeudAudio {
  curve: Float32Array | null
  oversample: 'none' | '2x' | '4x'
}

export interface TamponAudio {
  readonly length: number
  getChannelData(canal: number): Float32Array
}

export interface SourceTamponNoeud extends SourceAudio {
  buffer: TamponAudio | null
  loop: boolean
}

export type EtatContexte = 'suspended' | 'running' | 'closed' | 'interrupted'

export interface ContexteAudio {
  readonly currentTime: number
  readonly sampleRate: number
  readonly state: EtatContexte
  readonly destination: NoeudAudio
  createGain(): GainNoeud
  createOscillator(): OscillateurNoeud
  createBiquadFilter(): FiltreNoeud
  createDynamicsCompressor(): CompresseurNoeud
  createWaveShaper(): FormeurNoeud
  createBuffer(canaux: number, longueur: number, frequence: number): TamponAudio
  createBufferSource(): SourceTamponNoeud
  resume(): Promise<void>
  suspend(): Promise<void>
}

/** Session audio d'iOS (navigator.audioSession), absente ailleurs. */
export interface SessionAudio {
  type?: string
}

/** Crée le vrai contexte, avec le préfixe de Safari ; null si le navigateur n'a pas Web Audio. */
export function creerContexteReel(): ContexteAudio | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    AudioContext?: new () => ContexteAudio
    webkitAudioContext?: new () => ContexteAudio
  }
  const Constructeur = w.AudioContext ?? w.webkitAudioContext
  return Constructeur ? new Constructeur() : null
}

/** navigator.audioSession si le navigateur le propose (Safari récent), sinon undefined. */
export function sessionAudioDuNavigateur(): SessionAudio | undefined {
  if (typeof navigator === 'undefined') return undefined
  const session = (navigator as unknown as { audioSession?: SessionAudio }).audioSession
  return session && typeof session === 'object' ? session : undefined
}
