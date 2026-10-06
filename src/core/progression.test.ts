import { describe, it, expect } from 'vitest'
import donnees from '../data/missions/mission1.json'
import {
  CLE_PROGRESSION,
  VERSION_PROGRESSION,
  chargerProgression,
  etoilesMax,
  lireEtatProgression,
  lireSauvegarde,
  progressionInitiale,
  sauvegarderProgression,
  serialiserSauvegarde,
  type EtatProgression,
  type Stockage,
} from './progression'
import { validerMission } from './validation-mission'

const mission = validerMission(donnees)

function stockage(initial?: string): Stockage & { contenu: Map<string, string> } {
  const contenu = new Map<string, string>()
  if (initial !== undefined) contenu.set(CLE_PROGRESSION, initial)
  return { contenu, getItem: (k) => contenu.get(k) ?? null, setItem: (k, v) => void contenu.set(k, v) }
}

const exemple: EtatProgression = {
  mission: 'mission1',
  etape: 'o2-scanner',
  tentatives: { 'c2-interrupteurs': 2 },
  journal: ['decollage', 'orbite'],
  appris: [],
  etapesEtoilees: ['c2-interrupteurs'],
  etoiles: 1,
  terminee: false,
}

describe('progression : état', () => {
  it('commence au début, sans étoile, sans journal', () => {
    expect(progressionInitiale(mission)).toEqual({
      mission: 'mission1',
      etape: 'p1-accueil',
      tentatives: {},
      journal: [],
      appris: [],
      etapesEtoilees: [],
      etoiles: 0,
      terminee: false,
    })
  })

  it('le nombre d’étoiles possibles vient de la mission', () => {
    expect(etoilesMax(mission)).toBe(mission.etapes.filter((e) => e.etoile === true).length)
    expect(etoilesMax(mission)).toBe(11)
  })

  it('relit exactement ce qui a été sérialisé', () => {
    const relu = lireEtatProgression(JSON.parse(serialiserSauvegarde({ mission1: exemple })).missions.mission1, mission)
    expect(relu).toEqual(exemple)
  })
})

describe('lireEtatProgression : valeurs invalides ignorées', () => {
  it.each([null, undefined, 42, 'texte', [], { mission: 'autre' }, {}])('%j n’est pas l’état de cette mission : null', (brut) => {
    expect(lireEtatProgression(brut, mission)).toBeNull()
  })

  it('une étape inconnue ramène au début, le reste est gardé', () => {
    const relu = lireEtatProgression({ ...exemple, etape: 'inconnue' }, mission)!
    expect(relu.etape).toBe('p1-accueil')
    expect(relu.journal).toEqual(['decollage', 'orbite'])
  })

  it('écarte les entrées de journal inconnues, mal typées ou en double', () => {
    const relu = lireEtatProgression({ ...exemple, journal: ['orbite', 'fantome', 7, 'orbite', null] }, mission)!
    expect(relu.journal).toEqual(['orbite'])
  })

  it('écarte les tentatives invalides (négatives, décimales, étape inconnue, texte)', () => {
    const relu = lireEtatProgression(
      { ...exemple, tentatives: { 'c2-interrupteurs': 3, 'o2-scanner': -1, 'l2-poussee': 1.5, 'v2-calcul': '2', fantome: 4 } },
      mission
    )!
    expect(relu.tentatives).toEqual({ 'c2-interrupteurs': 3 })
  })

  it('recalcule les étoiles : seules les étapes étoilées comptent, une seule fois', () => {
    const relu = lireEtatProgression(
      { ...exemple, etoiles: 99, etapesEtoilees: ['c2-interrupteurs', 'c2-interrupteurs', 'p1-accueil', 'fantome', 3] },
      mission
    )!
    expect(relu.etapesEtoilees).toEqual(['c2-interrupteurs'])
    expect(relu.etoiles).toBe(1)
  })

  it('une mission terminée n’a plus d’étape', () => {
    const relu = lireEtatProgression({ ...exemple, terminee: true }, mission)!
    expect(relu).toMatchObject({ terminee: true, etape: null })
  })

  it('« terminee » autre que true est ignoré', () => {
    expect(lireEtatProgression({ ...exemple, terminee: 'oui' }, mission)!.terminee).toBe(false)
  })
})

describe('sauvegarde versionnée', () => {
  it('écrit la version et les états par mission', () => {
    expect(JSON.parse(serialiserSauvegarde({ mission1: exemple }))).toMatchObject({
      version: VERSION_PROGRESSION,
      missions: { mission1: { etape: 'o2-scanner' } },
    })
  })

  it('renvoie {} pour un contenu absent, illisible ou d’une autre version', () => {
    for (const brut of [null, undefined, '', 'pas du json {', '42', 'null', '[]', JSON.stringify({ version: 999, missions: {} }), JSON.stringify({ missions: {} }), JSON.stringify({ version: 1 })]) {
      expect(lireSauvegarde(brut)).toEqual({})
    }
  })

  it('sauvegarder puis charger redonne la même progression', () => {
    const s = stockage()
    expect(sauvegarderProgression(s, exemple)).toBe(true)
    expect(chargerProgression(s, mission)).toEqual(exemple)
  })

  it('sans sauvegarde ou avec une sauvegarde illisible, le joueur recommence au début', () => {
    expect(chargerProgression(stockage(), mission)).toEqual(progressionInitiale(mission))
    expect(chargerProgression(stockage('{pas du json'), mission)).toEqual(progressionInitiale(mission))
    expect(chargerProgression(stockage(JSON.stringify({ version: 2, missions: { mission1: exemple } })), mission)).toEqual(
      progressionInitiale(mission)
    )
  })

  it('garde la progression des autres missions en enregistrant celle-ci', () => {
    const autre = { ...exemple, mission: 'mission2', etape: 'x' }
    const s = stockage(serialiserSauvegarde({ mission2: autre }))
    sauvegarderProgression(s, exemple)
    const missions = lireSauvegarde(s.getItem(CLE_PROGRESSION))
    expect(Object.keys(missions).sort()).toEqual(['mission1', 'mission2'])
    expect(missions.mission2).toEqual(autre)
  })

  it('abandonne les entrées des autres missions qui n’ont pas la forme d’un état', () => {
    const s = stockage(JSON.stringify({ version: 1, missions: { mission2: 'abîmé', mission3: { mission: 'autre' }, mission1: 7 } }))
    sauvegarderProgression(s, exemple)
    expect(Object.keys(lireSauvegarde(s.getItem(CLE_PROGRESSION)))).toEqual(['mission1'])
  })

  it('un stockage qui échoue (navigation privée) ne casse rien', () => {
    const casse: Stockage = {
      getItem: () => {
        throw new Error('indisponible')
      },
      setItem: () => {
        throw new Error('plein')
      },
    }
    expect(chargerProgression(casse, mission)).toEqual(progressionInitiale(mission))
    expect(sauvegarderProgression(casse, exemple)).toBe(false)
  })
})
