import { describe, it, expect } from 'vitest'
import { ROULIS_AMPLITUDE_MAX_DEG, VITESSE_DEMO_KM_S, VITESSE_VISUELLE_MIN_KM_S } from './constants'
import {
  ETIREMENT_ETOILES_MAX,
  HALO_ANGLE_NUL,
  HALO_ANGLE_PLEIN,
  INTENSITE_POUSSIERE_MOUVEMENT_REDUIT,
  VITESSE_POUSSIERE_MAX,
  effetsMouvement,
  intensiteHaloSoleil,
} from './effets'
import { vitesseVisuelle } from './vaisseau'

describe('effetsMouvement : mouvement normal', () => {
  it('l’intensité de la poussière et l’étirement suivent vitesseVisuelle', () => {
    const e = effetsMouvement(VITESSE_DEMO_KM_S, false, false)
    const vv = vitesseVisuelle(VITESSE_DEMO_KM_S)
    expect(e.intensitePoussiere).toBeCloseTo(vv, 12)
    expect(e.vitessePoussiere).toBeCloseTo(vv * VITESSE_POUSSIERE_MAX, 12)
    expect(e.etirementEtoiles).toBeCloseTo(vv * ETIREMENT_ETOILES_MAX, 12)
    expect(e.etirementPoussiere).toBeGreaterThan(0)
  })

  it('à l’arrêt, rien ne défile ni ne s’étire', () => {
    const e = effetsMouvement(0, false, false)
    expect(e.intensitePoussiere).toBe(0)
    expect(e.vitessePoussiere).toBe(0)
    expect(e.etirementEtoiles).toBe(0)
    expect(effetsMouvement(VITESSE_VISUELLE_MIN_KM_S, false, false).etirementEtoiles).toBe(0)
  })

  it('l’étirement est « léger » : les étoiles ne dépassent pas 3 fois leur taille', () => {
    expect(1 + effetsMouvement(1e6, false, false).etirementEtoiles).toBeLessThanOrEqual(3)
  })

  it('la vibration suit la poussée, le roulis reste sous 1°', () => {
    expect(effetsMouvement(10, true, false).vibration).toBe(1)
    expect(effetsMouvement(10, false, false).vibration).toBe(0)
    const roulis = effetsMouvement(10, false, false).roulisMaxRad
    expect(roulis).toBeCloseTo((ROULIS_AMPLITUDE_MAX_DEG * Math.PI) / 180, 12)
    expect(roulis).toBeLessThan(Math.PI / 180)
  })
})

describe('effetsMouvement : mouvement réduit', () => {
  const reduit = effetsMouvement(VITESSE_DEMO_KM_S, true, true)
  const normal = effetsMouvement(VITESSE_DEMO_KM_S, true, false)

  it('coupe la vibration, l’étirement des étoiles et de la poussière, et le roulis', () => {
    expect(reduit.vibration).toBe(0)
    expect(reduit.etirementEtoiles).toBe(0)
    expect(reduit.etirementPoussiere).toBe(0)
    expect(reduit.roulisMaxRad).toBe(0)
  })

  it('garde la poussière, avec une intensité réduite', () => {
    expect(reduit.intensitePoussiere).toBeGreaterThan(0)
    expect(reduit.intensitePoussiere).toBeLessThan(normal.intensitePoussiere)
    expect(reduit.intensitePoussiere).toBeCloseTo(
      normal.intensitePoussiere * INTENSITE_POUSSIERE_MOUVEMENT_REDUIT,
      12
    )
    expect(reduit.vitessePoussiere).toBe(normal.vitessePoussiere)
  })
})

describe('intensiteHaloSoleil', () => {
  const regard = [0, 0, -1] as const
  const versAngle = (angle: number) => [Math.sin(angle), 0, -Math.cos(angle)] as const

  it('est pleine quand le Soleil est dans le champ de vision', () => {
    expect(intensiteHaloSoleil(regard, regard)).toBe(1)
    expect(intensiteHaloSoleil(regard, versAngle(HALO_ANGLE_PLEIN / 2))).toBe(1)
  })

  it('est nulle quand le Soleil est loin hors du champ, ou derrière', () => {
    expect(intensiteHaloSoleil(regard, versAngle(HALO_ANGLE_NUL * 1.1))).toBe(0)
    expect(intensiteHaloSoleil(regard, [0, 0, 1])).toBe(0)
  })

  it('décroît progressivement entre les deux, sans saut', () => {
    const milieu = intensiteHaloSoleil(regard, versAngle((HALO_ANGLE_PLEIN + HALO_ANGLE_NUL) / 2))
    expect(milieu).toBeGreaterThan(0)
    expect(milieu).toBeLessThan(1)
    expect(milieu).toBeCloseTo(0.5, 6)
  })

  it('ne dépend pas de la longueur des vecteurs, et refuse un vecteur nul', () => {
    expect(intensiteHaloSoleil([0, 0, -5], [0, 0, -0.1])).toBe(1)
    expect(intensiteHaloSoleil([0, 0, 0], regard)).toBe(0)
  })
})
