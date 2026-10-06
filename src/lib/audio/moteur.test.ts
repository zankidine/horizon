import { describe, it, expect } from 'vitest'
import { CANAUX, CATALOGUE, IDS_SONS, type IdSon, type IdSonContinu, type IdSonPonctuel } from './catalogue'
import {
  CRETE_VOIX_REFERENCE,
  FILTRE_SORTIE_HZ,
  FREQUENCE_TONALE_MAX_HZ,
  GAIN_MAITRE_DB,
  PLAFOND_SORTIE,
  PLAFOND_SORTIE_DB,
  POLYPHONIE_MAX,
  VOLUMES_PAR_DEFAUT,
} from './constantes'
import { dbEnGain, volumeEnGain } from './db'
import { FauxCompresseur, FauxContexte, FauxFiltre, FauxFormeur, FauxGain, FauxOscillateur, FauxSource } from './faux-contexte'
import { CLE_AUDIO } from './constantes'
import type { Stockage } from './mixage'
import { courbePlafond, MoteurAudio, tableCourbePlafond } from './moteur'
import { estContinu } from './sons'

function stockage(): Stockage & { contenu: Map<string, string> } {
  const contenu = new Map<string, string>()
  return { contenu, getItem: (k) => contenu.get(k) ?? null, setItem: (k, v) => void contenu.set(k, v) }
}

function creer(options: { stockage?: Stockage; session?: { type?: string } } = {}) {
  const contextes: FauxContexte[] = []
  const moteur = new MoteurAudio({
    creerContexte: () => {
      const c = new FauxContexte()
      contextes.push(c)
      return c
    },
    stockage: options.stockage ?? null,
    session: options.session,
  })
  return { moteur, contextes, ctx: () => contextes[0] }
}

const PONCTUELS = IDS_SONS.filter((id): id is IdSonPonctuel => !estContinu(id))
const CONTINUS = IDS_SONS.filter((id): id is IdSonContinu => estContinu(id))

describe('contexte : créé après un geste, repris, mis en pause', () => {
  it('rien n’existe avant initialiser() : aucun contexte, aucun son', () => {
    const { moteur, contextes } = creer()
    expect(contextes).toHaveLength(0)
    expect(moteur.initialise).toBe(false)
    expect(moteur.jouer('bip-validation')).toBe(false)
    expect(moteur.demarrer('ambiance-cabine')).toBe(false)
  })

  it('initialiser() crée un seul contexte, même appelé plusieurs fois, et le reprend', () => {
    const { moteur, contextes, ctx } = creer()
    moteur.initialiser()
    moteur.initialiser()
    moteur.initialiser()
    expect(contextes).toHaveLength(1)
    expect(ctx().state).toBe('running')
    expect(ctx().appelsResume).toBe(1) // déjà en marche aux appels suivants
  })

  it('reprend un contexte suspendu ou interrompu (iOS) au geste suivant', () => {
    const { moteur, ctx } = creer()
    moteur.initialiser()
    ctx().state = 'suspended'
    moteur.initialiser()
    expect(ctx().state).toBe('running')
    ctx().state = 'interrupted'
    moteur.initialiser()
    expect(ctx().state).toBe('running')
  })

  it('onglet caché : suspend ; onglet visible : reprend', () => {
    const { moteur, ctx } = creer()
    moteur.initialiser()
    moteur.surVisibilite(true)
    expect(ctx().state).toBe('suspended')
    expect(moteur.jouer('bip-validation')).toBe(false) // rien ne part pendant qu'il est caché
    moteur.surVisibilite(false)
    expect(ctx().state).toBe('running')
    expect(moteur.jouer('bip-validation')).toBe(true)
  })

  it('tout coupé (muet ou ambiance et effets à zéro) : le contexte est suspendu pour économiser la batterie', () => {
    const { moteur, ctx } = creer()
    moteur.initialiser()
    moteur.definirMuet(true)
    expect(ctx().state).toBe('suspended')
    moteur.definirMuet(false)
    expect(ctx().state).toBe('running')
    moteur.definirVolume('ambiance', 0)
    expect(ctx().state).toBe('running') // les effets sonnent encore
    moteur.definirVolume('effets', 0)
    expect(ctx().state).toBe('suspended')
    moteur.definirVolume('effets', 0.4)
    expect(ctx().state).toBe('running')
  })

  it('sans Web Audio (contexte null ou erreur) : silence, sans erreur', () => {
    const vide = new MoteurAudio({ creerContexte: () => null })
    expect(() => vide.initialiser()).not.toThrow()
    expect(vide.jouer('bip-validation')).toBe(false)
    const casse = new MoteurAudio({
      creerContexte: () => {
        throw new Error('pas de Web Audio')
      },
    })
    expect(() => casse.initialiser()).not.toThrow()
    expect(casse.initialise).toBe(false)
  })

  it('iPhone : navigator.audioSession.type passe à « playback » quand la session existe', () => {
    const session: { type?: string } = { type: 'auto' }
    creer({ session }).moteur.initialiser()
    expect(session.type).toBe('playback')
  })

  it('sans audioSession ou sans propriété type : rien n’est inventé', () => {
    expect(() => creer({ session: undefined }).moteur.initialiser()).not.toThrow()
    const sansType = {}
    creer({ session: sansType }).moteur.initialiser()
    expect(sansType).toEqual({})
  })

  it('une session qui refuse la modification ne casse rien', () => {
    const session = {
      get type() {
        return 'auto'
      },
      set type(_v: string) {
        throw new Error('lecture seule')
      },
    }
    expect(() => creer({ session }).moteur.initialiser()).not.toThrow()
  })
})

describe('bus principal : canaux, maître, compresseur-limiteur, passe-bas, plafond', () => {
  it('la chaîne est canal → maître → compresseur → passe-bas → plafond → sortie', () => {
    const { moteur, ctx } = creer()
    moteur.initialiser()
    const c = ctx()
    const [maitre] = c.de<FauxGain>('gain').filter((g) => g.destinations.size === 1 && [...g.destinations][0] instanceof FauxCompresseur)
    expect(maitre).toBeDefined()
    expect(maitre.gain.valeurs[0]).toBeCloseTo(dbEnGain(GAIN_MAITRE_DB), 12)
    const [compresseur] = c.de<FauxCompresseur>('compresseur')
    const [passeBas] = c.de<FauxFiltre>('filtre')
    const [formeur] = c.de<FauxFormeur>('formeur')
    expect([...compresseur.destinations]).toEqual([passeBas])
    expect([...passeBas.destinations]).toEqual([formeur])
    expect([...formeur.destinations]).toEqual([c.destination])
    // Trois canaux se jettent dans le maître.
    expect(c.de<FauxGain>('gain').filter((g) => g.destinations.has(maitre))).toHaveLength(CANAUX.length)
  })

  it('le compresseur est un limiteur : seuil bas, rapport élevé, attaque très courte', () => {
    const { moteur, ctx } = creer()
    moteur.initialiser()
    const [comp] = ctx().de<FauxCompresseur>('compresseur')
    expect(comp.threshold.value).toBeLessThanOrEqual(-12)
    expect(comp.ratio.value).toBeGreaterThanOrEqual(10)
    expect(comp.attack.value).toBeLessThanOrEqual(0.005)
  })

  it('passe-bas final : rien d’aigu au-dessus de 3 kHz', () => {
    const { moteur, ctx } = creer()
    moteur.initialiser()
    const [passeBas] = ctx().de<FauxFiltre>('filtre')
    expect(passeBas.type).toBe('lowpass')
    expect(passeBas.frequency.value).toBe(FILTRE_SORTIE_HZ)
    expect(FILTRE_SORTIE_HZ).toBeLessThanOrEqual(3000)
  })

  it('le plafond de sortie : la courbe ne dépasse jamais −6 dBFS, même pour une entrée énorme', () => {
    expect(PLAFOND_SORTIE_DB).toBe(-6)
    expect(PLAFOND_SORTIE).toBeCloseTo(0.501187, 6)
    for (const x of [0, 0.1, 0.5, 1, 2, 10, 1e6, -1e6]) expect(Math.abs(courbePlafond(x))).toBeLessThanOrEqual(PLAFOND_SORTIE)
    const table = tableCourbePlafond()
    expect(table).toHaveLength(1025)
    expect(Math.max(...Array.from(table).map(Math.abs))).toBeLessThanOrEqual(PLAFOND_SORTIE)
    expect(table[512]).toBe(0) // le silence reste le silence
    const { moteur, ctx } = creer()
    moteur.initialiser()
    expect(ctx().de<FauxFormeur>('formeur')[0].curve).toEqual(table)
  })

  it('courbe du plafond : presque linéaire pour les petits signaux (pas de distorsion audible)', () => {
    expect(courbePlafond(0.01)).toBeCloseTo(0.01, 4)
    expect(courbePlafond(0.05)).toBeCloseTo(0.05, 3)
  })
})

describe('sécurité de l’oreille : volumes, plafond, aigus', () => {
  it('tous volumes au maximum, tous les sons en même temps : le signal final reste sous le plafond documenté', () => {
    // Pire cas : chaque son du catalogue joue à sa crête maximale, en phase, canaux à 1, maître à son gain fixe.
    const gainMaitre = dbEnGain(GAIN_MAITRE_DB)
    const pire = IDS_SONS.reduce((somme, id) => somme + CATALOGUE[id].crete, 0) * volumeEnGain(1) * gainMaitre
    expect(pire).toBeGreaterThan(0)
    // Même sans compresseur, la courbe du plafond tient le signal final sous −6 dBFS…
    expect(Math.abs(courbePlafond(pire))).toBeLessThan(PLAFOND_SORTIE)
    // … et avec un volume énorme encore.
    expect(Math.abs(courbePlafond(pire * 1000))).toBeLessThanOrEqual(PLAFOND_SORTIE)
    // Le plafond documenté est bien de −6 dBFS.
    expect(20 * Math.log10(PLAFOND_SORTIE)).toBeCloseTo(PLAFOND_SORTIE_DB, 10)
  })

  it('le moteur limite aussi le nombre de sons simultanés, tous volumes à 1', () => {
    const { moteur, ctx } = creer()
    moteur.initialiser()
    for (const canal of CANAUX) moteur.definirVolume(canal, 1)
    for (let i = 0; i < 30; i++) for (const id of PONCTUELS) moteur.jouer(id)
    for (const id of CONTINUS) moteur.demarrer(id, { intensite: 1 })
    expect(moteur.sonsActifs).toBeLessThanOrEqual(POLYPHONIE_MAX)
    expect(ctx().sourcesVivantes.length).toBeGreaterThan(0)
  })

  it('volumes par défaut modérés : le son le plus fort reste sous −20 dBFS avant le plafond', () => {
    const crete = Math.max(...IDS_SONS.map((id) => CATALOGUE[id].crete * volumeEnGain(VOLUMES_PAR_DEFAUT[CATALOGUE[id].canal])))
    const finale = crete * dbEnGain(GAIN_MAITRE_DB)
    expect(finale).toBeLessThan(dbEnGain(-20))
  })

  it('aucun son aigu fort : toutes les fréquences programmées restent sous 1 200 Hz', () => {
    for (const id of IDS_SONS) {
      const { moteur, ctx } = creer()
      moteur.initialiser()
      if (estContinu(id)) moteur.demarrer(id, { intensite: 1 })
      else moteur.jouer(id)
      const oscillateurs = ctx().de<FauxOscillateur>('oscillateur')
      for (const o of oscillateurs) {
        for (const f of o.frequency.valeurs) {
          expect(f, `${id} : ${f} Hz`).toBeLessThanOrEqual(FREQUENCE_TONALE_MAX_HZ)
          expect(f).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })

  it('les filtres de bruit restent sous 2 kHz (le souffle n’est jamais strident)', () => {
    for (const id of IDS_SONS) {
      const { moteur, ctx } = creer()
      moteur.initialiser()
      if (estContinu(id)) moteur.demarrer(id, { intensite: 1 })
      else moteur.jouer(id)
      for (const f of ctx().de<FauxFiltre>('filtre').slice(1)) {
        for (const hz of f.frequency.valeurs) expect(hz, id).toBeLessThanOrEqual(2000)
      }
    }
  })

  it('l’alerte et les fanfares sont plus basses que la voix de référence', () => {
    for (const id of ['alerte', 'fanfare-etoile', 'fanfare-fin'] as const) {
      expect(CATALOGUE[id].crete).toBeLessThan(CRETE_VOIX_REFERENCE)
    }
    expect(CATALOGUE.alerte.crete).toBeLessThanOrEqual(CATALOGUE['bip-validation'].crete)
  })

  it('aucun gain programmé dans un son ne dépasse la crête du catalogue', () => {
    for (const id of IDS_SONS) {
      const { moteur, ctx } = creer()
      moteur.initialiser()
      if (estContinu(id)) moteur.demarrer(id, { intensite: 1 })
      else moteur.jouer(id)
      const bus = new Set<unknown>(ctx().de<FauxGain>('gain').slice(0, 1 + CANAUX.length))
      const gains = ctx().de<FauxGain>('gain').filter((g) => !bus.has(g))
      // Le gain « général » du son (fondu) vaut 1 et se jette dans un canal : on l'écarte.
      const internes = gains.filter((g) => ![...g.destinations].some((d) => bus.has(d)))
      for (const g of internes) for (const v of g.gain.valeurs) expect(v, id).toBeLessThanOrEqual(CATALOGUE[id].crete + 1e-9)
    }
  })
})

describe('performances : un contexte, un tampon de bruit, pas de source par image', () => {
  it('le tampon de bruit est généré une seule fois et réutilisé par tous les sons', () => {
    const { moteur, ctx } = creer()
    moteur.initialiser()
    for (const id of PONCTUELS) moteur.jouer(id)
    for (const id of CONTINUS) moteur.demarrer(id, { intensite: 0.5 })
    expect(ctx().tampons).toHaveLength(1)
    const sourcesBruit = ctx().noeuds.filter((n) => n.genre === 'source-tampon') as unknown as { buffer: unknown }[]
    expect(sourcesBruit.length).toBeGreaterThan(1)
    for (const s of sourcesBruit) expect(s.buffer).toBe(ctx().tampons[0])
  })

  it('le bruit est déterministe : deux tampons ont le même contenu (pas de Math.random)', () => {
    const a = creer()
    const b = creer()
    a.moteur.initialiser()
    b.moteur.initialiser()
    expect(Array.from(a.ctx().tampons[0].donnees.slice(0, 50))).toEqual(Array.from(b.ctx().tampons[0].donnees.slice(0, 50)))
    const donnees = a.ctx().tampons[0].donnees
    expect(Math.max(...donnees)).toBeLessThanOrEqual(1)
    expect(Math.min(...donnees)).toBeGreaterThanOrEqual(-1)
  })

  it('régler la poussée à chaque image ne crée aucun nouvel oscillateur ni nœud', () => {
    const { moteur, ctx } = creer()
    moteur.initialiser()
    moteur.demarrer('poussee', { intensite: 0.3 })
    const noeuds = ctx().noeuds.length
    for (let i = 0; i < 300; i++) moteur.regler('poussee', { intensite: 0.3 + (i % 50) / 100 })
    expect(ctx().noeuds).toHaveLength(noeuds)
  })

  it('un réglage presque identique est ignoré (pas de travail inutile à chaque image)', () => {
    const { moteur, ctx } = creer()
    moteur.initialiser()
    moteur.demarrer('poussee', { intensite: 0.5 })
    const gains = ctx().de<FauxGain>('gain')
    const avant = gains.map((g) => g.gain.valeurs.length)
    for (let i = 0; i < 50; i++) moteur.regler('poussee', { intensite: 0.5 + i * 0.0001 })
    expect(gains.map((g) => g.gain.valeurs.length)).toEqual(avant)
  })

  it('un son continu déjà démarré n’est pas recréé', () => {
    const { moteur, ctx } = creer()
    moteur.initialiser()
    moteur.demarrer('ambiance-cabine')
    const n = ctx().noeuds.length
    moteur.demarrer('ambiance-cabine')
    moteur.demarrer('ambiance-cabine')
    expect(ctx().noeuds).toHaveLength(n)
  })

  it('un son ponctuel fini est arrêté et entièrement déconnecté (rien ne traîne)', () => {
    const { moteur, ctx } = creer()
    moteur.initialiser()
    expect(moteur.jouer('fanfare-fin')).toBe(true)
    expect(moteur.sonsActifs).toBe(1)
    const noeudsDuSon = ctx().noeuds.slice(1 + 1 + 1 + 1 + 1 + CANAUX.length) // après le bus
    ctx().avancerA(30)
    expect(moteur.sonsActifs).toBe(0)
    expect(ctx().sourcesVivantes).toHaveLength(0)
    for (const n of noeudsDuSon) expect(n.deconnecte).toBe(true)
  })

  it('la polyphonie est plafonnée : le neuvième son est ignoré, puis accepté quand une place se libère', () => {
    const { moteur, ctx } = creer()
    moteur.initialiser()
    let acceptes = 0
    for (let i = 0; i < POLYPHONIE_MAX + 4; i++) if (moteur.jouer('bip-validation')) acceptes += 1
    expect(acceptes).toBe(POLYPHONIE_MAX)
    expect(moteur.sonsActifs).toBe(POLYPHONIE_MAX)
    ctx().avancerA(10)
    expect(moteur.jouer('bip-validation')).toBe(true)
  })

  it('les sons continus comptent dans la polyphonie', () => {
    const { moteur } = creer()
    moteur.initialiser()
    for (const id of CONTINUS) moteur.demarrer(id, { intensite: 0.2 })
    expect(moteur.sonsActifs).toBe(CONTINUS.length)
    let acceptes = 0
    for (let i = 0; i < POLYPHONIE_MAX; i++) if (moteur.jouer('bip-ouverture')) acceptes += 1
    expect(acceptes).toBe(POLYPHONIE_MAX - CONTINUS.length)
  })
})

describe('canaux : volumes, muet, arrêt des sources', () => {
  it('le gain d’un canal suit son volume (courbe quadratique), à 0 s’il est muet', () => {
    const { moteur } = creer()
    moteur.initialiser()
    moteur.definirVolume('effets', 0.5)
    expect(moteur.gainCanal('effets')).toBe(0.25)
    moteur.definirMuet(true)
    expect(moteur.gainCanal('effets')).toBe(0)
    moteur.definirMuet(false)
    expect(moteur.gainCanal('effets')).toBe(0.25)
  })

  it('couper un canal arrête et déconnecte ses sons continus ; les rétablir les relance', () => {
    const { moteur, ctx } = creer()
    moteur.initialiser()
    moteur.demarrer('ambiance-cabine')
    expect(moteur.tourne('ambiance-cabine')).toBe(true)
    const nSources = ctx().sourcesVivantes.length
    expect(nSources).toBeGreaterThan(0)
    moteur.definirVolume('ambiance', 0)
    expect(moteur.tourne('ambiance-cabine')).toBe(false)
    ctx().avancerA(5) // le fondu de sortie se termine
    expect(ctx().sourcesVivantes).toHaveLength(0)
    expect(ctx().noeuds.filter((n) => n instanceof FauxSource).every((n) => n.deconnecte)).toBe(true)
    moteur.definirVolume('ambiance', 0.5)
    expect(moteur.tourne('ambiance-cabine')).toBe(true)
    expect(ctx().sourcesVivantes.length).toBeGreaterThan(0)
  })

  it('le muet coupe tout et ne rien jouer pendant qu’on est muet', () => {
    const { moteur, ctx } = creer()
    moteur.initialiser()
    moteur.demarrer('poussee', { intensite: 1 })
    moteur.jouer('fanfare-fin')
    moteur.definirMuet(true)
    ctx().avancerA(5)
    expect(ctx().sourcesVivantes).toHaveLength(0)
    expect(moteur.jouer('bip-validation')).toBe(false)
    expect(moteur.demarrer('respiration')).toBe(false)
    moteur.definirMuet(false)
    expect(moteur.tourne('poussee')).toBe(true) // ce que le jeu voulait revient
    expect(moteur.tourne('respiration')).toBe(true)
  })

  it('arreter() oublie le son : il ne revient pas après un muet', () => {
    const { moteur } = creer()
    moteur.initialiser()
    moteur.demarrer('respiration')
    moteur.arreter('respiration')
    expect(moteur.tourne('respiration')).toBe(false)
    moteur.definirMuet(true)
    moteur.definirMuet(false)
    expect(moteur.tourne('respiration')).toBe(false)
  })

  it('arreterTout coupe continus et ponctuels', () => {
    const { moteur, ctx } = creer()
    moteur.initialiser()
    moteur.demarrer('ambiance-cabine')
    moteur.jouer('alerte')
    moteur.arreterTout()
    ctx().avancerA(10)
    expect(moteur.sonsActifs).toBe(0)
    expect(ctx().sourcesVivantes).toHaveLength(0)
  })

  it('un identifiant inconnu ou continu n’est pas joué avec jouer()', () => {
    const { moteur } = creer()
    moteur.initialiser()
    expect(moteur.jouer('nexistepas')).toBe(false)
    expect(moteur.jouer('poussee')).toBe(false)
    expect(moteur.jouer('toString')).toBe(false)
  })

  it('les volumes invalides sont ignorés, les valides bornées', () => {
    const { moteur } = creer()
    moteur.definirVolume('voix', Number.NaN)
    expect(moteur.reglages().volumes.voix).toBe(VOLUMES_PAR_DEFAUT.voix)
    moteur.definirVolume('voix', 7)
    expect(moteur.reglages().volumes.voix).toBe(1)
  })
})

describe('réglages sauvegardés dans la clé dédiée', () => {
  it('volumes et muet sont enregistrés dans « horizon.audio » et retrouvés par un nouveau moteur', () => {
    const s = stockage()
    const a = creer({ stockage: s })
    a.moteur.definirVolume('effets', 0.2)
    a.moteur.definirMuet(true)
    a.moteur.definirVoixEnLigne(true)
    expect([...s.contenu.keys()]).toEqual([CLE_AUDIO])
    const b = creer({ stockage: s })
    expect(b.moteur.reglages()).toEqual({ volumes: { ambiance: 0.5, effets: 0.2, voix: 0.7 }, muet: true, voixEnLigne: true })
  })

  it('la voix en ligne est désactivée par défaut', () => {
    expect(creer().moteur.reglages().voixEnLigne).toBe(false)
  })

  it('les réglages s’appliquent avant le premier geste : le moteur muet reste muet à l’initialisation', () => {
    const s = stockage()
    const a = creer({ stockage: s })
    a.moteur.definirMuet(true)
    const b = creer({ stockage: s })
    b.moteur.initialiser()
    expect(b.moteur.jouer('bip-validation')).toBe(false)
    expect(b.ctx().state).toBe('suspended')
  })
})

describe('catalogue complet : chaque son se joue sur un faux contexte', () => {
  it.each(IDS_SONS)('%s', (id: IdSon) => {
    const { moteur, ctx } = creer()
    moteur.initialiser()
    if (estContinu(id)) {
      expect(moteur.demarrer(id, { intensite: 0.6 })).toBe(true)
      expect(moteur.tourne(id)).toBe(true)
      moteur.arreter(id)
    } else {
      expect(moteur.jouer(id)).toBe(true)
    }
    ctx().avancerA(60)
    expect(moteur.sonsActifs).toBe(0)
    expect(ctx().sourcesVivantes).toHaveLength(0)
    expect(CATALOGUE[id].crete).toBeGreaterThan(0)
    expect(CATALOGUE[id].crete).toBeLessThanOrEqual(0.2)
    expect(CATALOGUE[id].description.length).toBeGreaterThan(10)
  })
})
