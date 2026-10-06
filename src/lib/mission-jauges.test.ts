import { describe, expect, it } from 'vitest'
import { jaugeFenetre, jaugeVitesse, pourcent } from './mission-jauges'

describe('jaugeFenetre', () => {
  it("se charge pendant l'attente", () => {
    expect(jaugeFenetre('attente', 3, 3, 6)).toEqual({ phase: 'attente', fraction: 0 })
    expect(jaugeFenetre('attente', 1.5, 3, 6).fraction).toBeCloseTo(0.5)
    expect(jaugeFenetre('attente', 0, 3, 6).fraction).toBe(1)
  })

  it('se vide pendant la fenêtre ouverte', () => {
    expect(jaugeFenetre('ouverte', 6, 3, 6)).toEqual({ phase: 'ouverte', fraction: 1 })
    expect(jaugeFenetre('ouverte', 3, 3, 6).fraction).toBeCloseTo(0.5)
    expect(jaugeFenetre('ouverte', 0, 3, 6).fraction).toBe(0)
  })

  it('reste dans 0 à 1 même avec des valeurs hors normes', () => {
    expect(jaugeFenetre('ouverte', 99, 3, 6).fraction).toBe(1)
    expect(jaugeFenetre('attente', -5, 3, 6).fraction).toBe(1)
    expect(jaugeFenetre('ouverte', 1, 3, 0).fraction).toBe(0)
    expect(jaugeFenetre('attente', NaN, 3, 6).fraction).toBe(0)
  })
})

describe('jaugeVitesse', () => {
  it('place la zone et la vitesse sur une même échelle', () => {
    const j = jaugeVitesse(1, { min: 0.5, max: 2 })
    expect(j.zoneDebut).toBeLessThan(j.zoneFin)
    expect(j.vitesse).toBeGreaterThan(j.zoneDebut)
    expect(j.vitesse).toBeLessThan(j.zoneFin)
  })

  it("élargit l'échelle quand la vitesse dépasse la zone, sans sortir de la jauge", () => {
    const j = jaugeVitesse(50, { min: 0.5, max: 2 })
    expect(j.vitesse).toBeLessThanOrEqual(1)
    expect(j.zoneFin).toBeLessThan(0.2)
    expect(jaugeVitesse(-3, { min: 0.5, max: 2 }).vitesse).toBe(0)
  })
})

describe('pourcent', () => {
  it('arrondit et borne', () => {
    expect(pourcent(0.254)).toBe(25)
    expect(pourcent(1.4)).toBe(100)
    expect(pourcent(-1)).toBe(0)
  })
})
