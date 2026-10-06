import { describe, it, expect } from 'vitest'
import { phraseExempleNiveau } from './niveaux-fr'

const norm = (texte: string) => texte.replace(/[\s\u00a0\u202f]+/g, ' ')

describe('phraseExempleNiveau (384 400 km)', () => {
  it('donne une phrase différente à chaque niveau, de plus en plus précise', () => {
    expect(norm(phraseExempleNiveau(1))).toBe('Cela représente environ 30 diamètres de la Terre.')
    expect(norm(phraseExempleNiveau(2))).toBe('Cela représente environ 30,2 diamètres de la Terre.')
    expect(norm(phraseExempleNiveau(3))).toBe('Cela représente 30,17 diamètres de la Terre.')
    expect(norm(phraseExempleNiveau(4))).toBe('Cela représente 30,168 diamètres de la Terre.')
  })
})
