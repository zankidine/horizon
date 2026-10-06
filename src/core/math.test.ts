import { describe, it, expect } from 'vitest'
import { distance3D } from './math'

describe('distance3D', () => {
  it('calcule la distance entre deux points identiques', () => {
    expect(distance3D(0, 0, 0, 0, 0, 0)).toBe(0)
  })

  it("calcule la distance sur l'axe X", () => {
    expect(distance3D(0, 0, 0, 3, 0, 0)).toBe(3)
  })

  it("calcule la distance sur l'axe Y", () => {
    expect(distance3D(0, 0, 0, 0, 4, 0)).toBe(4)
  })

  it("calcule la distance sur l'axe Z", () => {
    expect(distance3D(0, 0, 0, 0, 0, 5)).toBe(5)
  })

  it("calcule la distance dans l'espace 3D", () => {
    // Triangle 3-4-5 dans l'espace : distance = sqrt(9 + 16 + 0) = 5
    expect(distance3D(0, 0, 0, 3, 4, 0)).toBe(5)
  })
})
