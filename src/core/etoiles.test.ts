import { describe, it, expect } from 'vitest'
import { genererEtoiles, creerAleatoire } from './etoiles'
import { distance3D } from './math'

describe('genererEtoiles', () => {
  it('génère le nombre demandé', () => {
    const ciel = genererEtoiles(1000, 100)
    expect(ciel.positions.length).toBe(3000)
    expect(ciel.couleurs.length).toBe(3000)
    expect(ciel.tailles.length).toBe(1000)
    expect(ciel.phases.length).toBe(1000)
  })

  it('place les étoiles sur la sphère', () => {
    const rayon = 250
    const { positions } = genererEtoiles(200, rayon)
    for (let i = 0; i < 200; i++) {
      const d = distance3D(
        0,
        0,
        0,
        positions[i * 3],
        positions[i * 3 + 1],
        positions[i * 3 + 2]
      )
      expect(d).toBeCloseTo(rayon, 2)
    }
  })

  it('varie les couleurs, du bleuté au rougeâtre', () => {
    const { couleurs } = genererEtoiles(3000, 100)
    let bleutees = 0
    let rougeatres = 0
    for (let i = 0; i < 3000; i++) {
      const r = couleurs[i * 3]
      const b = couleurs[i * 3 + 2]
      if (b > r) bleutees++
      if (r > b * 1.5) rougeatres++
    }
    expect(bleutees).toBeGreaterThan(0)
    expect(rougeatres).toBeGreaterThan(0)
  })

  it('garde les couleurs entre 0 et 1', () => {
    const { couleurs } = genererEtoiles(500, 100)
    for (const c of couleurs) {
      expect(c).toBeGreaterThanOrEqual(0)
      expect(c).toBeLessThanOrEqual(1)
    }
  })

  it('est reproductible avec la même graine', () => {
    const a = genererEtoiles(50, 100, 7)
    const b = genererEtoiles(50, 100, 7)
    expect(Array.from(a.positions)).toEqual(Array.from(b.positions))
  })

  it('accepte zéro étoile', () => {
    expect(genererEtoiles(0, 100).positions.length).toBe(0)
  })
})

describe('creerAleatoire', () => {
  it('reste dans [0, 1[', () => {
    const aleatoire = creerAleatoire(42)
    for (let i = 0; i < 1000; i++) {
      const v = aleatoire()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})
