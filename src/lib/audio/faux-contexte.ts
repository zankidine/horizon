import type {
  CompresseurNoeud,
  ContexteAudio,
  EtatContexte,
  FiltreNoeud,
  FormeurNoeud,
  GainNoeud,
  NoeudAudio,
  OscillateurNoeud,
  ParamAudio,
  SourceTamponNoeud,
  TamponAudio,
  TypeFiltre,
  TypeOnde,
} from './contexte'

/**
 * Faux contexte Web Audio pour les tests : il ne fait aucun son, il enregistre
 * les nœuds créés, leurs connexions et les valeurs programmées, et il laisse
 * « avancer » le temps pour finir les sources arrêtées.
 */

export class FauxParam implements ParamAudio {
  value: number
  /** Toutes les valeurs programmées ou visées, dans l'ordre. */
  readonly valeurs: number[] = []

  constructor(initiale = 0) {
    this.value = initiale
  }

  setValueAtTime(valeur: number): this {
    this.value = valeur
    this.valeurs.push(valeur)
    return this
  }

  linearRampToValueAtTime(valeur: number): this {
    this.valeurs.push(valeur)
    return this
  }

  setTargetAtTime(cible: number): this {
    this.valeurs.push(cible)
    return this
  }

  cancelScheduledValues(): this {
    return this
  }
}

export class FauxNoeud implements NoeudAudio {
  readonly destinations = new Set<unknown>()
  deconnecte = false

  constructor(readonly genre: string) {}

  connect(destination: NoeudAudio | ParamAudio): void {
    this.destinations.add(destination)
  }

  disconnect(): void {
    this.destinations.clear()
    this.deconnecte = true
  }
}

export class FauxGain extends FauxNoeud implements GainNoeud {
  readonly gain = new FauxParam(1)
  constructor() {
    super('gain')
  }
}

export class FauxSource extends FauxNoeud {
  onended: (() => void) | null = null
  demarree: number | null = null
  arretee: number | null = null
  fini = false

  start(t = 0): void {
    this.demarree = t
  }

  stop(t = 0): void {
    this.arretee = t
  }
}

export class FauxOscillateur extends FauxSource implements OscillateurNoeud {
  type: TypeOnde = 'sine'
  readonly frequency = new FauxParam(440)
  constructor() {
    super('oscillateur')
  }
}

export class FauxTampon implements TamponAudio {
  readonly donnees: Float32Array
  constructor(readonly length: number) {
    this.donnees = new Float32Array(length)
  }
  getChannelData(): Float32Array {
    return this.donnees
  }
}

export class FauxSourceTampon extends FauxSource implements SourceTamponNoeud {
  buffer: TamponAudio | null = null
  loop = false
  constructor() {
    super('source-tampon')
  }
}

export class FauxFiltre extends FauxNoeud implements FiltreNoeud {
  type: TypeFiltre = 'lowpass'
  readonly frequency = new FauxParam(350)
  readonly Q = new FauxParam(1)
  constructor() {
    super('filtre')
  }
}

export class FauxCompresseur extends FauxNoeud implements CompresseurNoeud {
  readonly threshold = new FauxParam(-24)
  readonly knee = new FauxParam(30)
  readonly ratio = new FauxParam(12)
  readonly attack = new FauxParam(0.003)
  readonly release = new FauxParam(0.25)
  constructor() {
    super('compresseur')
  }
}

export class FauxFormeur extends FauxNoeud implements FormeurNoeud {
  curve: Float32Array | null = null
  oversample: 'none' | '2x' | '4x' = 'none'
  constructor() {
    super('formeur')
  }
}

export class FauxContexte implements ContexteAudio {
  currentTime = 0
  readonly sampleRate = 8000
  state: EtatContexte = 'suspended'
  readonly destination = new FauxNoeud('destination')
  readonly noeuds: FauxNoeud[] = []
  readonly tampons: FauxTampon[] = []
  appelsResume = 0
  appelsSuspend = 0

  #enregistrer<T extends FauxNoeud>(noeud: T): T {
    this.noeuds.push(noeud)
    return noeud
  }

  createGain(): FauxGain {
    return this.#enregistrer(new FauxGain())
  }
  createOscillator(): FauxOscillateur {
    return this.#enregistrer(new FauxOscillateur())
  }
  createBiquadFilter(): FauxFiltre {
    return this.#enregistrer(new FauxFiltre())
  }
  createDynamicsCompressor(): FauxCompresseur {
    return this.#enregistrer(new FauxCompresseur())
  }
  createWaveShaper(): FauxFormeur {
    return this.#enregistrer(new FauxFormeur())
  }
  createBufferSource(): FauxSourceTampon {
    return this.#enregistrer(new FauxSourceTampon())
  }
  createBuffer(_canaux: number, longueur: number): FauxTampon {
    const tampon = new FauxTampon(longueur)
    this.tampons.push(tampon)
    return tampon
  }

  resume(): Promise<void> {
    this.appelsResume += 1
    this.state = 'running'
    return Promise.resolve()
  }

  suspend(): Promise<void> {
    this.appelsSuspend += 1
    this.state = 'suspended'
    return Promise.resolve()
  }

  /** Nœuds d'un genre donné. */
  de<T extends FauxNoeud>(genre: string): T[] {
    return this.noeuds.filter((n) => n.genre === genre) as T[]
  }

  get sources(): FauxSource[] {
    return this.noeuds.filter((n): n is FauxSource => n instanceof FauxSource)
  }

  /** Les sources démarrées et non finies (celles qui « sonnent » encore). */
  get sourcesVivantes(): FauxSource[] {
    return this.sources.filter((s) => s.demarree !== null && !s.fini)
  }

  /** Fait avancer le temps : toute source arrêtée avant `t` se termine (onended). */
  avancerA(t: number): void {
    this.currentTime = t
    for (const s of this.sources) {
      if (!s.fini && s.arretee !== null && s.arretee <= t) {
        s.fini = true
        s.onended?.()
      }
    }
  }
}
