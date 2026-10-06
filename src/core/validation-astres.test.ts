import { describe, it, expect } from 'vitest'
import donnees from '../data/astres.json'
import { ErreurValidation } from './validation'
import { validerAstres } from './validation-astres'

type Arbre = Record<string, unknown>

/** Copie profonde des données réelles, à abîmer dans chaque test. */
function copie(): { astres: Arbre[] } {
  return structuredClone(donnees) as unknown as { astres: Arbre[] }
}

function problemesDe(invalide: unknown): string {
  try {
    validerAstres(invalide)
  } catch (erreur) {
    expect(erreur).toBeInstanceOf(ErreurValidation)
    return (erreur as ErreurValidation).problemes.join('\n')
  }
  throw new Error('La validation aurait dû échouer')
}

describe('astres.json', () => {
  it('est valide : Terre, Lune et Mars', () => {
    expect(validerAstres(donnees).map((a) => a.id)).toEqual(['terre', 'lune', 'mars'])
  })

  it('toute valeur réelle a une unité, une source https et une date AAAA-MM-JJ', () => {
    const verifier = (o: unknown): void => {
      if (Array.isArray(o)) return o.forEach(verifier)
      if (typeof o !== 'object' || o === null) return
      const objet = o as Arbre
      if ('valeur' in objet && 'source' in objet) {
        expect(objet.unite).toBeTruthy()
        const source = objet.source as Arbre
        expect(source.url).toMatch(/^https:\/\/nssdc\.gsfc\.nasa\.gov\//)
        expect(source.date_consultation).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(source.unite_origine).toBe(objet.unite)
      }
      Object.values(objet).forEach(verifier)
    }
    verifier(donnees)
  })

  it('les trous sont explicites : une raison, jamais un zéro', () => {
    const lune = validerAstres(donnees).find((a) => a.id === 'lune')!
    for (const trou of [lune.dureeJour, lune.distanceSoleil, lune.nombreLunes, lune.temperatures[0]]) {
      expect(trou).toMatchObject({ indisponible: true })
      expect(JSON.stringify(trou)).not.toContain('"valeur"')
    }
  })
})

describe('validerAstres : sources', () => {
  it('refuse une valeur sans source', () => {
    const d = copie()
    delete (d.astres[0].masse as Arbre).source
    expect(problemesDe(d)).toContain('astres[0].masse.source : source')
  })

  it('refuse une source sans URL, avec une URL non https ou invalide', () => {
    for (const url of [undefined, '', 'http://nssdc.gsfc.nasa.gov/x', 'pas une url']) {
      const d = copie()
      const source = (d.astres[1].graviteSurface as Arbre).source as Arbre
      if (url === undefined) delete source.url
      else source.url = url
      expect(problemesDe(d)).toContain('astres[1].graviteSurface.source.url')
    }
  })

  it('refuse une source sans date de consultation ou avec une date impossible', () => {
    for (const date of [undefined, '06/10/2026', '2026-13-40', '2026-02-30']) {
      const d = copie()
      const source = (d.astres[2].masse as Arbre).source as Arbre
      if (date === undefined) delete source.date_consultation
      else source.date_consultation = date
      expect(problemesDe(d)).toContain('date_consultation')
    }
  })

  it('refuse une source sans nom ni ligne lue', () => {
    const d = copie()
    const source = (d.astres[0].rayonMoyen as Arbre).source as Arbre
    delete source.nom
    delete source.libelle
    const texte = problemesDe(d)
    expect(texte).toContain('rayonMoyen.source.nom')
    expect(texte).toContain('rayonMoyen.source.libelle')
  })

  it('exige que l’unité d’origine de la source soit celle de la valeur', () => {
    const d = copie()
    ;((d.astres[0].masse as Arbre).source as Arbre).unite_origine = 'km'
    expect(problemesDe(d)).toContain('unite_origine')
  })
})

describe('validerAstres : valeurs et unités', () => {
  it('refuse une valeur sans unité ou avec une unité hors champ', () => {
    const d = copie()
    delete (d.astres[0].masse as Arbre).unite
    expect(problemesDe(d)).toContain('astres[0].masse.unite')
    const e = copie()
    ;(e.astres[0].masse as Arbre).unite = 'km'
    expect(problemesDe(e)).toContain('« km » n\'est pas permise ici')
  })

  it('refuse une valeur qui n’est pas un nombre fini', () => {
    for (const valeur of ['9.8', null, Infinity]) {
      const d = copie()
      ;(d.astres[0].graviteSurface as Arbre).valeur = valeur
      expect(problemesDe(JSON.parse(JSON.stringify(d, (_, v) => (v === Infinity ? 'inf' : v))))).toContain(
        'graviteSurface.valeur'
      )
    }
  })

  it('refuse une précision inconnue et un sens de température inconnu', () => {
    const d = copie()
    ;(d.astres[0].masse as Arbre).precision = 'peut-etre'
    ;((d.astres[0].temperatures as Arbre[])[0]).sens = 'ressentie'
    const texte = problemesDe(d)
    expect(texte).toContain('astres[0].masse.precision')
    expect(texte).toContain('temperatures[0].sens')
  })

  it('refuse une plage inversée', () => {
    const d = copie()
    const plage = (d.astres[0].temperatures as Arbre[])[1]
    ;[plage.min, plage.max] = [plage.max, plage.min]
    expect(problemesDe(d)).toContain('min (293) est supérieur à max (283)')
  })

  it('refuse une plage là où une valeur simple est attendue', () => {
    const d = copie()
    d.astres[0].masse = { min: 1, max: 2, unite: '1e24 kg', precision: 'donnee', source: (d.astres[0].masse as Arbre).source }
    expect(problemesDe(d)).toContain('une plage n\'est pas permise ici')
  })
})

describe('validerAstres : données indisponibles', () => {
  it('accepte une donnée indisponible avec une raison', () => {
    const d = copie()
    d.astres[0].nombreLunes = {
      indisponible: true,
      raison: 'Non donnée par la fiche.',
      source: { nom: 'NASA', url: 'https://nssdc.gsfc.nasa.gov/', libelle: 'x', date_consultation: '2026-10-06' },
    }
    expect(() => validerAstres(d)).not.toThrow()
  })

  it('refuse une donnée indisponible sans raison', () => {
    const d = copie()
    delete (d.astres[1].dureeJour as Arbre).raison
    expect(problemesDe(d)).toContain('une donnée indisponible doit dire pourquoi')
  })

  it('refuse une donnée « indisponible » qui porte quand même une valeur (zéro caché)', () => {
    const d = copie()
    ;(d.astres[1].nombreLunes as Arbre).valeur = 0
    expect(problemesDe(d)).toContain('interdit pour une donnée indisponible')
  })

  it('refuse une donnée indisponible sans source', () => {
    const d = copie()
    delete (d.astres[1].distanceSoleil as Arbre).source
    expect(problemesDe(d)).toContain('astres[1].distanceSoleil.source')
  })
})

describe('validerAstres : structure', () => {
  it('refuse des données qui ne sont pas un tableau non vide', () => {
    expect(problemesDe(null)).toContain('tableau non vide')
    expect(problemesDe({ astres: [] })).toContain('tableau non vide')
  })

  it('refuse un identifiant en double ou mal formé et un type inconnu', () => {
    const d = copie()
    d.astres[1].id = 'terre'
    d.astres[2].id = 'Mars!'
    d.astres[0].type = 'etoile'
    const texte = problemesDe(d)
    expect(texte).toContain('« terre » est en double')
    expect(texte).toContain('astres[2].id')
    expect(texte).toContain('astres[0].type')
  })

  it('refuse une atmosphère sans composition ou sans pression', () => {
    const d = copie()
    ;(d.astres[0].atmosphere as Arbre).composition = {}
    ;(d.astres[0].atmosphere as Arbre).pression = []
    const texte = problemesDe(d)
    expect(texte).toContain('atmosphere.pression : tableau non vide')
    expect(texte).toContain('atmosphere.composition.constituants')
  })

  it('liste tous les problèmes, pas seulement le premier', () => {
    const d = copie()
    delete (d.astres[0].masse as Arbre).source
    delete (d.astres[1].masse as Arbre).source
    expect(problemesDe(d).split('\n').filter((l) => l.includes('.masse.source')).length).toBe(2)
  })
})
