import { describe, expect, it } from 'vitest'
import donnees from '../data/missions/mission1.json'
import type { Etape } from '../core/mission-types'
import type { Niveau } from '../core/niveaux'
import { CLE_PROGRESSION, lireSauvegarde, type Stockage } from '../core/progression'
import { validerMission } from '../core/validation-mission'
import { CLE_JOURNAL, DELAI_DOUBLE_APPUI_MS, SessionMission } from './mission-session'

const mission = validerMission(donnees)
const etapeDe = (id: string): Etape => mission.etapes.find((e) => e.id === id) as Etape

function stockageMemoire(): Stockage & { valeurs: Map<string, string> } {
  const valeurs = new Map<string, string>()
  return {
    valeurs,
    getItem: (cle) => valeurs.get(cle) ?? null,
    setItem: (cle, valeur) => void valeurs.set(cle, valeur),
  }
}

function creer(niveau: Niveau, stockage: Stockage | null = stockageMemoire()) {
  const horloge = { ms: 0 }
  const session = new SessionMission({ mission, niveau, nomCopilote: 'Nova', stockage, maintenant: () => horloge.ms })
  const avancer = (dt: number) => {
    horloge.ms += dt * 1000
    session.avancer(dt)
  }
  return { session, horloge, avancer, stockage }
}

type Ctx = ReturnType<typeof creer>

/** Joue l'étape courante comme un joueur : `erreurs` mauvaises tentatives avant la bonne. */
function jouerEtape(ctx: Ctx, erreurs: number): void {
  const { session, avancer } = ctx
  const { vue, details } = session.instantane()
  const etape = etapeDe(vue.etape!.id)
  switch (vue.etape!.type) {
    case 'dialogue':
      session.agir({ type: 'continuer' })
      break
    case 'choix':
      session.agir({ type: 'choisir', option: vue.actions[0].options![0].id })
      break
    case 'calcul':
      for (let i = 0; i < erreurs && session.instantane().vue.etape?.id === etape.id; i++) {
        session.agir({ type: 'repondre', valeur: details.reponseAttendue! * 0.5 })
      }
      if (session.instantane().vue.etape?.id === etape.id) session.agir({ type: 'repondre', valeur: details.reponseAttendue! })
      break
    case 'action': {
      const ids = (etape as Extract<Etape, { type: 'action' }>).interrupteurs.map((i) => i.id)
      for (let i = 0; i < erreurs && session.instantane().vue.etape?.id === etape.id; i++) {
        session.agir({ type: 'basculer', interrupteur: ids[ids.length - 1] }) // mauvais ordre
      }
      for (const id of ids) if (session.instantane().vue.etape?.id === etape.id) session.agir({ type: 'basculer', interrupteur: id })
      break
    }
    case 'timing': {
      for (let i = 0; i < erreurs && session.instantane().vue.etape?.id === etape.id; i++) {
        session.agir({ type: 'pousser' }) // trop tôt
        avancer(DELAI_DOUBLE_APPUI_MS / 1000 + 0.1)
      }
      for (let i = 0; i < 2000 && session.instantane().vue.etape?.id === etape.id; i++) {
        if (session.instantane().vue.fenetre?.etat === 'ouverte') {
          session.agir({ type: 'pousser' })
          break
        }
        avancer(0.05)
      }
      break
    }
    case 'voyage':
      for (let i = 0; i < 5000 && session.instantane().vue.etape?.id === etape.id; i++) avancer(0.05)
      break
    case 'observation': {
      const o = etape as Extract<Etape, { type: 'observation' }>
      for (let i = 0; i < erreurs && session.instantane().vue.etape?.id === etape.id; i++) {
        session.agir({ type: 'observer', cible: o.cible === 'terre' ? 'lune' : 'terre', mode: o.mode })
      }
      if (session.instantane().vue.etape?.id === etape.id) session.agir({ type: 'observer', cible: o.cible, mode: o.mode })
      break
    }
    case 'descente':
      session.agir({ type: 'moteur', actif: true })
      for (let i = 0; i < 20000 && session.instantane().vue.etape?.id === etape.id; i++) avancer(0.05)
      break
  }
}

function jouerTout(ctx: Ctx, erreurs: number): string[] {
  const vues: string[] = []
  for (let n = 0; n < 400 && !ctx.session.instantane().vue.terminee; n++) {
    const id = ctx.session.instantane().vue.etape!.id
    vues.push(ctx.session.instantane().vue.etape!.type)
    jouerEtape(ctx, erreurs)
    // Un rattrapage peut laisser l'étape en place (tentatives) : on rejoue la même.
    if (ctx.session.instantane().vue.etape?.id === id && n > 390) throw new Error(`bloqué sur ${id}`)
  }
  return vues
}

describe('SessionMission : parcours complet', () => {
  for (const niveau of [1, 4] as const) {
    for (const erreurs of [0, 3]) {
      it(`mène la mission 1 à son terme au niveau ${niveau}, avec ${erreurs} erreur(s) par étape`, () => {
        const ctx = creer(niveau)
        const types = jouerTout(ctx, erreurs)
        const { vue } = ctx.session.instantane()
        expect(vue.terminee).toBe(true)
        expect(vue.progression.scenesTerminees).toBe(vue.progression.scenesTotal)
        expect(types).toEqual(expect.arrayContaining(['dialogue', 'choix', 'calcul', 'action', 'timing', 'voyage', 'observation', 'descente']))
        expect(vue.etoiles).toBeLessThanOrEqual(vue.etoilesMax)
        if (erreurs === 0) expect(vue.etoiles).toBe(vue.etoilesMax)
        expect(vue.journal.length).toBeGreaterThan(0)
        expect(ctx.session.instantane().journal.every((e) => e.titre !== '' && e.texte !== '')).toBe(true)
      })
    }
  }

  it('propose toujours une action : aucune étape sans bouton', () => {
    const ctx = creer(1)
    for (let n = 0; n < 400 && !ctx.session.instantane().vue.terminee; n++) {
      const { vue } = ctx.session.instantane()
      // Le voyage n'a pas de bouton : l'écran montre la progression, le temps passe seul.
      if (vue.etape!.type !== 'voyage') expect(vue.actions.length).toBeGreaterThan(0)
      jouerEtape(ctx, 0)
    }
    expect(ctx.session.instantane().vue.terminee).toBe(true)
  })
})

describe('SessionMission : rythme et retours', () => {
  it("n'avance jamais seule un dialogue", () => {
    const { session, avancer } = creer(1)
    const id = session.instantane().vue.etape!.id
    expect(session.instantane().vue.etape!.type).toBe('dialogue')
    for (let i = 0; i < 3000; i++) avancer(0.1) // cinq minutes sans toucher
    expect(session.instantane().vue.etape!.id).toBe(id)
    expect(session.instantane().replique?.texte).toBeTruthy()
  })

  it('affiche la réplique avec le nom du copilote', () => {
    const { session } = creer(1)
    expect(session.instantane().replique?.locuteur).toBe('copilote')
    expect(session.instantane().replique?.texte).toContain('Nova')
  })

  it('garde un indice affiché jusqu\'à ce que le joueur le ferme', () => {
    const ctx = creer(1)
    while (ctx.session.instantane().vue.etape!.id !== 'v2-calcul') jouerEtape(ctx, 0)
    const attendu = ctx.session.instantane().details.reponseAttendue!
    ctx.session.agir({ type: 'repondre', valeur: attendu * 0.5 })
    let { retours } = ctx.session.instantane()
    expect(retours.map((r) => r.genre)).toEqual(['indice'])
    expect(ctx.session.instantane().erreurs).toBe(1)
    for (let i = 0; i < 200; i++) ctx.avancer(0.05)
    expect(ctx.session.instantane().retours).toHaveLength(1)
    ctx.session.fermerRetour(retours[0].id)
    ;({ retours } = ctx.session.instantane())
    expect(retours).toHaveLength(0)
  })

  it('garde la solution affichée à l\'étape suivante, jusqu\'à sa fermeture', () => {
    const ctx = creer(1)
    while (ctx.session.instantane().vue.etape!.id !== 'v2-calcul') jouerEtape(ctx, 0)
    const attendu = ctx.session.instantane().details.reponseAttendue!
    for (let i = 0; i < 6 && ctx.session.instantane().vue.etape!.id === 'v2-calcul'; i++) {
      ctx.session.agir({ type: 'repondre', valeur: attendu * 0.5 })
    }
    const apres = ctx.session.instantane()
    expect(apres.vue.etape!.id).not.toBe('v2-calcul')
    expect(apres.retours.map((r) => r.genre)).toEqual(['solution'])
    jouerEtape(ctx, 0) // le joueur continue : la solution reste
    expect(ctx.session.instantane().retours.map((r) => r.genre)).toEqual(['solution'])
    ctx.session.fermerRetour(ctx.session.instantane().retours[0].id)
    expect(ctx.session.instantane().retours).toHaveLength(0)
  })

  it('efface un indice quand son étape est réussie', () => {
    const ctx = creer(1)
    while (ctx.session.instantane().vue.etape!.id !== 'v2-calcul') jouerEtape(ctx, 0)
    ctx.session.agir({ type: 'repondre', valeur: ctx.session.instantane().details.reponseAttendue! * 0.5 })
    ctx.session.agir({ type: 'repondre', valeur: ctx.session.instantane().details.reponseAttendue! })
    expect(ctx.session.instantane().retours.filter((r) => r.genre === 'indice')).toHaveLength(0)
  })

  it('donne le rappel doux puis le retire dès que le joueur agit', () => {
    const ctx = creer(1)
    jouerEtape(ctx, 0) // p1
    for (let i = 0; i < 400 && !ctx.session.instantane().retours.some((r) => r.genre === 'rappel'); i++) ctx.avancer(0.1)
    expect(ctx.session.instantane().retours.some((r) => r.genre === 'rappel')).toBe(true)
    ctx.session.agir({ type: 'choisir', option: 'oui' })
    expect(ctx.session.instantane().retours.some((r) => r.genre === 'rappel')).toBe(false)
  })

  it('ignore le double appui sur la poussée', () => {
    const ctx = creer(1)
    while (ctx.session.instantane().vue.etape!.id !== 'l2-poussee') jouerEtape(ctx, 0)
    ctx.session.agir({ type: 'pousser' }) // trop tôt : une tentative
    ctx.session.agir({ type: 'pousser' }) // double appui : ignoré
    ctx.session.agir({ type: 'pousser' })
    expect(ctx.session.progression().tentatives['l2-poussee']).toBe(1)
    ctx.avancer(DELAI_DOUBLE_APPUI_MS / 1000 + 0.05)
    ctx.session.agir({ type: 'pousser' }) // appui distinct : compté
    expect(ctx.session.progression().tentatives['l2-poussee']).toBe(2)
  })

  it('laisse l\'assistance agir : au niveau 1, un appui lent suffit', () => {
    const ctx = creer(1)
    while (ctx.session.instantane().vue.etape!.id !== 'l2-poussee') jouerEtape(ctx, 0)
    for (let i = 0; i < 200 && ctx.session.instantane().vue.fenetre?.etat !== 'ouverte'; i++) ctx.avancer(0.05)
    expect(ctx.session.instantane().vue.fenetre?.etat).toBe('ouverte')
    ctx.avancer(2) // appui lent : deux secondes après l'ouverture
    expect(ctx.session.instantane().vue.fenetre?.etat).toBe('ouverte')
    ctx.session.agir({ type: 'pousser' })
    expect(ctx.session.instantane().vue.etape!.id).not.toBe('l2-poussee')
  })

  it('montre le coup de pouce de la descente avec le texte fourni', () => {
    const horloge = { ms: 0 }
    const session = new SessionMission({
      mission,
      niveau: 1,
      nomCopilote: 'Nova',
      stockage: null,
      texteAssistance: 'Je freine pour toi.',
      maintenant: () => horloge.ms,
    })
    const avancer = (dt: number) => {
      horloge.ms += dt * 1000
      session.avancer(dt)
    }
    const ctx: Ctx = { session, horloge, stockage: null, avancer }
    while (session.instantane().vue.etape!.id !== 's9-2') jouerEtape(ctx, 0)
    // Le joueur ne touche à rien : le copilote freine à sa place.
    for (let i = 0; i < 20000 && !session.instantane().retours.some((r) => r.genre === 'assistance'); i++) avancer(0.05)
    expect(session.instantane().retours.find((r) => r.genre === 'assistance')?.texte).toBe('Je freine pour toi.')
    expect(session.instantane().vue.descente?.assistance).toBe(true)
  })
})

describe('SessionMission : progression et reprise', () => {
  it('sauvegarde à chaque étape', () => {
    const { session, stockage } = creer(1)
    session.agir({ type: 'continuer' })
    const sauvee = lireSauvegarde(stockage!.getItem(CLE_PROGRESSION))[mission.id] as { etape: string }
    expect(sauvee.etape).toBe(session.instantane().vue.etape!.id)
  })

  it('propose de reprendre une mission commencée, puis reprend à la même étape', () => {
    const premiere = creer(1)
    while (premiere.session.instantane().vue.etape!.id !== 'v2-calcul') jouerEtape(premiere, 0)
    const etape = premiere.session.instantane().vue.etape!.id

    const seconde = creer(1, premiere.stockage)
    expect(seconde.session.instantane().reprise).toBe(true)
    expect(seconde.session.instantane().vue.etape!.id).toBe(etape)
    // Pendant le choix, rien n'avance et rien ne s'envoie au moteur.
    seconde.session.agir({ type: 'repondre', valeur: 1 })
    seconde.avancer(5)
    expect(seconde.session.progression().tentatives[etape] ?? 0).toBe(0)
    seconde.session.continuerReprise()
    expect(seconde.session.instantane().reprise).toBe(false)
    expect(seconde.session.instantane().vue.etoiles).toBe(premiere.session.instantane().vue.etoiles)
  })

  it('retrouve le journal, avec ses textes, après un rechargement', () => {
    const premiere = creer(3)
    while (premiere.session.instantane().vue.etape!.id !== 'v3-fin') jouerEtape(premiere, 0)
    const avant = premiere.session.instantane().journal
    expect(avant.length).toBeGreaterThan(1)
    const seconde = creer(3, premiere.stockage)
    expect(seconde.session.instantane().journal).toEqual(avant)
    expect(premiere.stockage!.getItem(CLE_JOURNAL)).toContain('"version":1')
  })

  it('ne propose pas de reprise pour une première partie', () => {
    expect(creer(1).session.instantane().reprise).toBe(false)
  })

  it('affiche directement la fin d\'une mission terminée', () => {
    const premiere = creer(1)
    jouerTout(premiere, 0)
    const seconde = creer(1, premiere.stockage)
    expect(seconde.session.instantane().vue.terminee).toBe(true)
    expect(seconde.session.instantane().reprise).toBe(false)
  })

  it('recommence : première scène, étoiles et journal à zéro, sauvegarde effacée', () => {
    const ctx = creer(1)
    jouerTout(ctx, 0)
    ctx.session.recommencer()
    const { vue, journal, retours } = ctx.session.instantane()
    expect(vue.terminee).toBe(false)
    expect(vue.etape!.id).toBe(mission.debut)
    expect(vue.etoiles).toBe(0)
    expect(journal).toHaveLength(0)
    expect(retours).toHaveLength(0)
    const sauvee = lireSauvegarde(ctx.stockage!.getItem(CLE_PROGRESSION))[mission.id] as { etape: string; terminee: boolean }
    expect(sauvee.terminee).toBe(false)
    expect(sauvee.etape).toBe(mission.debut)
    expect(creer(1, ctx.stockage).session.instantane().reprise).toBe(false)
  })

  it('joue sans stockage (navigation privée) et avec un stockage qui refuse d\'écrire', () => {
    expect(() => jouerTout(creer(1, null), 0)).not.toThrow()
    const refuse: Stockage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota')
      },
    }
    const ctx = creer(1, refuse)
    expect(() => jouerTout(ctx, 0)).not.toThrow()
    expect(ctx.session.instantane().vue.terminee).toBe(true)
  })

  it('ignore un contenu de sauvegarde ou de journal illisible', () => {
    const stockage = stockageMemoire()
    stockage.setItem(CLE_PROGRESSION, '{pas du json')
    stockage.setItem(CLE_JOURNAL, '[1,2')
    const { session } = creer(1, stockage)
    expect(session.instantane().vue.etape!.id).toBe(mission.debut)
    expect(session.instantane().reprise).toBe(false)
  })

  it('prévient les abonnés quand l\'affichage change', () => {
    const { session } = creer(1)
    let n = 0
    const fin = session.abonner(() => n++)
    session.agir({ type: 'continuer' })
    expect(n).toBe(1)
    fin()
    session.agir({ type: 'choisir', option: 'oui' })
    expect(n).toBe(1)
  })
})
