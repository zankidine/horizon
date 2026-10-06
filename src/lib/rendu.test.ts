import { describe, it, expect } from 'vitest'
import { BUDGET_PIXELS, RATIO_PIXELS_MIN, ratioPixelsPourZone } from './rendu'
import { PARAMETRES_QUALITE } from '../core/qualite'

describe('ratioPixelsPourZone', () => {
  it('garde le plafond du niveau pour une petite zone (téléphone)', () => {
    expect(ratioPixelsPourZone(390, 380, 'moyen', 3)).toBe(
      PARAMETRES_QUALITE.moyen.ratioPixelsMax
    )
  })

  it("garde le ratio de l'appareil s'il est sous le plafond", () => {
    expect(ratioPixelsPourZone(390, 380, 'haut', 1)).toBe(1)
  })

  it('abaisse le ratio pour une très grande zone (bureau)', () => {
    const ratio = ratioPixelsPourZone(1920, 650, 'haut', 2)
    expect(ratio).toBeLessThan(PARAMETRES_QUALITE.haut.ratioPixelsMax)
    expect(ratio * ratio * 1920 * 650).toBeLessThanOrEqual(
      BUDGET_PIXELS.haut + 1
    )
  })

  it('ne dépasse jamais le budget de pixels, sauf au ratio minimal', () => {
    for (const niveau of ['bas', 'moyen', 'haut'] as const) {
      const ratio = ratioPixelsPourZone(1500, 900, niveau, 3)
      expect(ratio).toBeGreaterThanOrEqual(RATIO_PIXELS_MIN)
      if (ratio > RATIO_PIXELS_MIN) {
        expect(ratio * ratio * 1500 * 900).toBeLessThanOrEqual(
          BUDGET_PIXELS[niveau] + 1
        )
      }
    }
  })

  it('ne descend pas sous le ratio minimal', () => {
    expect(ratioPixelsPourZone(8000, 4000, 'bas', 2)).toBe(RATIO_PIXELS_MIN)
  })

  it('un niveau plus bas donne un ratio plus bas ou égal sur la même zone', () => {
    const bas = ratioPixelsPourZone(1600, 700, 'bas', 3)
    const haut = ratioPixelsPourZone(1600, 700, 'haut', 3)
    expect(bas).toBeLessThanOrEqual(haut)
  })

  it('utilise le plafond tant que la taille est inconnue (zone vide)', () => {
    expect(ratioPixelsPourZone(0, 0, 'bas', 3)).toBe(
      PARAMETRES_QUALITE.bas.ratioPixelsMax
    )
    expect(ratioPixelsPourZone(Number.NaN, 100, 'bas', undefined)).toBe(1)
  })
})
