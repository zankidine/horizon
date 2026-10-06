import { describe, it, expect } from 'vitest'
import {
  caracteresAbsents,
  CARACTERES_REQUIS,
  dansPlages,
  horsPlages,
} from './polices'

describe('plages de caractères des polices', () => {
  it('couvrent tous les caractères demandés', () => {
    expect(horsPlages(CARACTERES_REQUIS)).toEqual([])
    for (const c of 'éèêàçœ«»…°×÷≈') {
      expect(dansPlages(c.codePointAt(0)!), c).toBe(true)
    }
  })

  it('ne gardent pas les caractères hors du latin', () => {
    expect(horsPlages('aあ→')).toEqual(['あ', '→'])
  })
})

describe('caracteresAbsents', () => {
  it('repère les caractères dont la largeur dépend du repli', () => {
    const largeur = (famille: 'repli-a' | 'repli-b', c: string): number =>
      c === '→' ? (famille === 'repli-a' ? 10 : 14) : 8
    expect(caracteresAbsents('é→a', largeur)).toEqual(['→'])
  })

  it('ne signale rien si la police a tous les caractères', () => {
    expect(caracteresAbsents('éa', () => 8)).toEqual([])
  })
})
