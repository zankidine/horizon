import { describe, it, expect } from 'vitest'
import { comparer } from './comparisons'
import {
  CATEGORIES_INFO,
  estNiveau,
  NIVEAUX,
  niveauSuivantSuggere,
  paliers,
  profilDepuisNiveau,
  type Niveau,
} from './niveaux'

const IDS = NIVEAUX.map((n) => n.id)

describe('niveaux', () => {
  it('propose quatre niveaux, de 1 à 4, avec nom et description', () => {
    expect(IDS).toEqual([1, 2, 3, 4])
    expect(NIVEAUX.map((n) => n.nom)).toEqual(['Découverte', 'Explorateur', 'Navigateur', 'Expert'])
    for (const n of NIVEAUX) expect(n.description.length).toBeGreaterThan(0)
  })

  it('estNiveau accepte 1 à 4 seulement', () => {
    for (const bon of [1, 2, 3, 4]) expect(estNiveau(bon)).toBe(true)
    for (const mauvais of [0, 5, 1.5, '1', null, undefined, NaN]) expect(estNiveau(mauvais)).toBe(false)
  })

  it('profilDepuisNiveau : 1-2 enfant, 3-4 adulte', () => {
    expect(IDS.map(profilDepuisNiveau)).toEqual(['enfant', 'enfant', 'adulte', 'adulte'])
  })
})

describe('paliers', () => {
  it('les chiffres significatifs augmentent à chaque niveau', () => {
    const chiffres = IDS.map((n) => paliers(n).chiffresSignificatifs)
    expect(chiffres).toEqual([...chiffres].sort((a, b) => a - b))
    expect(new Set(chiffres).size).toBe(IDS.length)
  })

  it('formules à partir du niveau 3, notation scientifique au niveau 4 seulement', () => {
    expect(IDS.map((n) => paliers(n).formules)).toEqual([false, false, true, true])
    expect(IDS.map((n) => paliers(n).notationScientifique)).toEqual([false, false, false, true])
  })

  it('les catégories d’un niveau sont incluses dans celles du niveau supérieur', () => {
    for (const n of IDS.slice(0, -1)) {
      const dessous = paliers(n).categories
      const dessus = paliers((n + 1) as Niveau).categories
      for (const c of dessous) expect(dessus).toContain(c)
      expect(dessus.length).toBeGreaterThan(dessous.length)
    }
  })

  it('le niveau 4 voit toutes les catégories, sans doublon, toutes connues', () => {
    expect(paliers(4).categories).toEqual([...CATEGORIES_INFO])
    for (const n of IDS) expect(new Set(paliers(n).categories).size).toBe(paliers(n).categories.length)
  })

  it('le niveau 1 ne voit que le concret', () => {
    expect(paliers(1).categories).toEqual(['distance', 'vitesse', 'temps'])
  })
})

describe('compatibilité avec comparer()', () => {
  it('comparer reste utilisable avec le profil dérivé du niveau', () => {
    expect(comparer(384_400, profilDepuisNiveau(1))[0].approximatif).toBe(true)
    expect(comparer(384_400, profilDepuisNiveau(3))[0].formule).toBeDefined()
  })
})

describe('niveauSuivantSuggere', () => {
  it('ne suggère rien pour l’instant', () => {
    for (const niveau of IDS) expect(niveauSuivantSuggere({ niveau })).toBeNull()
  })
})
