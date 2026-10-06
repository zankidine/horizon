import { describe, it, expect } from 'vitest'
import {
  ANGLE_MAX_DEG,
  ANGLE_NEUTRE_DEG,
  DECALAGE_MAX_PX,
  decalageCouche,
  normaliserOrientation,
  normaliserPointeur,
} from './parallaxe'

describe('normaliserPointeur', () => {
  it('vaut 0 au centre et ±1 aux bords', () => {
    expect(normaliserPointeur(200, 100, 400, 200)).toEqual({ x: 0, y: 0 })
    expect(normaliserPointeur(0, 0, 400, 200)).toEqual({ x: -1, y: -1 })
    expect(normaliserPointeur(400, 200, 400, 200)).toEqual({ x: 1, y: 1 })
  })

  it('reste dans [-1, 1] hors de la zone', () => {
    expect(normaliserPointeur(900, -50, 400, 200)).toEqual({ x: 1, y: -1 })
  })

  it('renvoie 0 pour une zone vide', () => {
    expect(normaliserPointeur(10, 10, 0, 0)).toEqual({ x: 0, y: 0 })
  })
})

describe('normaliserOrientation', () => {
  it("vaut 0 à l'angle neutre", () => {
    expect(normaliserOrientation(0, ANGLE_NEUTRE_DEG)).toEqual({ x: 0, y: 0 })
  })

  it("atteint 1 à l'angle maximal et ne le dépasse pas", () => {
    expect(normaliserOrientation(ANGLE_MAX_DEG, ANGLE_NEUTRE_DEG)).toEqual({
      x: 1,
      y: 0,
    })
    expect(normaliserOrientation(90, ANGLE_NEUTRE_DEG + 90)).toEqual({
      x: 1,
      y: 1,
    })
    expect(normaliserOrientation(-90, ANGLE_NEUTRE_DEG - 90)).toEqual({
      x: -1,
      y: -1,
    })
  })

  it('accepte des valeurs manquantes', () => {
    expect(normaliserOrientation(null, null)).toEqual({ x: 0, y: 0 })
    expect(normaliserOrientation(undefined, undefined)).toEqual({ x: 0, y: 0 })
  })
})

describe('decalageCouche', () => {
  it('ne déplace pas le fond (profondeur 0) ni un regard centré', () => {
    expect(decalageCouche({ x: 1, y: 1 }, 0)).toEqual({ x: 0, y: 0 })
    expect(decalageCouche({ x: 0, y: 0 }, 1)).toEqual({ x: 0, y: 0 })
  })

  it("déplace le premier plan de quelques pixels au plus, à l'opposé du regard", () => {
    expect(decalageCouche({ x: 1, y: -1 }, 1)).toEqual({
      x: -DECALAGE_MAX_PX,
      y: DECALAGE_MAX_PX,
    })
    expect(DECALAGE_MAX_PX).toBeLessThanOrEqual(10)
  })

  it('bouge plus fort les couches proches que les couches lointaines', () => {
    const loin = decalageCouche({ x: 1, y: 0 }, 0.2)
    const pres = decalageCouche({ x: 1, y: 0 }, 0.9)
    expect(Math.abs(pres.x)).toBeGreaterThan(Math.abs(loin.x))
  })

  it('ne décale rien en mouvement réduit', () => {
    expect(decalageCouche({ x: 1, y: 1 }, 1, true)).toEqual({ x: 0, y: 0 })
  })

  it('ignore les valeurs invalides ou hors limites', () => {
    expect(decalageCouche({ x: Number.NaN, y: 5 }, 1)).toEqual({
      x: 0,
      y: -DECALAGE_MAX_PX,
    })
    expect(decalageCouche({ x: 1, y: 0 }, 5)).toEqual({
      x: -DECALAGE_MAX_PX,
      y: 0,
    })
  })

  it('ne renvoie jamais -0', () => {
    const d = decalageCouche({ x: 0, y: 0 }, 1)
    expect(Object.is(d.x, 0)).toBe(true)
    expect(Object.is(d.y, 0)).toBe(true)
  })
})
