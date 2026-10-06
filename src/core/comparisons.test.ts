import { describe, it, expect } from 'vitest'
import { DISTANCE_TERRE_LUNE_KM, DIAMETRE_TERRE_KM } from './constants'
import { CHIFFRES_SIGNIFICATIFS, comparer, MAX_COMPARAISONS } from './comparisons'

const UN_MILLIARD_KM = 1_000_000_000

describe('comparer : Terre-Lune', () => {
  it('profil enfant : valeurs arrondies, avec « environ »', () => {
    const resultat = comparer(DISTANCE_TERRE_LUNE_KM, 'enfant')
    expect(resultat.map((c) => c.type)).toEqual(['diametre-terre', 'temps-lumiere', 'trajet-marche'])
    expect(resultat.every((c) => c.approximatif && c.formule === undefined)).toBe(true)

    const [terre, lumiere, marche] = resultat
    expect(terre.valeur).toBe(30)
    expect(lumiere).toMatchObject({ valeur: 1.3, unite: 'seconde' })
    expect(marche).toMatchObject({ valeur: 8.8, unite: 'an' })
  })

  it('profil adulte : valeurs précises et formule', () => {
    const resultat = comparer(DISTANCE_TERRE_LUNE_KM, 'adulte')
    const terre = resultat.find((c) => c.type === 'diametre-terre')
    expect(terre?.valeur).toBeCloseTo(DISTANCE_TERRE_LUNE_KM / DIAMETRE_TERRE_KM, 1)
    expect(terre?.approximatif).toBe(false)
    expect(terre?.formule?.dividende).toEqual({ valeur: DISTANCE_TERRE_LUNE_KM, unite: 'km' })
    expect(terre?.formule?.diviseur).toEqual({ valeur: DIAMETRE_TERRE_KM, unite: 'km' })
    expect(resultat.every((c) => c.formule !== undefined)).toBe(true)
  })
})

describe('comparer : bornes', () => {
  it('ne renvoie jamais de valeur inférieure à 1 ni plus de 3 comparaisons', () => {
    for (const distance of [0.01, 0.5, 1, 10, 1000, DISTANCE_TERRE_LUNE_KM, UN_MILLIARD_KM]) {
      for (const profil of ['enfant', 'adulte'] as const) {
        const resultat = comparer(distance, profil)
        expect(resultat.length).toBeLessThanOrEqual(MAX_COMPARAISONS)
        expect(resultat.every((c) => c.valeur >= 1)).toBe(true)
      }
    }
  })

  it('très petite distance (1 km) : tour Eiffel, marche et voiture, pas de lumière', () => {
    const resultat = comparer(1, 'enfant')
    expect(resultat.map((c) => c.type)).toEqual(['tour-eiffel', 'trajet-marche', 'trajet-voiture'])
    expect(resultat[0].valeur).toBe(3)
    expect(resultat[1]).toMatchObject({ valeur: 12, unite: 'minute' })
    expect(resultat[2]).toMatchObject({ valeur: 36, unite: 'seconde' })
    expect(resultat.every((c) => c.approximatif)).toBe(true)
  })

  it('très grande distance (1 milliard de km)', () => {
    const resultat = comparer(UN_MILLIARD_KM, 'enfant')
    expect(resultat.map((c) => c.type)).toEqual([
      'distance-terre-lune',
      'temps-lumiere',
      'trajet-marche',
    ])
    expect(resultat[0].valeur).toBe(2600)
    expect(resultat[1]).toMatchObject({ valeur: 56, unite: 'minute' })
    expect(resultat[2]).toMatchObject({ valeur: 23_000, unite: 'an' })
  })

  it('une distance nulle ne donne aucune comparaison', () => {
    expect(comparer(0, 'enfant')).toEqual([])
  })

  it('refuse une distance négative ou non finie', () => {
    expect(() => comparer(-1, 'enfant')).toThrow(RangeError)
    expect(() => comparer(Infinity, 'adulte')).toThrow(RangeError)
    expect(() => comparer(NaN, 'adulte')).toThrow(RangeError)
  })
})

describe('comparer : arrondi', () => {
  it('passe à l’unité suivante quand l’arrondi l’atteint (59,6 s → 1 minute)', () => {
    const distanceKm = 59.6 * (DISTANCE_TERRE_LUNE_KM / 1.2822)
    const lumiere = comparer(distanceKm, 'enfant').find((c) => c.type === 'temps-lumiere')
    expect(lumiere).toMatchObject({ valeur: 1, unite: 'minute' })
  })
})

describe('comparer avec un nombre de chiffres demandé', () => {
  it('garde la valeur par défaut du profil sans le troisième argument', () => {
    expect(comparer(DISTANCE_TERRE_LUNE_KM, 'adulte')).toEqual(
      comparer(DISTANCE_TERRE_LUNE_KM, 'adulte', CHIFFRES_SIGNIFICATIFS.adulte)
    )
  })

  it('arrondit valeur et formule au nombre de chiffres demandé', () => {
    const [terre] = comparer(DISTANCE_TERRE_LUNE_KM, 'adulte', 5)
    expect(terre.valeur).toBe(30.168)
    expect(terre.formule?.resultat.valeur).toBe(30.168)
  })
})
