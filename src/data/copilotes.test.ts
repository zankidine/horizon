import { describe, it, expect } from 'vitest'
import { suggestions } from './copilotes.json'
import { nettoyerNomCopilote } from '../lib/preferences'

describe('copilotes.json', () => {
  it('propose quelques noms', () => {
    expect(suggestions.length).toBeGreaterThanOrEqual(3)
  })

  it('ne contient que des noms valides et uniques', () => {
    for (const nom of suggestions) {
      expect(nettoyerNomCopilote(nom), nom).toBe(nom)
    }
    expect(new Set(suggestions).size).toBe(suggestions.length)
  })
})
