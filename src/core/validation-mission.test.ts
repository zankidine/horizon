import { describe, it, expect } from 'vitest'
import donnees from '../data/missions/mission1.json'
import { ErreurValidation } from './validation'
import { validerMission } from './validation-mission'

type Arbre = Record<string, unknown>

/** Copie profonde de la mission réelle, à abîmer dans chaque test. */
function copie(): Arbre & { etapes: Arbre[]; valeurs: Arbre; journal: Arbre[]; scenes: Arbre[] } {
  return structuredClone(donnees) as never
}

function problemesDe(invalide: unknown): string {
  try {
    validerMission(invalide)
  } catch (erreur) {
    expect(erreur).toBeInstanceOf(ErreurValidation)
    return (erreur as ErreurValidation).problemes.join('\n')
  }
  throw new Error('La validation aurait dû échouer')
}

const etape = (m: ReturnType<typeof copie>, id: string) => m.etapes.find((e) => e.id === id)!

describe('mission1.json', () => {
  it('est valide : six scènes, un début, une seule étape finale', () => {
    const mission = validerMission(donnees)
    expect(mission.scenes).toHaveLength(6)
    expect(mission.etapes.find((e) => e.id === mission.debut)).toBeDefined()
    expect(mission.etapes.filter((e) => e.fin === true)).toHaveLength(1)
  })

  it('emploie les sept types d’étapes', () => {
    const types = new Set(validerMission(donnees).etapes.map((e) => e.type))
    expect([...types].sort()).toEqual(['action', 'calcul', 'choix', 'dialogue', 'observation', 'timing', 'voyage'])
  })

  it('ne contient que des références pour les valeurs calculables : aucun nombre sauf la part des jalons', () => {
    const nombres: string[] = []
    const parcourir = (o: unknown, chemin: string): void => {
      if (typeof o === 'number') nombres.push(chemin)
      else if (Array.isArray(o)) o.forEach((v, i) => parcourir(v, `${chemin}[${i}]`))
      else if (typeof o === 'object' && o !== null) {
        for (const [k, v] of Object.entries(o)) parcourir(v, `${chemin}.${k}`)
      }
    }
    parcourir(donnees, '')
    expect(nombres.every((c) => c.endsWith('.part'))).toBe(true)
    expect(nombres.length).toBe(3)
  })

  it('chaque texte existe en version enfant et adulte (validé), jamais vide', () => {
    expect(() => validerMission(donnees)).not.toThrow()
  })
})

describe('validerMission : références et expressions', () => {
  it('refuse une constante inconnue', () => {
    const m = copie()
    ;(m.valeurs.altitude as Arbre).expr = { ref: 'ALTITUDE_ORBITE_KM_FAUX' }
    expect(problemesDe(m)).toContain('« ALTITUDE_ORBITE_KM_FAUX » n\'existe pas dans constants.ts')
  })

  it('refuse un nombre écrit en dur à la place d’une expression', () => {
    const m = copie()
    ;(etape(m, 'v2-calcul') as Arbre).reponse = 384_400
    expect(problemesDe(m)).toContain('pas de nombre écrit en dur')
  })

  it('refuse une entrée de table inconnue et une constante qui n’est pas un nombre', () => {
    const m = copie()
    ;(etape(m, 'v1-voyage') as Arbre).facteurTemps = { ref: 'VITESSES_CROISIERE_KM_H.vite' }
    ;(etape(m, 'v1-voyage') as Arbre).vitesse = { ref: 'VITESSES_CROISIERE_KM_H' }
    const texte = problemesDe(m)
    expect(texte).toContain('VITESSES_CROISIERE_KM_H.vite')
    expect(texte).toContain('vitesse.ref')
  })

  it('accepte une entrée de table (VITESSES_CROISIERE_KM_H.normale)', () => {
    const m = copie()
    ;(etape(m, 'v1-voyage') as Arbre).facteurTemps = { ref: 'VITESSES_CROISIERE_KM_H.normale' }
    expect(() => validerMission(m)).not.toThrow()
  })

  it('refuse un nom hérité de Object.prototype', () => {
    const m = copie()
    ;(m.valeurs.altitude as Arbre).expr = { ref: 'toString' }
    expect(problemesDe(m)).toContain('toString')
  })

  it('refuse une expression mal formée (clé inconnue, deux clés, produit à un terme)', () => {
    const m = copie()
    ;(m.valeurs.altitude as Arbre).expr = { cube: [{ ref: 'MILE_KM' }] }
    ;(m.valeurs.gain as Arbre).expr = { ref: 'MILE_KM', produit: [] }
    ;(m.valeurs.vitesseOrbite as Arbre).expr = { produit: [{ ref: 'MILE_KM' }] }
    const texte = problemesDe(m)
    expect(texte).toContain('clé « cube » inconnue')
    expect(texte).toContain('une seule clé attendue')
    expect(texte).toContain('au moins deux expressions')
  })

  it('refuse un astre inconnu', () => {
    const m = copie()
    ;(etape(m, 'o2-scanner') as Arbre).cible = 'pluton'
    ;(etape(m, 'v1-voyage') as Arbre).cible = 'mars'
    const texte = problemesDe(m)
    expect(texte).toContain('astre inconnu « pluton »')
    expect(texte).toContain('astre inconnu « mars »')
  })
})

describe('validerMission : graphe des étapes', () => {
  it('refuse une suite qui n’existe pas', () => {
    const m = copie()
    etape(m, 'p1-accueil').suivant = 'nulle-part'
    expect(problemesDe(m)).toContain('la suite « nulle-part » n\'existe pas')
  })

  it('refuse une étape sans suite qui n’est pas finale', () => {
    const m = copie()
    delete etape(m, 'd1-compte').suivant
    expect(problemesDe(m)).toContain('étape « d1-compte » : sans suite')
  })

  it('refuse une étape finale qui a une suite', () => {
    const m = copie()
    etape(m, 'v3-fin').suivant = 'p1-accueil'
    expect(problemesDe(m)).toContain('une étape finale n\'a pas de suite')
  })

  it('refuse une boucle', () => {
    const m = copie()
    etape(m, 'o1-orbite').suivant = 'c1-intro'
    const texte = problemesDe(m)
    expect(texte).toContain('boucle :')
    expect(texte).toContain('c1-intro')
  })

  it('refuse une boucle sur un choix (option qui revient en arrière)', () => {
    const m = copie()
    ;((etape(m, 'p2-choix').options as Arbre[])[1] as Arbre).suivant = 'p1-accueil'
    expect(problemesDe(m)).toContain('boucle :')
  })

  it('refuse une étape inatteignable', () => {
    const m = copie()
    m.etapes.push({ ...etape(m, 'p3-explication'), id: 'orpheline' })
    expect(problemesDe(m)).toContain('étape « orpheline » : inatteignable')
  })

  it('refuse un début inexistant', () => {
    const m = copie()
    m.debut = 'rien'
    expect(problemesDe(m)).toContain('debut : l\'étape « rien » n\'existe pas')
  })

  it('refuse un choix qui a un « suivant » (chaque option a sa suite)', () => {
    const m = copie()
    etape(m, 'p2-choix').suivant = 'c1-intro'
    expect(problemesDe(m)).toContain('un choix n\'a pas de « suivant »')
  })

  it('refuse une option de choix sans suite', () => {
    const m = copie()
    delete ((etape(m, 'p2-choix').options as Arbre[])[0] as Arbre).suivant
    expect(problemesDe(m)).toContain('chaque option doit avoir une suite')
  })
})

describe('validerMission : structure, textes et aide', () => {
  it('refuse un texte sans version adulte', () => {
    const m = copie()
    delete (etape(m, 'p1-accueil').texte as Arbre).adulte
    expect(problemesDe(m)).toContain('etapes[0].texte.adulte : texte non vide attendu')
  })

  it('refuse un marqueur qui n’est défini nulle part', () => {
    const m = copie()
    ;(etape(m, 'p1-accueil').texte as Arbre).enfant = 'Bonjour {inconnu} !'
    expect(problemesDe(m)).toContain('le marqueur {inconnu} n\'est pas défini')
  })

  it('accepte {reponse} dans l’aide d’un calcul, mais pas dans un dialogue', () => {
    const m = copie()
    ;(etape(m, 'p1-accueil').texte as Arbre).enfant = 'Voici {reponse}.'
    expect(problemesDe(m)).toContain('{reponse}')
  })

  it('accepte {distance} et {delai} dans un jalon, mais pas dans un dialogue', () => {
    const m = copie()
    ;(etape(m, 'p1-accueil').texte as Arbre).enfant = 'À {distance} de la Terre.'
    expect(problemesDe(m)).toContain('{distance}')
  })

  it('refuse une aide sans indice ou sans solution (une erreur donne un indice, puis la solution)', () => {
    const m = copie()
    etape(m, 'v2-calcul').indices = []
    delete etape(m, 'l1-reperer').solution
    const texte = problemesDe(m)
    expect(texte).toContain('indices : au moins un indice attendu')
    expect(texte).toContain('.solution : objet { enfant, adulte } attendu')
  })

  it('refuse un jalon hors de 0-1 ou dans le désordre', () => {
    const m = copie()
    const jalons = etape(m, 'v1-voyage').jalons as Arbre[]
    jalons[0].part = 1.2
    jalons[2].part = 0.4
    jalons[1].part = 0.5
    const texte = problemesDe(m)
    expect(texte).toContain('nombre strictement entre 0 et 1')
    expect(texte).toContain('ordre croissant')
  })

  it('refuse un jalon d’observation sans astre et un jalon de journal inconnu', () => {
    const m = copie()
    const jalons = etape(m, 'v1-voyage').jalons as Arbre[]
    delete jalons[1].astre
    jalons[0].journal = 'fantome'
    const texte = problemesDe(m)
    expect(texte).toContain('astre inconnu')
    expect(texte).toContain('entrée de journal inconnue « fantome »')
  })

  it('refuse une scène inconnue, une scène sans étape, un identifiant en double', () => {
    const m = copie()
    etape(m, 'p1-accueil').scene = 'fantome'
    m.scenes.push({ id: 'vide', titre: { enfant: 'a', adulte: 'b' } })
    m.etapes[1].id = 'p1-accueil'
    const texte = problemesDe(m)
    expect(texte).toContain('scène inconnue « fantome »')
    expect(texte).toContain('scène « vide » : aucune étape')
    expect(texte).toContain('« p1-accueil » est en double')
  })

  it('refuse un type d’étape, un locuteur ou un ordre inconnus', () => {
    const m = copie()
    etape(m, 'p3-explication').locuteur = 'robot'
    etape(m, 'c2-interrupteurs').ordre = 'au-hasard'
    etape(m, 'o1-orbite').type = 'magie'
    const texte = problemesDe(m)
    expect(texte).toContain('locuteur')
    expect(texte).toContain('ordre')
    expect(texte).toContain('type')
  })

  it('refuse une entrée de journal inconnue sur une étape, et une valeur au nom réservé', () => {
    const m = copie()
    etape(m, 'd2-decollage').journal = 'fantome'
    m.valeurs.copilote = { expr: { ref: 'MILE_KM' }, format: 'nombre' }
    const texte = problemesDe(m)
    expect(texte).toContain('entrée de journal inconnue « fantome »')
    expect(texte).toContain('marqueur réservé')
  })

  it('refuse des données qui ne sont pas un objet, et liste tous les problèmes', () => {
    expect(problemesDe(null)).toContain('objet attendu')
    const m = copie()
    etape(m, 'p1-accueil').suivant = 'x'
    etape(m, 'd1-compte').suivant = 'y'
    expect(problemesDe(m).split('\n').filter((l) => l.includes('n\'existe pas')).length).toBe(2)
  })
})
