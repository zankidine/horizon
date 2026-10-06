import { describe, it, expect } from 'vitest'
import donnees from '../../data/missions/mission1.json'
import { creerMoteur, type EvenementMission } from '../../core/mission-moteur'
import { validerMission } from '../../core/validation-mission'
import { CATALOGUE, estIdSon } from './catalogue'
import { creerAntiRepetition, creerTraducteur, sonPourEvenement, type Commande, DELAI_FIN_RADIO_MS } from './evenements'

const jouer = (id: string, apresMs?: number): Commande => ({ type: 'jouer', id, ...(apresMs ? { apresMs } : {}) }) as Commande

describe('sonPourEvenement : événements du moteur de missions vers des sons', () => {
  it('le début de mission lance l’ambiance de la cabine', () => {
    expect(sonPourEvenement({ type: 'mission-demarree', mission: 'm', reprise: false })).toEqual([
      { type: 'demarrer', id: 'ambiance-cabine' },
    ])
  })

  it('une réponse juste valide, une réponse fausse donne le bip d’erreur doux', () => {
    expect(sonPourEvenement({ type: 'reponse', correcte: true, valeur: 1 })).toEqual([jouer('bip-validation')])
    expect(sonPourEvenement({ type: 'reponse', correcte: false, valeur: 1 })).toEqual([jouer('bip-erreur')])
  })

  it('une étoile donne la petite fanfare, la fin de mission la fanfare de fin et coupe les moteurs', () => {
    expect(sonPourEvenement({ type: 'etoile', etoiles: 1, etoilesMax: 11 })).toEqual([jouer('fanfare-etoile')])
    const fin = sonPourEvenement({ type: 'mission-terminee', etoiles: 11, etoilesMax: 11 })
    expect(fin).toContainEqual(jouer('fanfare-fin'))
    expect(fin).toContainEqual({ type: 'arreter', id: 'poussee' })
  })

  it('la radio : bip de début, puis bip de fin un peu plus tard', () => {
    expect(sonPourEvenement({ type: 'radio', texte: 'x', distanceKm: 1, delaiSecondes: 1 })).toEqual([
      jouer('radio-debut'),
      jouer('radio-fin', DELAI_FIN_RADIO_MS),
    ])
  })

  it('« coupure-radio » donne la coupure nette, « radio-retablie » rouvre la radio', () => {
    expect(sonPourEvenement({ type: 'effet', nom: 'coupure-radio' })).toEqual([jouer('radio-coupure')])
    expect(sonPourEvenement({ type: 'effet', nom: 'radio-retablie' })).toEqual([jouer('radio-debut')])
  })

  it('la poussée chronométrée donne un souffle, le décollage démarre les moteurs', () => {
    expect(sonPourEvenement({ type: 'effet', nom: 'poussee' })).toEqual([jouer('poussee-impulsion')])
    expect(sonPourEvenement({ type: 'effet', nom: 'decollage' })).toContainEqual(expect.objectContaining({ type: 'demarrer', id: 'poussee' }))
    expect(sonPourEvenement({ type: 'effet', nom: 'vibration' })).toEqual([])
  })

  it('le moteur de la descente règle l’intensité de la poussée', () => {
    expect(sonPourEvenement({ type: 'moteur', actif: true })).toEqual([{ type: 'regler', id: 'poussee', params: { intensite: 0.8 } }])
    expect(sonPourEvenement({ type: 'moteur', actif: false })).toEqual([{ type: 'regler', id: 'poussee', params: { intensite: 0 } }])
  })

  it('pendant la sortie : l’ambiance se coupe, il ne reste que la respiration', () => {
    const sortie = sonPourEvenement({ type: 'scene', numero: 10, total: 11, id: 'sortie', titre: 'x' })
    expect(sortie).toContainEqual({ type: 'arreter', id: 'ambiance-cabine' })
    expect(sortie).toContainEqual({ type: 'demarrer', id: 'respiration' })
    expect(sortie).not.toContainEqual(expect.objectContaining({ id: 'ambiance-cabine', type: 'demarrer' }))
  })

  it('les autres scènes : la cabine revient, la respiration s’arrête', () => {
    const autre = sonPourEvenement({ type: 'scene', numero: 11, total: 11, id: 'debriefing', titre: 'x' })
    expect(autre).toContainEqual({ type: 'demarrer', id: 'ambiance-cabine' })
    expect(autre).toContainEqual({ type: 'arreter', id: 'respiration' })
  })

  it('le copilote parle ; le contrôle passe par la radio ; les textes sont ceux de l’écran', () => {
    expect(sonPourEvenement({ type: 'dialogue', locuteur: 'copilote', texte: 'Salut' })).toEqual([{ type: 'parler', texte: 'Salut' }])
    const controle = sonPourEvenement({ type: 'dialogue', locuteur: 'controle', texte: 'Ici le contrôle' })
    expect(controle).toContainEqual({ type: 'parler', texte: 'Ici le contrôle' })
    expect(controle[0]).toEqual(jouer('radio-debut'))
  })

  it('l’alerte douce sert au rappel et à l’assistance, jamais à une erreur du joueur', () => {
    expect(sonPourEvenement({ type: 'rappel', texte: 'x' })).toEqual([jouer('alerte')])
    expect(sonPourEvenement({ type: 'assistance', texte: 'x' })).toEqual([jouer('alerte')])
    expect(sonPourEvenement({ type: 'solution', texte: 'x' })).toEqual([])
  })

  it('le contact de la descente : validation ou erreur douce', () => {
    expect(sonPourEvenement({ type: 'contact', vitesseMs: 1, dansLaZone: true })).toEqual([jouer('bip-validation')])
    expect(sonPourEvenement({ type: 'contact', vitesseMs: 19, dansLaZone: false })).toEqual([jouer('bip-erreur')])
  })

  it('les événements sans son ne donnent aucune commande', () => {
    for (const e of [
      { type: 'objectif', texte: 'x' },
      { type: 'question', texte: 'x' },
      { type: 'journal', id: 'a', titre: 'x', texte: 'x' },
      { type: 'appris', etape: 'a', texte: 'x' },
    ] as EvenementMission[]) {
      expect(sonPourEvenement(e)).toEqual([])
    }
  })

  it('toutes les commandes visent un son du catalogue, du bon type', () => {
    const exemples: EvenementMission[] = [
      { type: 'mission-demarree', mission: 'm', reprise: false },
      { type: 'scene', numero: 1, total: 2, id: 'sortie', titre: 'x' },
      { type: 'scene', numero: 1, total: 2, id: 'cabine', titre: 'x' },
      { type: 'effet', nom: 'decollage' },
      { type: 'effet', nom: 'descente' },
      { type: 'effet', nom: 'poussee' },
      { type: 'moteur', actif: true },
      { type: 'dialogue', locuteur: 'controle', texte: 'x' },
      { type: 'interrupteur', id: 'a', actif: true },
      { type: 'interrupteur', id: 'a', actif: false },
      { type: 'choix', option: 'a' },
      { type: 'indice', numero: 1, texte: 'x' },
      { type: 'fenetre', etat: 'ouverte' },
      { type: 'fenetre', etat: 'attente' },
      { type: 'observation', astre: 'lune', mode: 'reperer', categories: [] },
      { type: 'mission-terminee', etoiles: 1, etoilesMax: 1 },
    ]
    for (const e of exemples) {
      for (const c of sonPourEvenement(e)) {
        if (c.type === 'jouer') {
          expect(estIdSon(c.id) && CATALOGUE[c.id].type).toBe('ponctuel')
        } else if (c.type === 'demarrer' || c.type === 'regler' || c.type === 'arreter') {
          expect(CATALOGUE[c.id].type).toBe('continu')
        }
      }
    }
  })
})

describe('anti-répétition : un même son ne se répète pas trop vite', () => {
  it('refuse le même son avant son intervalle minimal, l’accepte après', () => {
    let t = 0
    const autoriser = creerAntiRepetition(() => t)
    const etoile = jouer('fanfare-etoile')
    const intervalle = CATALOGUE['fanfare-etoile'].intervalleMinMs
    expect(autoriser(etoile)).toBe(true)
    t = intervalle - 1
    expect(autoriser(etoile)).toBe(false)
    t = intervalle
    expect(autoriser(etoile)).toBe(true)
  })

  it('un son refusé ne repousse pas le suivant, et les autres sons sont indépendants', () => {
    let t = 0
    const autoriser = creerAntiRepetition(() => t)
    expect(autoriser(jouer('bip-validation'))).toBe(true)
    expect(autoriser(jouer('bip-erreur'))).toBe(true)
    t = 100
    expect(autoriser(jouer('bip-validation'))).toBe(false)
    t = CATALOGUE['bip-validation'].intervalleMinMs
    expect(autoriser(jouer('bip-validation'))).toBe(true)
  })

  it('les commandes qui ne sont pas « jouer » passent toujours', () => {
    const autoriser = creerAntiRepetition(() => 0)
    const parler: Commande = { type: 'parler', texte: 'a' }
    expect(autoriser(parler)).toBe(true)
    expect(autoriser(parler)).toBe(true)
  })

  it('le traducteur applique l’anti-répétition : dix rappels en rafale, une seule alerte', () => {
    const t = 0
    const traduire = creerTraducteur(() => t)
    const alertes = Array.from({ length: 10 }, () => traduire({ type: 'rappel', texte: 'x' })).flat()
    expect(alertes).toHaveLength(1)
  })
})

describe('branchement sur le vrai moteur de missions (lecture seule)', () => {
  it('s’abonne avec ecouter() et reçoit des commandes, sans modifier le moteur', () => {
    const mission = validerMission(donnees)
    const moteur = creerMoteur(mission, { niveau: 1 })
    const commandes: Commande[] = []
    const traduire = creerTraducteur(() => 0)
    const arreter = moteur.ecouter((e) => commandes.push(...traduire(e)))
    const avant = JSON.stringify(moteur.etat())
    moteur.agir({ type: 'continuer' })
    moteur.agir({ type: 'choisir', option: 'explique' }) // mène à une réplique du copilote
    expect(commandes.some((c) => c.type === 'parler')).toBe(true)
    expect(JSON.stringify(moteur.etat())).not.toBe(avant) // c'est le moteur qui avance, pas le son
    arreter()
    const n = commandes.length
    moteur.agir({ type: 'continuer' })
    expect(commandes).toHaveLength(n)
  })
})
