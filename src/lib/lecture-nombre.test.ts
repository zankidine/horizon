import { describe, expect, it } from 'vitest'
import { lireNombreFr } from './lecture-nombre'

describe('lireNombreFr', () => {
  it.each([
    ['384400', 384400],
    ['384 400', 384400],
    ['384 400', 384400],
    ['384 400', 384400],
    ['384,4', 384.4],
    ['384.4', 384.4],
    ['384 400 km', 384400],
    ['384 400 km', 384400],
    ['384 400km', 384400],
    ['384 400 kilomètres', 384400],
    ['  42  ', 42],
    ['39 %', 39],
    ['39%', 39],
    ['0,5', 0.5],
    [',5', 0.5],
    ['1 234 567,89 km/h', 1234567.89],
    ['-5', -5],
    ['3 m²', 3],
    ['6', 6],
  ])('lit « %s » comme %d', (texte, attendu) => {
    expect(lireNombreFr(texte)).toBe(attendu)
  })

  it('lit un point seul comme une marque décimale, jamais comme des milliers', () => {
    expect(lireNombreFr('384.400')).toBe(384.4)
  })

  it.each([
    [''],
    ['   '],
    ['abc'],
    ['km'],
    ['12abc34'],
    ['12 km 34'],
    ['1,2,3'],
    ['5,'],
    ['1e5'],
    ['Infinity'],
    ['NaN'],
    ['--5'],
    ['12 €'],
    [','],
    ['-'],
  ])('refuse « %s »', (texte) => {
    expect(lireNombreFr(texte)).toBeNull()
  })
})
