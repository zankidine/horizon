import { describe, it, expect } from 'vitest'
import donnees from '../data/missions/mission1.json'
import {
  DELAI_RAPPEL_S_NIVEAU,
  DISTANCE_TERRE_LUNE_KM,
  DUREE_VOYAGE_LUNE_VISEE_S,
  INDICES_MAX_NIVEAU,
  TIMING_OUVERTURE_S,
  TOLERANCE_CALCUL_NIVEAU,
  TOLERANCE_DUREE_VOYAGE,
} from './constants'
import { creerMoteur, type EvenementMission, type MissionVue, type MoteurMission } from './mission-moteur'
import { type Niveau } from './niveaux'
import { chargerProgression, sauvegarderProgression, type Stockage } from './progression'
import { delaiRadioAllerRetourSecondes } from './units'
import { validerMission } from './validation-mission'

const mission = validerMission(donnees)
const NIVEAUX: readonly Niveau[] = [1, 2, 3, 4]
const IMAGE = 1 / 60

const norm = (texte: string) => texte.replace(/[\s\u00a0\u202f]+/g, ' ')

function nouveau(niveau: Niveau, progression?: unknown): MoteurMission {
  return creerMoteur(mission, { niveau, progression, nomCopilote: 'Nova' })
}

/** Types d'événements d'une liste. */
const types = (evenements: EvenementMission[]) => evenements.map((e) => e.type)

interface Joueur {
  /** Erreurs volontaires à faire avant la bonne action de chaque étape (clé : id d'étape). */
  erreurs?: Record<string, number>
  /** S'arrête quand cette étape devient courante. */
  jusqua?: string
}

/** Joue la mission comme un joueur : lit la vue, agit. Renvoie tous les événements et la durée simulée du voyage. */
function jouer(moteur: MoteurMission, joueur: Joueur = {}) {
  const evenements: EvenementMission[] = []
  let dureeVoyageS = 0
  const faites = new Map<string, number>()
  for (let tour = 0; tour < 100_000; tour++) {
    evenements.push(...moteur.retirerEvenements())
    const vue = moteur.vue()
    if (vue.terminee || !vue.etape || vue.etape.id === joueur.jusqua) break
    const { id, type } = vue.etape
    const aFaire = (joueur.erreurs?.[id] ?? 0) - (faites.get(id) ?? 0)
    const fauter = aFaire > 0
    if (fauter) faites.set(id, (faites.get(id) ?? 0) + 1)
    switch (type) {
      case 'dialogue':
        moteur.agir({ type: 'continuer' })
        break
      case 'choix':
        moteur.agir({ type: 'choisir', option: vue.actions[0].options![0].id })
        break
      case 'calcul':
        moteur.agir({ type: 'repondre', valeur: fauter ? 1 : DISTANCE_TERRE_LUNE_KM })
        break
      case 'action': {
        const interrupteurs = vue.actions[0].interrupteurs!
        const prochain = interrupteurs.find((i) => !i.actif)!
        const mauvais = interrupteurs[interrupteurs.length - 1]
        moteur.agir({ type: 'basculer', interrupteur: fauter && mauvais.id !== prochain.id ? mauvais.id : prochain.id })
        break
      }
      case 'observation': {
        moteur.agir(fauter ? { type: 'observer', cible: 'lune', mode: 'scanner' } : observationVoulue(id))
        break
      }
      case 'timing':
        if (fauter) moteur.agir({ type: 'pousser' }) // trop tôt
        else if (vue.fenetre?.etat === 'ouverte') moteur.agir({ type: 'pousser' })
        else moteur.avancer(IMAGE)
        break
      case 'voyage':
        moteur.avancer(IMAGE)
        dureeVoyageS += IMAGE
        break
    }
  }
  evenements.push(...moteur.retirerEvenements())
  return { evenements, dureeVoyageS }
}

function observationVoulue(id: string) {
  return id === 'o2-scanner'
    ? ({ type: 'observer', cible: 'terre', mode: 'scanner' } as const)
    : ({ type: 'observer', cible: 'lune', mode: 'reperer' } as const)
}

describe('parcours complet de la mission 1 sans erreur, à chaque niveau', () => {
  it.each(NIVEAUX)('niveau %i : six scènes, cinq étoiles, tout le journal, aucune aide', (niveau) => {
    const moteur = nouveau(niveau)
    const { evenements } = jouer(moteur)
    const vue = moteur.vue()
    expect(vue.terminee).toBe(true)
    expect(vue.etoiles).toBe(vue.etoilesMax)
    expect(vue.etoilesMax).toBe(5)
    expect(vue.journal).toEqual(['decollage', 'orbite', 'poussee', 'radio', 'arrivee'])
    expect(evenements.filter((e) => e.type === 'scene').map((e) => (e as { numero: number }).numero)).toEqual([1, 2, 3, 4, 5, 6])
    for (const aide of ['indice', 'solution', 'rappel']) expect(types(evenements)).not.toContain(aide)
    expect(types(evenements)[evenements.length - 1]).toBe('mission-terminee')
    expect(moteur.etat()).toMatchObject({ terminee: true, etape: null, etoiles: 5, tentatives: {} })
  })
})

describe('parcours avec erreurs : jamais d’échec définitif', () => {
  const erreurs = { 'c2-interrupteurs': 9, 'o2-scanner': 9, 'l2-poussee': 9, 'v2-calcul': 9 }

  it.each(NIVEAUX)('niveau %i : indices (au plus %#), puis solution, et la mission va au bout', (niveau) => {
    const moteur = nouveau(niveau)
    const { evenements } = jouer(moteur, { erreurs })
    const vue = moteur.vue()
    expect(vue.terminee).toBe(true)
    // Chaque étape fautive donne les indices du niveau (au plus ceux qui sont écrits), puis une solution expliquée.
    const indices = evenements.filter((e) => e.type === 'indice').length
    const attendus = mission.etapes
      .filter((e) => e.id in erreurs)
      .reduce((somme, e) => somme + Math.min(INDICES_MAX_NIVEAU[niveau], 'indices' in e ? e.indices.length : 0), 0)
    expect(indices).toBe(attendus)
    expect(evenements.filter((e) => e.type === 'solution')).toHaveLength(4)
    // Une étape qui a eu sa solution ne rapporte pas d'étoile ; l'étape « repérer la Lune » n'a pas fauté.
    expect(vue.etoiles).toBe(1)
    expect(vue.journal).toHaveLength(5)
    expect(Object.keys(moteur.etat().tentatives).sort()).toEqual(Object.keys(erreurs).sort())
  })

  it('une erreur suivie d’une bonne réponse garde l’étoile (les indices ne la coûtent pas)', () => {
    const moteur = nouveau(3)
    jouer(moteur, { erreurs: { 'o2-scanner': 1 } })
    const etat = moteur.etat()
    expect(etat.tentatives['o2-scanner']).toBe(1)
    expect(etat.etapesEtoilees).toContain('o2-scanner')
    expect(etat.etoiles).toBe(5)
  })

  it('la solution du calcul est expliquée avec la bonne réponse', () => {
    const moteur = nouveau(3)
    const { evenements } = jouer(moteur, { erreurs: { 'v2-calcul': 9 } })
    const solution = evenements.find((e) => e.type === 'solution' && /Distance/.test(e.texte))
    expect(norm((solution as { texte: string }).texte)).toContain('384 400 km')
  })
})

describe('calcul avec tolérance selon le niveau', () => {
  function reponse(niveau: Niveau, facteur: number) {
    const moteur = nouveau(niveau)
    jouer(moteur, { jusqua: 'v2-calcul' })
    moteur.retirerEvenements()
    moteur.agir({ type: 'repondre', valeur: DISTANCE_TERRE_LUNE_KM * facteur })
    return moteur.retirerEvenements().find((e) => e.type === 'reponse') as { correcte: boolean }
  }

  it.each(NIVEAUX)('niveau %i : accepte juste dans la tolérance, refuse juste au-delà', (niveau) => {
    const tolerance = TOLERANCE_CALCUL_NIVEAU[niveau]
    expect(reponse(niveau, 1 + tolerance * 0.99).correcte).toBe(true)
    expect(reponse(niveau, 1 - tolerance * 0.99).correcte).toBe(true)
    expect(reponse(niveau, 1 + tolerance * 1.05).correcte).toBe(false)
    expect(reponse(niveau, 1 - tolerance * 1.05).correcte).toBe(false)
  })

  it('une réponse qui n’est pas un nombre est ignorée : ni erreur ni indice', () => {
    const moteur = nouveau(1)
    jouer(moteur, { jusqua: 'v2-calcul' })
    moteur.retirerEvenements()
    moteur.agir({ type: 'repondre', valeur: Number.NaN })
    expect(moteur.retirerEvenements()).toEqual([])
    expect(moteur.etat().tentatives).toEqual({})
  })

  it('l’enfant qui calcule avec les valeurs arrondies de la question est accepté', () => {
    // Niveau 1 : « environ 39 000 km/h » pendant « environ 9,8 heures » (2 chiffres significatifs).
    const moteur = nouveau(1)
    jouer(moteur, { jusqua: 'v2-calcul' })
    expect(norm(moteur.vue().question!)).toBe('Nous avons volé à environ 39 000 km/h pendant environ 9,8 heures. Quelle distance avons-nous parcourue, en kilomètres ?')
    moteur.retirerEvenements()
    moteur.agir({ type: 'repondre', valeur: 39_000 * 9.8 })
    expect(moteur.retirerEvenements()).toContainEqual({ type: 'reponse', correcte: true, valeur: 39_000 * 9.8 })
    expect(moteur.vue().etape?.id).toBe('v3-fin')
    expect(moteur.etat().tentatives).toEqual({})
  })
})

describe('voyage : jalons, durée et radio', () => {
  it('dure environ une minute de jeu avec le facteur de temps existant', () => {
    const { dureeVoyageS } = jouer(nouveau(2))
    expect(dureeVoyageS).toBeGreaterThan(DUREE_VOYAGE_LUNE_VISEE_S * (1 - TOLERANCE_DUREE_VOYAGE))
    expect(dureeVoyageS).toBeLessThan(DUREE_VOYAGE_LUNE_VISEE_S * (1 + TOLERANCE_DUREE_VOYAGE))
  })

  it('émet les jalons à 25, 50 et 75 % dans l’ordre, avant l’arrivée', () => {
    const { evenements } = jouer(nouveau(2))
    const jalons = evenements.filter((e) => e.type === 'jalon') as { part: number; jalon: string }[]
    expect(jalons.map((j) => j.part)).toEqual([0.25, 0.5, 0.75])
    expect(jalons.map((j) => j.jalon)).toEqual(['radio', 'observation', 'observation'])
    const noms = types(evenements)
    expect(noms.lastIndexOf('jalon')).toBeLessThan(noms.indexOf('etoile', noms.lastIndexOf('jalon')))
  })

  it('le message radio a un délai calculé à partir de la distance à la Terre', () => {
    const { evenements } = jouer(nouveau(3))
    const radio = evenements.find((e) => e.type === 'radio') as { distanceKm: number; delaiSecondes: number; texte: string }
    expect(radio.delaiSecondes).toBeCloseTo(delaiRadioAllerRetourSecondes(radio.distanceKm), 12)
    // À un quart du trajet la distance à la Terre est de l'ordre de 10^5 km : le délai est de l'ordre de la seconde.
    expect(radio.distanceKm).toBeGreaterThan(50_000)
    expect(radio.distanceKm).toBeLessThan(200_000)
    expect(radio.delaiSecondes).toBeGreaterThan(0.3)
    expect(radio.delaiSecondes).toBeLessThan(2)
    expect(norm(radio.texte)).toContain('Distance à la Terre')
  })

  it('un jalon tombe dans chaque quart du voyage : l’écran ne reste jamais vide', () => {
    const moteur = nouveau(1)
    jouer(moteur, { jusqua: 'v1-voyage' })
    moteur.retirerEvenements()
    const parts: number[] = []
    let vue: MissionVue = moteur.vue()
    for (let i = 0; i < 20_000 && vue.etape?.id === 'v1-voyage'; i++) {
      moteur.avancer(IMAGE)
      for (const e of moteur.retirerEvenements()) if (e.type === 'jalon') parts.push(vue.voyage?.part ?? 1)
      vue = moteur.vue()
    }
    expect(parts).toHaveLength(3)
    expect(parts[0]).toBeLessThan(0.5)
    expect(parts[2]).toBeGreaterThan(0.5)
  })

  it('le vaisseau avance vers la Lune et s’arrête avant elle', () => {
    const moteur = nouveau(1)
    expect(moteur.vaisseau()).toBeNull()
    jouer(moteur)
    const vaisseau = moteur.vaisseau()!
    expect(vaisseau.position[0]).toBeGreaterThan(300_000)
    expect(vaisseau.position[0]).toBeLessThan(DISTANCE_TERRE_LUNE_KM)
  })

  it('pas de rappel pendant le voyage, même très long', () => {
    const moteur = nouveau(1)
    jouer(moteur, { jusqua: 'v1-voyage' })
    moteur.retirerEvenements()
    for (let i = 0; i < 100; i++) moteur.avancer(IMAGE)
    expect(types(moteur.retirerEvenements())).not.toContain('rappel')
  })
})

describe('rappel doux du copilote', () => {
  function secondesAvantRappel(niveau: Niveau): number {
    const moteur = nouveau(niveau)
    moteur.retirerEvenements()
    let t = 0
    while (t < 200) {
      moteur.avancer(0.05)
      t += 0.05
      if (types(moteur.retirerEvenements()).includes('rappel')) return t
    }
    return Infinity
  }

  it.each(NIVEAUX)('niveau %i : le rappel vient après le délai du niveau', (niveau) => {
    expect(secondesAvantRappel(niveau)).toBeCloseTo(DELAI_RAPPEL_S_NIVEAU[niveau], 0)
  })

  it('le rappel est plus long au niveau 1', () => {
    expect(secondesAvantRappel(1)).toBeGreaterThan(secondesAvantRappel(2))
    expect(secondesAvantRappel(1)).toBeGreaterThan(secondesAvantRappel(4))
  })

  it('c’est un rappel de l’objectif, sans pénalité, et il se répète', () => {
    const moteur = nouveau(4)
    moteur.retirerEvenements()
    for (let i = 0; i < 12 * 20 * 2 + 40; i++) moteur.avancer(0.05)
    const rappels = moteur.retirerEvenements().filter((e) => e.type === 'rappel') as { texte: string }[]
    expect(rappels.length).toBeGreaterThanOrEqual(2)
    expect(rappels[0].texte).toBe(moteur.vue().objectif)
    expect(moteur.etat().tentatives).toEqual({})
    expect(moteur.vue().etoiles).toBe(0)
  })

  it('une action du joueur remet le compteur à zéro', () => {
    const moteur = nouveau(4)
    moteur.retirerEvenements()
    for (let i = 0; i < 11 * 20; i++) moteur.avancer(0.05)
    moteur.agir({ type: 'demander-indice' })
    for (let i = 0; i < 11 * 20; i++) moteur.avancer(0.05)
    expect(types(moteur.retirerEvenements())).not.toContain('rappel')
  })

  it('un onglet resté inactif (dt énorme) ne déclenche pas de rappel d’un coup', () => {
    const moteur = nouveau(1)
    moteur.retirerEvenements()
    moteur.avancer(3600)
    expect(types(moteur.retirerEvenements())).not.toContain('rappel')
  })
})

describe('poussée chronométrée', () => {
  function versPoussee(niveau: Niveau) {
    const moteur = nouveau(niveau)
    jouer(moteur, { jusqua: 'l2-poussee' })
    moteur.retirerEvenements()
    return moteur
  }

  it('la fenêtre s’ouvre après TIMING_OUVERTURE_S ; un appui dedans réussit et donne l’étoile', () => {
    const moteur = versPoussee(2)
    expect(moteur.vue().fenetre?.etat).toBe('attente')
    for (let t = 0; t < TIMING_OUVERTURE_S + 0.1; t += 0.05) moteur.avancer(0.05)
    expect(moteur.vue().fenetre?.etat).toBe('ouverte')
    moteur.agir({ type: 'pousser' })
    const evenements = moteur.retirerEvenements()
    expect(types(evenements)).toContain('etoile')
    expect(evenements.filter((e) => e.type === 'effet').map((e) => (e as { nom: string }).nom)).toContain('poussee')
    expect(moteur.vue().etape?.id).toBe('v1-voyage')
  })

  it('appuyer trop tôt donne un indice et recommence, sans échec', () => {
    const moteur = versPoussee(1)
    moteur.agir({ type: 'pousser' })
    const evenements = moteur.retirerEvenements()
    expect(types(evenements)).toContain('indice')
    expect(moteur.vue().etape?.id).toBe('l2-poussee')
    expect(moteur.vue().fenetre?.etat).toBe('attente')
  })

  it('laisser passer la fenêtre compte comme une tentative manquée', () => {
    const moteur = versPoussee(4)
    for (let t = 0; t < TIMING_OUVERTURE_S + 1.5 + 0.2; t += 0.05) moteur.avancer(0.05)
    expect(moteur.etat().tentatives['l2-poussee']).toBe(1)
    expect(moteur.vue().indice.dernier).not.toBeNull()
  })

  it('la fenêtre est plus large aux bas niveaux (poussée assistée)', () => {
    const duree = (niveau: Niveau) => {
      const moteur = versPoussee(niveau)
      let ouverte = 0
      for (let t = 0; t < 12; t += 0.05) {
        moteur.avancer(0.05)
        if (moteur.vue().fenetre?.etat === 'ouverte') ouverte += 0.05
        if (moteur.vue().etape?.id !== 'l2-poussee') break
      }
      return ouverte
    }
    expect(duree(1)).toBeGreaterThan(duree(3))
    expect(duree(3)).toBeGreaterThan(duree(4))
  })
})

describe('MissionVue', () => {
  it('donne l’objectif du niveau : textes « enfant » aux niveaux 1-2, « adulte » aux niveaux 3-4', () => {
    const objectif = (niveau: Niveau) => nouveau(niveau).vue().objectif
    expect(objectif(1)).toBe(objectif(2))
    expect(objectif(3)).toBe(objectif(4))
    expect(objectif(1)).not.toBe(objectif(3))
    expect(objectif(1)).toBe('Écoute ton copilote.')
  })

  it('le texte de la mission remplace le marqueur {copilote}', () => {
    const moteur = nouveau(1)
    const dialogue = moteur.retirerEvenements().find((e) => e.type === 'dialogue') as { texte: string }
    expect(dialogue.texte).toContain('Nova')
    expect(dialogue.texte).not.toContain('{')
  })

  it('suit la progression par scène : « scène 3 sur 6 », 2 scènes terminées', () => {
    const moteur = nouveau(1)
    jouer(moteur, { jusqua: 'd1-compte' })
    const vue = moteur.vue()
    expect(vue.scene).toMatchObject({ numero: 3, total: 6, id: 'decollage' })
    expect(vue.progression).toEqual({ scenesTerminees: 2, scenesTotal: 6, ratio: 2 / 6 })
  })

  it('commence à la scène 1 avec 0 scène terminée, et finit à 6 sur 6', () => {
    const moteur = nouveau(2)
    expect(moteur.vue().scene).toMatchObject({ numero: 1, total: 6 })
    expect(moteur.vue().progression.scenesTerminees).toBe(0)
    jouer(moteur)
    const fin = moteur.vue()
    expect(fin).toMatchObject({ terminee: true, scene: null, etape: null, actions: [], objectif: '' })
    expect(fin.progression).toEqual({ scenesTerminees: 6, scenesTotal: 6, ratio: 1 })
  })

  it('liste les actions possibles de chaque étape', () => {
    const moteur = nouveau(1)
    expect(moteur.vue().actions).toEqual([{ type: 'continuer' }])
    moteur.agir({ type: 'continuer' })
    const choix = moteur.vue().actions[0]
    expect(choix.type).toBe('choisir')
    expect(choix.options?.map((o) => o.id)).toEqual(['oui', 'explique'])
    jouer(moteur, { jusqua: 'c2-interrupteurs' })
    const action = moteur.vue().actions
    expect(action[0].type).toBe('basculer')
    expect(action[0].interrupteurs?.map((i) => [i.id, i.actif])).toEqual([['batterie', false], ['air', false], ['moteur', false]])
    expect(action.map((a) => a.type)).toContain('demander-indice')
  })

  it('expose l’indice disponible, le décompte des indices restants et le dernier indice', () => {
    const moteur = nouveau(1)
    jouer(moteur, { jusqua: 'c2-interrupteurs' })
    expect(moteur.vue().indice).toEqual({ disponible: true, restants: 3, dernier: null })
    moteur.agir({ type: 'basculer', interrupteur: 'moteur' }) // mauvais ordre
    const vue = moteur.vue()
    expect(vue.indice.restants).toBe(2)
    expect(vue.indice.dernier).toContain('batterie')
    moteur.agir({ type: 'demander-indice' })
    moteur.agir({ type: 'demander-indice' })
    expect(moteur.vue().indice).toMatchObject({ disponible: false, restants: 0 })
    expect(moteur.vue().actions.map((a) => a.type)).not.toContain('demander-indice')
  })

  it('une étape sans aide (dialogue) n’a pas d’indice', () => {
    expect(nouveau(1).vue().indice).toEqual({ disponible: false, restants: 0, dernier: null })
  })

  it('pendant le voyage : part, distance restante et vitesse', () => {
    const moteur = nouveau(1)
    jouer(moteur, { jusqua: 'v1-voyage' })
    expect(moteur.vue().voyage).toMatchObject({ part: 0 })
    for (let i = 0; i < 600; i++) moteur.avancer(IMAGE)
    const voyage = moteur.vue().voyage!
    expect(voyage.part).toBeGreaterThan(0.1)
    expect(voyage.part).toBeLessThan(0.3)
    expect(voyage.vitesseKmS).toBeGreaterThan(10)
    expect(voyage.distanceRestanteKm).toBeGreaterThan(0)
    expect(moteur.vue().actions).toEqual([])
  })

  it('un changement de niveau en cours de route change les textes et l’aide', () => {
    const moteur = nouveau(1)
    jouer(moteur, { jusqua: 'c2-interrupteurs' })
    const avant = moteur.vue()
    moteur.definirNiveau(4)
    const apres = moteur.vue()
    expect(apres.objectif).not.toBe(avant.objectif)
    expect(avant.indice.restants).toBe(3)
    expect(apres.indice.restants).toBe(1)
  })
})

describe('chiffres du storyboard : calculés par le code, écrits selon le niveau', () => {
  function journal(niveau: Niveau, id: string): string {
    const moteur = nouveau(niveau)
    const { evenements } = jouer(moteur)
    return norm((evenements.find((e) => e.type === 'journal' && e.id === id) as { texte: string }).texte)
  }

  it('niveau 1 : valeurs rondes avec « environ » (400 km, 28 000 km/h, 3 km/s)', () => {
    expect(journal(1, 'orbite')).toContain('environ 400 km')
    expect(journal(1, 'orbite')).toContain('environ 28 000 km/h')
    expect(journal(1, 'poussee')).toContain('environ 3 km/s')
  })

  it('niveau 3 : valeurs précises, sans « environ » (402,3 km, 28 160 km/h, 3,037 km/s)', () => {
    // 250 mi × 1,609344 = 402,336 km ; 17 500 mph × 1,609344 = 28 163,52 km/h ; 9 965 ft/s × 0,3048 = 3 037,332 m/s.
    expect(journal(3, 'orbite')).toContain('402,3 km')
    expect(journal(3, 'orbite')).toContain('28 160 km/h')
    expect(journal(3, 'orbite')).not.toContain('environ')
    expect(journal(3, 'poussee')).toContain('3,037 km/s')
  })
})

describe('reprise après sauvegarde', () => {
  function stockageMemoire(): Stockage & { contenu: Map<string, string> } {
    const contenu = new Map<string, string>()
    return { contenu, getItem: (k) => contenu.get(k) ?? null, setItem: (k, v) => void contenu.set(k, v) }
  }

  it('le moteur émet l’état à chaque étape ; une reprise redémarre à l’étape enregistrée', () => {
    const stockage = stockageMemoire()
    const moteur = nouveau(2)
    moteur.ecouter((e) => {
      if (e.type === 'progression') sauvegarderProgression(stockage, e.etat)
    })
    jouer(moteur, { jusqua: 'o2-scanner', erreurs: {} })
    // Une faute sur le scanner, enregistrée, puis le joueur ferme le jeu.
    moteur.agir({ type: 'observer', cible: 'lune', mode: 'reperer' })
    moteur.agir({ type: 'continuer' }) // ignoré : le scanner attend un scan
    const etat = moteur.etat()
    sauvegarderProgression(stockage, etat)

    const repris = creerMoteur(mission, { niveau: 2, progression: JSON.parse(stockage.getItem('horizon.progression')!).missions.mission1 })
    expect(repris.retirerEvenements()[0]).toEqual({ type: 'mission-demarree', mission: 'mission1', reprise: true })
    expect(repris.vue().etape?.id).toBe('o2-scanner')
    expect(repris.etat()).toMatchObject({ tentatives: { 'o2-scanner': 1 }, journal: ['decollage', 'orbite'], etoiles: 1 })
    // La mission se termine ; les étoiles déjà gagnées ne sont pas comptées deux fois.
    jouer(repris)
    expect(repris.vue().terminee).toBe(true)
    expect(repris.vue().etoiles).toBe(5)
  })

  it('chargerProgression + creerMoteur : le chemin complet que prendra l’interface', () => {
    const stockage = stockageMemoire()
    const moteur = nouveau(1)
    moteur.ecouter((e) => e.type === 'progression' && sauvegarderProgression(stockage, e.etat))
    jouer(moteur, { jusqua: 'l1-reperer' })
    const repris = creerMoteur(mission, { niveau: 1, progression: chargerProgression(stockage, mission) })
    expect(repris.vue().etape?.id).toBe('l1-reperer')
    expect(repris.vue().etoiles).toBe(2)
  })

  it('une mission terminée reste terminée à la reprise', () => {
    const moteur = nouveau(3)
    jouer(moteur)
    const repris = creerMoteur(mission, { niveau: 3, progression: moteur.etat() })
    expect(repris.vue().terminee).toBe(true)
    expect(types(repris.retirerEvenements())).toEqual(['mission-demarree', 'mission-terminee'])
  })

  it('une progression invalide est ignorée : la mission commence au début', () => {
    for (const mauvais of [null, 42, 'x', { mission: 'autre' }, { mission: 'mission1', etape: 'inconnue', journal: [1, 'faux'] }]) {
      const moteur = nouveau(1, mauvais)
      const evenement = moteur.retirerEvenements()[0] as { reprise: boolean }
      expect(moteur.vue().etape?.id).toBe('p1-accueil')
      expect(evenement.reprise).toBe(typeof mauvais === 'object' && mauvais !== null && 'mission' in mauvais && mauvais.mission === 'mission1')
      expect(moteur.etat().journal).toEqual([])
    }
  })
})

describe('événements', () => {
  it('ecouter() reçoit les mêmes événements que retirerEvenements(), et se désabonne', () => {
    const moteur = nouveau(1)
    const recus: EvenementMission[] = []
    const desabonner = moteur.ecouter((e) => recus.push(e))
    moteur.retirerEvenements()
    moteur.agir({ type: 'continuer' })
    expect(recus.length).toBeGreaterThan(0)
    desabonner()
    const n = recus.length
    moteur.agir({ type: 'choisir', option: 'oui' })
    expect(recus).toHaveLength(n)
  })

  it('les actions qui n’ont pas de sens sont ignorées sans rien casser', () => {
    const moteur = nouveau(1)
    moteur.retirerEvenements()
    moteur.agir({ type: 'pousser' })
    moteur.agir({ type: 'choisir', option: 'x' })
    moteur.agir({ type: 'repondre', valeur: 1 })
    moteur.agir({ type: 'basculer', interrupteur: 'batterie' })
    expect(moteur.retirerEvenements()).toEqual([])
    expect(moteur.vue().etape?.id).toBe('p1-accueil')
  })

  it('le choix « explique » passe par l’explication, le choix « oui » la saute', () => {
    const a = nouveau(1)
    jouer(a, { jusqua: 'c1-intro' })
    expect(a.vue().etape?.id).toBe('c1-intro')
    const b = nouveau(1)
    b.agir({ type: 'continuer' })
    b.agir({ type: 'choisir', option: 'explique' })
    expect(b.vue().etape?.id).toBe('p3-explication')
  })
})
