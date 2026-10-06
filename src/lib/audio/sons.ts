import type { ContexteAudio, GainNoeud, NoeudAudio, ParamAudio, SourceAudio, TamponAudio, TypeFiltre, TypeOnde } from './contexte'
import { CATALOGUE, type IdSon, type IdSonContinu, type IdSonPonctuel, type ParamsContinu } from './catalogue'
import { FONDU_ARRET_S, FONDU_ENTREE_S, LISSAGE_S } from './constantes'
import { pointsEnveloppe, type Enveloppe } from './db'

/**
 * Synthèse des sons avec Web Audio : aucun fichier audio. Tout passe par un
 * Atelier (contexte + un seul tampon de bruit, généré une fois) et par un
 * Groupe qui sait tout arrêter et déconnecter. Jamais de nouvel oscillateur
 * par image : un son continu est construit une fois, puis réglé.
 */

/** Ce que les sons reçoivent : le contexte et le bruit partagé. */
export interface Atelier {
  readonly ctx: ContexteAudio
  readonly bruit: TamponAudio
}

/** Durée du tampon de bruit partagé, en secondes (lu en boucle). */
const DUREE_BRUIT_S = 2

/** Crée l'atelier : un seul tampon de bruit blanc, déterministe, généré une fois. */
export function creerAtelier(ctx: ContexteAudio): Atelier {
  const longueur = Math.max(1, Math.floor(ctx.sampleRate * DUREE_BRUIT_S))
  const bruit = ctx.createBuffer(1, longueur, ctx.sampleRate)
  const donnees = bruit.getChannelData(0)
  // Générateur congruentiel linéaire : même bruit à chaque fois, pas de Math.random.
  let graine = 12345
  for (let i = 0; i < donnees.length; i++) {
    graine = (Math.imul(graine, 1664525) + 1013904223) >>> 0
    donnees[i] = (graine / 0xffffffff) * 2 - 1
  }
  return { ctx, bruit }
}

/** Voix d'un son en cours : on peut l'arrêter proprement. */
export interface VoixSon {
  /** Arrête avec un fondu court puis déconnecte tout. Sans effet si déjà fini. */
  arreter(): void
}

/** Un son continu en cours, réglable. */
export interface VoixContinue extends VoixSon {
  regler(params: ParamsContinu): void
}

/** Les nœuds et sources d'un son, pour tout arrêter et déconnecter d'un coup. */
class Groupe implements VoixSon {
  readonly #noeuds: NoeudAudio[] = []
  readonly #sources: SourceAudio[] = []
  #restantes = 0
  #fini = false
  #sortie: GainNoeud | null = null

  constructor(
    readonly atelier: Atelier,
    readonly surFin: () => void
  ) {}

  noeud<T extends NoeudAudio>(n: T): T {
    this.#noeuds.push(n)
    return n
  }

  source<T extends SourceAudio>(s: T): T {
    this.#noeuds.push(s)
    this.#sources.push(s)
    this.#restantes += 1
    s.onended = () => {
      this.#restantes -= 1
      if (this.#restantes <= 0) this.#nettoyer()
    }
    return s
  }

  /** Gain général du son : sert au fondu d'entrée et de sortie. */
  definirSortie(gain: GainNoeud): void {
    this.#sortie = gain
  }

  #nettoyer(): void {
    if (this.#fini) return
    this.#fini = true
    for (const n of this.#noeuds) n.disconnect()
    this.surFin()
  }

  arreter(): void {
    if (this.#fini) return
    const { ctx } = this.atelier
    const t = ctx.currentTime
    if (this.#sortie) {
      this.#sortie.gain.cancelScheduledValues(t)
      this.#sortie.gain.setValueAtTime(this.#sortie.gain.value, t)
      this.#sortie.gain.linearRampToValueAtTime(0, t + FONDU_ARRET_S)
    }
    for (const s of this.#sources) {
      try {
        s.stop(t + FONDU_ARRET_S + 0.02)
      } catch {
        // Source jamais démarrée ou déjà arrêtée : rien à faire.
      }
    }
    if (this.#sources.length === 0) this.#nettoyer()
  }
}

function appliquerPoints(param: ParamAudio, t0: number, env: Enveloppe, pic: number, dureeSoutienS: number): number {
  const points = pointsEnveloppe(env, pic, dureeSoutienS)
  param.setValueAtTime(0, t0 + points[0].t)
  for (const p of points.slice(1)) param.linearRampToValueAtTime(p.v, t0 + p.t)
  return t0 + points[points.length - 1].t
}

interface OptionsNote {
  /** Fréquence en Hz. */
  f: number
  /** Fréquence finale (glissando), sinon constante. */
  fFin?: number
  t: number
  /** Durée du soutien en secondes. */
  d: number
  crete: number
  onde?: TypeOnde
  attaque?: number
  relachement?: number
}

/** Une note : oscillateur, gain à enveloppe, sortie. Renvoie sa fin (secondes du contexte). */
function note(g: Groupe, sortie: NoeudAudio, o: OptionsNote): number {
  const { ctx } = g.atelier
  const osc = g.source(ctx.createOscillator())
  osc.type = o.onde ?? 'sine'
  osc.frequency.setValueAtTime(o.f, o.t)
  if (o.fFin !== undefined) osc.frequency.linearRampToValueAtTime(o.fFin, o.t + o.d)
  const gain = g.noeud(ctx.createGain())
  const fin = appliquerPoints(
    gain.gain,
    o.t,
    { attaque: o.attaque ?? 0.02, decroissance: 0.04, soutien: 0.7, relachement: o.relachement ?? 0.08 },
    o.crete,
    o.d
  )
  osc.connect(gain)
  gain.connect(sortie)
  osc.start(o.t)
  osc.stop(fin + 0.02)
  return fin
}

interface OptionsBruit {
  t: number
  d: number
  crete: number
  filtre: TypeFiltre
  hz: number
  q?: number
  attaque?: number
  relachement?: number
}

/** Un souffle de bruit filtré, avec enveloppe. Renvoie sa fin. */
function souffle(g: Groupe, sortie: NoeudAudio, o: OptionsBruit): number {
  const { ctx, bruit } = g.atelier
  const src = g.source(ctx.createBufferSource())
  src.buffer = bruit
  src.loop = true
  const filtre = g.noeud(ctx.createBiquadFilter())
  filtre.type = o.filtre
  filtre.frequency.setValueAtTime(o.hz, o.t)
  filtre.Q.setValueAtTime(o.q ?? 0.7, o.t)
  const gain = g.noeud(ctx.createGain())
  const fin = appliquerPoints(
    gain.gain,
    o.t,
    { attaque: o.attaque ?? 0.015, decroissance: 0, soutien: 1, relachement: o.relachement ?? 0.04 },
    o.crete,
    o.d
  )
  src.connect(filtre)
  filtre.connect(gain)
  gain.connect(sortie)
  src.start(o.t)
  src.stop(fin + 0.02)
  return fin
}

/** Crépitement de radio : petits souffles courts à instants fixes (même rendu à chaque fois). */
const INSTANTS_CREPITEMENT_S = [0, 0.045, 0.1, 0.15, 0.23, 0.29, 0.36] as const
const DUREES_CREPITEMENT_S = [0.02, 0.014, 0.026, 0.012, 0.02, 0.016, 0.03] as const

function crepitement(g: Groupe, sortie: NoeudAudio, t: number, crete: number): number {
  let fin = t
  INSTANTS_CREPITEMENT_S.forEach((dt, i) => {
    fin = Math.max(
      fin,
      souffle(g, sortie, { t: t + dt, d: DUREES_CREPITEMENT_S[i], crete, filtre: 'bandpass', hz: 1400, q: 0.8, attaque: 0.004, relachement: 0.02 })
    )
  })
  return fin
}

type FabriquePonctuelle = (g: Groupe, sortie: NoeudAudio, t0: number, crete: number) => void

// Notes en Hz (gamme tempérée, La = 440 Hz) : toutes sous FREQUENCE_TONALE_MAX_HZ.
const DO4 = 261.63
const SOL4 = 392
const DO5 = 523.25
const MI5 = 659.25
const SOL5 = 783.99
const DO6 = 1046.5

const PONCTUELS: Record<IdSonPonctuel, FabriquePonctuelle> = {
  'bip-ouverture': (g, s, t, c) => {
    note(g, s, { f: SOL4, t, d: 0.08, crete: c })
    note(g, s, { f: DO5, t: t + 0.1, d: 0.12, crete: c })
  },
  'bip-fermeture': (g, s, t, c) => {
    note(g, s, { f: DO5, t, d: 0.08, crete: c })
    note(g, s, { f: SOL4, t: t + 0.1, d: 0.12, crete: c })
  },
  'bip-validation': (g, s, t, c) => {
    note(g, s, { f: DO5, t, d: 0.07, crete: c })
    note(g, s, { f: MI5, t: t + 0.09, d: 0.14, crete: c })
  },
  'bip-erreur': (g, s, t, c) => {
    note(g, s, { f: 247, fFin: 196, t, d: 0.26, crete: c, onde: 'triangle', attaque: 0.04, relachement: 0.12 })
  },
  alerte: (g, s, t, c) => {
    note(g, s, { f: SOL4, t, d: 0.22, crete: c, attaque: 0.05, relachement: 0.12 })
    note(g, s, { f: SOL4, t: t + 0.4, d: 0.22, crete: c, attaque: 0.05, relachement: 0.12 })
  },
  'fanfare-etoile': (g, s, t, c) => {
    note(g, s, { f: DO5, t, d: 0.09, crete: c, onde: 'triangle' })
    note(g, s, { f: MI5, t: t + 0.11, d: 0.09, crete: c, onde: 'triangle' })
    note(g, s, { f: SOL5, t: t + 0.22, d: 0.09, crete: c, onde: 'triangle' })
    note(g, s, { f: DO6, t: t + 0.33, d: 0.3, crete: c, onde: 'triangle', relachement: 0.2 })
  },
  'fanfare-fin': (g, s, t, c) => {
    note(g, s, { f: SOL4, t, d: 0.12, crete: c, onde: 'triangle' })
    note(g, s, { f: DO5, t: t + 0.15, d: 0.12, crete: c, onde: 'triangle' })
    note(g, s, { f: MI5, t: t + 0.3, d: 0.12, crete: c, onde: 'triangle' })
    note(g, s, { f: SOL5, t: t + 0.45, d: 0.12, crete: c, onde: 'triangle' })
    note(g, s, { f: DO6, t: t + 0.6, d: 0.55, crete: c * 0.4, onde: 'triangle', relachement: 0.35 })
    note(g, s, { f: DO5, t: t + 0.6, d: 0.55, crete: c * 0.35, onde: 'triangle', relachement: 0.35 })
    note(g, s, { f: DO4, t: t + 0.6, d: 0.55, crete: c * 0.25, relachement: 0.35 })
  },
  'radio-debut': (g, s, t, c) => {
    const fin = note(g, s, { f: 700, t, d: 0.09, crete: c })
    crepitement(g, s, fin + 0.02, c * 0.7)
  },
  'radio-fin': (g, s, t, c) => {
    const fin = crepitement(g, s, t, c * 0.7)
    note(g, s, { f: 500, t: fin + 0.03, d: 0.09, crete: c })
  },
  'radio-coupure': (g, s, t, c) => {
    // Coupure nette : un seul « toc » grave et bref, puis plus rien.
    souffle(g, s, { t, d: 0.03, crete: c, filtre: 'lowpass', hz: 350, attaque: 0.008, relachement: 0.03 })
  },
  'poussee-impulsion': (g, s, t, c) => {
    souffle(g, s, { t, d: 0.5, crete: c, filtre: 'lowpass', hz: 700, attaque: 0.12, relachement: 0.35 })
  },
}

type FabriqueContinue = (g: Groupe, sortie: GainNoeud, t0: number, crete: number) => (params: ParamsContinu) => void

/** Source de bruit en boucle, filtrée, vers un gain. Renvoie le filtre et le gain pour les régler. */
function bruitContinu(g: Groupe, sortie: NoeudAudio, t0: number, type: TypeFiltre, hz: number, q: number, niveau: number) {
  const { ctx, bruit } = g.atelier
  const src = g.source(ctx.createBufferSource())
  src.buffer = bruit
  src.loop = true
  const filtre = g.noeud(ctx.createBiquadFilter())
  filtre.type = type
  filtre.frequency.setValueAtTime(hz, t0)
  filtre.Q.setValueAtTime(q, t0)
  const gain = g.noeud(ctx.createGain())
  gain.gain.setValueAtTime(niveau, t0)
  src.connect(filtre)
  filtre.connect(gain)
  gain.connect(sortie)
  src.start(t0)
  return { filtre, gain }
}

/** Oscillateur lent qui module un paramètre (souffle, respiration). */
function modulation(g: Groupe, t0: number, hz: number, amplitude: number, cible: ParamAudio): void {
  const { ctx } = g.atelier
  const lfo = g.source(ctx.createOscillator())
  lfo.type = 'sine'
  lfo.frequency.setValueAtTime(hz, t0)
  const profondeur = g.noeud(ctx.createGain())
  profondeur.gain.setValueAtTime(amplitude, t0)
  lfo.connect(profondeur)
  profondeur.connect(cible)
  lfo.start(t0)
}

function tonFixe(g: Groupe, sortie: NoeudAudio, t0: number, f: number, niveau: number): void {
  const { ctx } = g.atelier
  const osc = g.source(ctx.createOscillator())
  osc.type = 'sine'
  osc.frequency.setValueAtTime(f, t0)
  const gain = g.noeud(ctx.createGain())
  gain.gain.setValueAtTime(niveau, t0)
  osc.connect(gain)
  gain.connect(sortie)
  osc.start(t0)
}

const CONTINUS: Record<IdSonContinu, FabriqueContinue> = {
  'ambiance-cabine': (g, sortie, t0, c) => {
    // Grondement grave : bruit sous 140 Hz et deux sons purs très bas.
    bruitContinu(g, sortie, t0, 'lowpass', 140, 0.7, c * 0.4)
    tonFixe(g, sortie, t0, 55, c * 0.2)
    tonFixe(g, sortie, t0, 82.5, c * 0.1)
    // Souffle doux : bruit autour de 700 Hz, qui gonfle et retombe très lentement.
    const souffleDoux = bruitContinu(g, sortie, t0, 'bandpass', 700, 0.5, c * 0.2)
    modulation(g, t0, 0.12, c * 0.1, souffleDoux.gain.gain)
    return () => undefined
  },
  respiration: (g, sortie, t0, c) => {
    // Une respiration toutes les quatre ou cinq secondes : le gain oscille entre 0 et la crête.
    const resp = bruitContinu(g, sortie, t0, 'bandpass', 500, 1.2, c * 0.5)
    modulation(g, t0, 0.22, c * 0.5, resp.gain.gain)
    return () => undefined
  },
  poussee: (g, sortie, t0, c) => {
    const { ctx } = g.atelier
    const bruit = bruitContinu(g, sortie, t0, 'lowpass', 250, 0.7, 0)
    const grave = g.noeud(ctx.createGain())
    grave.gain.setValueAtTime(0, t0)
    grave.connect(sortie)
    const osc = g.source(ctx.createOscillator())
    osc.type = 'sine'
    osc.frequency.setValueAtTime(60, t0)
    osc.connect(grave)
    osc.start(t0)
    let derniere = -1
    return ({ intensite }) => {
      if (intensite === undefined || !Number.isFinite(intensite)) return
      const i = Math.min(1, Math.max(0, intensite))
      if (Math.abs(i - derniere) < 0.02) return
      derniere = i
      const t = ctx.currentTime
      bruit.gain.gain.setTargetAtTime(c * 0.8 * i, t, LISSAGE_S)
      grave.gain.setTargetAtTime(c * 0.2 * i, t, LISSAGE_S)
      bruit.filtre.frequency.setTargetAtTime(200 + 1000 * i, t, LISSAGE_S)
    }
  },
}

/**
 * Joue un son ponctuel. `sortie` est l'entrée du canal du son. Renvoie la voix
 * (pour l'arrêter) ; `surFin` est appelé quand tout est fini et déconnecté.
 */
export function jouerPonctuel(atelier: Atelier, id: IdSonPonctuel, sortie: NoeudAudio, surFin: () => void): VoixSon {
  const g = new Groupe(atelier, surFin)
  const gain = g.noeud(atelier.ctx.createGain())
  gain.gain.setValueAtTime(1, atelier.ctx.currentTime)
  g.definirSortie(gain)
  gain.connect(sortie)
  PONCTUELS[id](g, gain, atelier.ctx.currentTime, CATALOGUE[id].crete)
  return g
}

/** Démarre un son continu (fondu d'entrée), réglable ensuite. */
export function demarrerContinu(
  atelier: Atelier,
  id: IdSonContinu,
  sortie: NoeudAudio,
  surFin: () => void,
  params: ParamsContinu = {}
): VoixContinue {
  const g = new Groupe(atelier, surFin)
  const { ctx } = atelier
  const t0 = ctx.currentTime
  const gain = g.noeud(ctx.createGain())
  gain.gain.setValueAtTime(0, t0)
  gain.gain.linearRampToValueAtTime(1, t0 + FONDU_ENTREE_S)
  g.definirSortie(gain)
  gain.connect(sortie)
  const regler = CONTINUS[id](g, gain, t0, CATALOGUE[id].crete)
  regler(params)
  return {
    arreter: () => g.arreter(),
    regler,
  }
}

export function estPonctuel(id: IdSon): id is IdSonPonctuel {
  return CATALOGUE[id].type === 'ponctuel'
}

export function estContinu(id: IdSon): id is IdSonContinu {
  return CATALOGUE[id].type === 'continu'
}
