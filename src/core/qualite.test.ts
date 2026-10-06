import { describe, it, expect } from 'vitest'
import {
  choisirQualite,
  cheminTexture,
  ratioPixelsPlafonne,
  NIVEAUX_QUALITE,
  PARAMETRES_QUALITE,
} from './qualite'

describe('choisirQualite', () => {
  it('choisit « bas » pour un appareil modeste', () => {
    expect(choisirQualite({ coeurs: 2, memoireGo: 4 })).toBe('bas')
    expect(choisirQualite({ coeurs: 8, memoireGo: 2 })).toBe('bas')
  })

  it('choisit « moyen » pour un téléphone moyen de gamme', () => {
    expect(
      choisirQualite({
        coeurs: 8,
        memoireGo: 4,
        ratioPixels: 2.75,
        petitCoteEcran: 393,
      })
    ).toBe('moyen')
  })

  it('choisit « haut » pour un appareil puissant', () => {
    expect(
      choisirQualite({
        coeurs: 12,
        memoireGo: 16,
        ratioPixels: 2,
        petitCoteEcran: 1080,
      })
    ).toBe('haut')
  })

  it('évite « haut » sur un petit écran très dense', () => {
    expect(
      choisirQualite({
        coeurs: 8,
        memoireGo: 8,
        ratioPixels: 3,
        petitCoteEcran: 412,
      })
    ).toBe('moyen')
  })

  it('accepte une mémoire inconnue (Safari, iOS) avec une valeur par défaut', () => {
    expect(
      choisirQualite({
        coeurs: 6,
        memoireGo: undefined,
        ratioPixels: 3,
        petitCoteEcran: 390,
      })
    ).toBe('moyen')
    // Une mémoire inconnue ne suffit pas à atteindre « haut ».
    expect(choisirQualite({ coeurs: 16, memoireGo: undefined })).toBe('moyen')
  })

  it('accepte des capacités entièrement inconnues ou invalides', () => {
    expect(choisirQualite()).toBe('moyen')
    expect(choisirQualite({})).toBe('moyen')
    expect(choisirQualite({ coeurs: Number.NaN, memoireGo: 0 })).toBe('moyen')
  })
})

describe('PARAMETRES_QUALITE', () => {
  it('augmente avec le niveau', () => {
    const [bas, moyen, haut] = NIVEAUX_QUALITE.map((n) => PARAMETRES_QUALITE[n])
    expect(bas.nombreEtoiles).toBeLessThan(moyen.nombreEtoiles)
    expect(moyen.nombreEtoiles).toBeLessThan(haut.nombreEtoiles)
    expect(bas.nombrePoussieres).toBeLessThan(moyen.nombrePoussieres)
    expect(moyen.nombrePoussieres).toBeLessThan(haut.nombrePoussieres)
    expect(bas.ratioPixelsMax).toBeLessThan(moyen.ratioPixelsMax)
    expect(moyen.ratioPixelsMax).toBeLessThan(haut.ratioPixelsMax)
    expect(bas.segmentsSphere).toBeLessThan(haut.segmentsSphere)
  })
})

describe('ratioPixelsPlafonne', () => {
  it('plafonne le ratio selon le niveau', () => {
    expect(ratioPixelsPlafonne(3, 'bas')).toBe(
      PARAMETRES_QUALITE.bas.ratioPixelsMax
    )
    expect(ratioPixelsPlafonne(3, 'haut')).toBe(
      PARAMETRES_QUALITE.haut.ratioPixelsMax
    )
  })

  it("garde le ratio de l'appareil s'il est sous le plafond", () => {
    expect(ratioPixelsPlafonne(1, 'haut')).toBe(1)
  })

  it('utilise 1 si le ratio est inconnu', () => {
    expect(ratioPixelsPlafonne(undefined, 'moyen')).toBe(1)
  })
})

describe('cheminTexture', () => {
  it('donne le fichier redimensionné du niveau', () => {
    expect(cheminTexture('earth-day', 'bas')).toBe('textures/earth-day-1k.jpg')
    expect(cheminTexture('moon', 'moyen')).toBe('textures/moon-2k.jpg')
    expect(cheminTexture('moon', 'haut')).toBe('textures/moon-4k.jpg')
  })
})
