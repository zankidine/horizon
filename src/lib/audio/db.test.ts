import { describe, it, expect } from 'vitest'
import { ATTAQUE_MIN_S, borner, dbEnGain, dureeEnveloppe, gainEnDb, pointsEnveloppe, RELACHEMENT_MIN_S, volumeEnGain } from './db'

describe('décibels et gain', () => {
  it('0 dB vaut un gain de 1, −20 dB vaut 0,1, −6 dB vaut environ 0,5012', () => {
    expect(dbEnGain(0)).toBe(1)
    expect(dbEnGain(-20)).toBeCloseTo(0.1, 12)
    expect(dbEnGain(20)).toBeCloseTo(10, 12)
    // 10^(−6/20) = 10^(−0,3) = 0,501187…
    expect(dbEnGain(-6)).toBeCloseTo(0.501187, 6)
    // +6 dB : 10^0,3 = 1,995262…
    expect(dbEnGain(6)).toBeCloseTo(1.995262, 6)
  })

  it('−Infinity est le silence, et le silence est −Infinity', () => {
    expect(dbEnGain(-Infinity)).toBe(0)
    expect(gainEnDb(0)).toBe(-Infinity)
    expect(gainEnDb(-1)).toBe(-Infinity)
  })

  it('gain vers dB : l’inverse de dB vers gain', () => {
    for (const db of [-60, -24, -6, -3, 0, 3, 12]) expect(gainEnDb(dbEnGain(db))).toBeCloseTo(db, 10)
    expect(gainEnDb(0.5)).toBeCloseTo(-6.0206, 4)
    expect(gainEnDb(2)).toBeCloseTo(6.0206, 4)
  })
})

describe('curseur de volume', () => {
  it('0 donne le silence, 1 donne 1, la courbe est quadratique', () => {
    expect(volumeEnGain(0)).toBe(0)
    expect(volumeEnGain(1)).toBe(1)
    expect(volumeEnGain(0.5)).toBe(0.25)
    expect(volumeEnGain(0.3)).toBeCloseTo(0.09, 12)
  })

  it('reste entre 0 et 1, et un nombre invalide donne le silence', () => {
    expect(volumeEnGain(-3)).toBe(0)
    expect(volumeEnGain(7)).toBe(1)
    expect(volumeEnGain(Number.NaN)).toBe(0)
    expect(volumeEnGain(Infinity)).toBe(0)
  })

  it('borner', () => {
    expect(borner(5, 0, 1)).toBe(1)
    expect(borner(-5, 0, 1)).toBe(0)
    expect(borner(0.4, 0, 1)).toBe(0.4)
  })
})

describe('enveloppe', () => {
  const env = { attaque: 0.05, decroissance: 0.1, soutien: 0.5, relachement: 0.2 }

  it('points : silence, pic, soutien, soutien tenu, silence', () => {
    const attendus = [
      [0, 0],
      [0.05, 0.8],
      [0.15, 0.4],
      [0.45, 0.4],
      [0.65, 0],
    ]
    const points = pointsEnveloppe(env, 0.8, 0.3)
    expect(points).toHaveLength(attendus.length)
    points.forEach((p, i) => {
      expect(p.t).toBeCloseTo(attendus[i][0], 12)
      expect(p.v).toBeCloseTo(attendus[i][1], 12)
    })
  })

  it('commence et finit toujours au silence, avec des temps croissants', () => {
    const points = pointsEnveloppe(env, 1, 0.5)
    expect(points[0].v).toBe(0)
    expect(points[points.length - 1].v).toBe(0)
    for (let i = 1; i < points.length; i++) expect(points[i].t).toBeGreaterThanOrEqual(points[i - 1].t)
    expect(dureeEnveloppe(points)).toBeCloseTo(0.05 + 0.1 + 0.5 + 0.2, 12)
  })

  it('une attaque ou un relâchement trop courts sont relevés au minimum (pas de claquement)', () => {
    const points = pointsEnveloppe({ attaque: 0, decroissance: 0, soutien: 1, relachement: 0 }, 1, 0)
    expect(points[1].t).toBe(ATTAQUE_MIN_S)
    expect(points[4].t - points[3].t).toBeCloseTo(RELACHEMENT_MIN_S, 12)
  })

  it('le soutien est borné entre 0 et 1', () => {
    expect(pointsEnveloppe({ ...env, soutien: 3 }, 0.5, 0)[2].v).toBe(0.5)
    expect(pointsEnveloppe({ ...env, soutien: -1 }, 0.5, 0)[2].v).toBe(0)
  })
})
