import { describe, expect, it } from 'vitest'
import donnees from '../data/mission-ui.json'
import { CLES_TEXTES_MISSION, texteMission, validerTextesMission } from './textes-mission'

describe('textes du panneau de mission', () => {
  it('sont valides : chaque clé existe en version enfant et adulte', () => {
    const textes = validerTextesMission(donnees)
    for (const cle of CLES_TEXTES_MISSION) {
      expect(textes[cle].enfant.length).toBeGreaterThan(0)
      expect(textes[cle].adulte.length).toBeGreaterThan(0)
    }
  })

  it('refusent une clé absente, un texte vide, un marqueur perdu et une clé inconnue', () => {
    const copie = structuredClone(donnees) as Record<string, unknown>
    delete copie.suivant
    expect(() => validerTextesMission(copie)).toThrow(/suivant/)
    const vide = structuredClone(donnees) as Record<string, { enfant: string; adulte: string }>
    vide.lire.adulte = ' '
    expect(() => validerTextesMission(vide)).toThrow(/lire/)
    const marqueur = structuredClone(donnees) as Record<string, { enfant: string; adulte: string }>
    marqueur.scene.adulte = 'Scène'
    expect(() => validerTextesMission(marqueur)).toThrow(/numero/)
    expect(() => validerTextesMission({ ...donnees, inconnue: { enfant: 'a', adulte: 'b' } })).toThrow(/inconnue/)
    expect(() => validerTextesMission(null)).toThrow()
  })

  it('remplit les marqueurs', () => {
    const textes = validerTextesMission(donnees)
    expect(texteMission(textes, 'scene', 'enfant', { numero: '3', total: '11' })).toBe('Scène 3 sur 11')
  })
})
