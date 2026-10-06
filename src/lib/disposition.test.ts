import { describe, it, expect } from 'vitest'
import { choisirDisposition, PROPORTION_VITRE } from './disposition'

describe('choisirDisposition', () => {
  it('choisit paysage quand la largeur dépasse la hauteur', () => {
    expect(choisirDisposition(844, 390)).toBe('paysage')
    expect(choisirDisposition(1920, 1080)).toBe('paysage')
  })

  it('choisit portrait quand la hauteur dépasse la largeur', () => {
    expect(choisirDisposition(390, 844)).toBe('portrait')
  })

  it('choisit portrait pour un écran carré', () => {
    expect(choisirDisposition(800, 800)).toBe('portrait')
  })

  it('choisit portrait pour des tailles invalides ou nulles', () => {
    expect(choisirDisposition(0, 0)).toBe('portrait')
    expect(choisirDisposition(Number.NaN, 400)).toBe('portrait')
    expect(choisirDisposition(Infinity, 400)).toBe('portrait')
  })
})

describe('PROPORTION_VITRE', () => {
  it('donne environ 60 % en paysage et 45 % en portrait', () => {
    expect(PROPORTION_VITRE.paysage).toBe(0.6)
    expect(PROPORTION_VITRE.portrait).toBe(0.45)
  })
})
