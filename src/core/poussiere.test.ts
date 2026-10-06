import { describe, it, expect } from 'vitest'
import { genererPoussiere } from './poussiere'

describe('genererPoussiere', () => {
  it('produit le nombre de grains demandé', () => {
    const p = genererPoussiere(250)
    expect(p.positions.length).toBe(250 * 3)
    expect(p.tailles.length).toBe(250)
    expect(p.phases.length).toBe(250)
  })

  it('garde les positions dans [0, 1[ et les tailles entre 0,5 et 1,5', () => {
    const p = genererPoussiere(400)
    expect(Math.min(...p.positions)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...p.positions)).toBeLessThan(1)
    expect(Math.min(...p.tailles)).toBeGreaterThanOrEqual(0.5)
    expect(Math.max(...p.tailles)).toBeLessThanOrEqual(1.5)
  })

  it('est déterministe, et change avec la graine', () => {
    expect(genererPoussiere(50, 3).positions).toEqual(genererPoussiere(50, 3).positions)
    expect(genererPoussiere(50, 3).positions).not.toEqual(genererPoussiere(50, 4).positions)
  })

  it('accepte zéro grain ou un nombre invalide', () => {
    expect(genererPoussiere(0).positions.length).toBe(0)
    expect(genererPoussiere(-5).positions.length).toBe(0)
    expect(genererPoussiere(NaN).positions.length).toBe(0)
  })
})
