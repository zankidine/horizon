import { describe, it, expect } from 'vitest'
import { comparer } from '../core/comparisons'
import { DISTANCE_TERRE_LUNE_KM } from '../core/constants'
import {
  accorder,
  formaterComparaison,
  formaterComparaisons,
  formaterFormule,
  formaterNombre,
  formaterQuantite,
} from './format-fr'

/** Espace fine insécable (milliers) et espace insécable (nombre + unité). */
const FINE = ' '

/** Remplace toutes les sortes d'espaces par une espace normale avant de comparer. */
const norm = (texte: string) => texte.replace(/[\s\u00a0\u202f]+/g, ' ')

describe('formaterNombre', () => {
  it('sépare les milliers par une espace fine et met une virgule décimale', () => {
    expect(formaterNombre(384_400)).toBe(`384${FINE}400`)
    expect(formaterNombre(1.28)).toBe('1,28')
    expect(formaterNombre(1_000_000_000)).toBe(`1${FINE}000${FINE}000${FINE}000`)
  })

  it('ne laisse pas de bruit de calcul flottant', () => {
    expect(formaterNombre(0.1 + 0.2)).toBe('0,3')
  })
})

describe('accorder (pluriel)', () => {
  it.each([
    [0, 'jour'],
    [1, 'jour'],
    [1.5, 'jour'],
    [2, 'jours'],
    [8.8, 'jours'],
  ])('%s → « %s »', (valeur, attendu) => {
    expect(accorder(valeur, 'jour', 'jours')).toBe(attendu)
  })

  it('accorde sur la valeur affichée : 1,9999999 s’affiche « 2 » donc pluriel', () => {
    expect(accorder(1.9999999, 'jour', 'jours')).toBe('jours')
  })

  it('formaterQuantite : 0 jour, 1 jour, 1,5 an, 2 ans', () => {
    expect(norm(formaterQuantite(0, 'jour'))).toBe('0 jour')
    expect(norm(formaterQuantite(1, 'jour'))).toBe('1 jour')
    expect(norm(formaterQuantite(1.5, 'an'))).toBe('1,5 an')
    expect(norm(formaterQuantite(2, 'an'))).toBe('2 ans')
  })

  it('« mois » est invariable', () => {
    expect(norm(formaterQuantite(1, 'mois'))).toBe('1 mois')
    expect(norm(formaterQuantite(3, 'mois'))).toBe('3 mois')
  })

  it('met les noms composés au pluriel', () => {
    expect(norm(formaterQuantite(30, 'diametre-terre'))).toBe('30 diamètres de la Terre')
    expect(norm(formaterQuantite(1, 'tour-eiffel'))).toBe('1 tour Eiffel')
  })
})

describe('formaterComparaison', () => {
  it('profil enfant : « environ » et pas de formule', () => {
    const [terre, lumiere, marche] = formaterComparaisons(comparer(DISTANCE_TERRE_LUNE_KM, 'enfant'))
    expect(norm(terre.phrase)).toBe('Cela représente environ 30 diamètres de la Terre.')
    expect(norm(lumiere.phrase)).toBe('La lumière met environ 1,3 seconde pour faire ce trajet.')
    expect(norm(marche.phrase)).toBe("À pied, sans s'arrêter, il faut environ 8,8 ans.")
    expect(terre.formule).toBeUndefined()
  })

  it('profil adulte : valeur précise, sans « environ », avec formule', () => {
    const terre = formaterComparaisons(comparer(DISTANCE_TERRE_LUNE_KM, 'adulte'))[0]
    expect(terre.phrase).not.toContain('environ')
    expect(norm(terre.phrase)).toBe('Cela représente 30,17 diamètres de la Terre.')
    expect(norm(terre.formule ?? '')).toBe('384 400 km ÷ 12 742 km ≈ 30,17')
  })

  it('met un nombre de milliers avec l’espace fine', () => {
    const [objet] = comparer(1_000_000_000, 'enfant')
    expect(formaterComparaison(objet).phrase).toContain(`2${FINE}600`)
  })

  it('formule exacte : signe « = »', () => {
    const formule = {
      dividende: { valeur: 10, unite: 'km' as const },
      diviseur: { valeur: 5, unite: 'km/h' as const },
      resultat: { valeur: 2, unite: 'h' as const },
      resultatExact: true,
    }
    expect(norm(formaterFormule(formule))).toBe('10 km ÷ 5 km/h = 2 h')
  })
})
