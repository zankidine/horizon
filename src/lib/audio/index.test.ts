import { afterEach, describe, expect, it } from 'vitest'
import {
  _reinitialiserPourTests,
  arreter,
  connecterMission,
  definirVolume,
  definirVoixEnLigne,
  initialiser,
  jouer,
  muet,
  parler,
  piloterPoussee,
  reglages,
} from './index'
import type { EvenementMission } from '../../core/mission-moteur'

afterEach(() => _reinitialiserPourTests())

describe('façade : sans navigateur (Node), tout reste silencieux et ne casse rien', () => {
  it('initialiser, jouer, parler, arreter, definirVolume et muet ne lèvent aucune erreur', () => {
    expect(() => {
      initialiser()
      jouer('bip-validation')
      jouer('id-inconnu')
      parler('Bonjour')
      piloterPoussee(30, true)
      arreter()
      definirVolume('effets', 0.3)
      muet(true)
      muet(false)
    }).not.toThrow()
  })

  it('les réglages se modifient par la façade', () => {
    definirVolume('ambiance', 0.2)
    muet(true)
    definirVoixEnLigne(true)
    expect(reglages()).toEqual({ volumes: { ambiance: 0.2, effets: 0.6, voix: 0.7 }, muet: true, voixEnLigne: true })
  })

  it('un canal inconnu est ignoré', () => {
    definirVolume('inconnu' as never, 0.9)
    expect(reglages().volumes).toEqual({ ambiance: 0.5, effets: 0.6, voix: 0.7 })
  })

  it('connecterMission s’abonne en lecture seule et se désabonne', () => {
    const ecouteurs = new Set<(e: EvenementMission) => void>()
    const source = {
      ecouter(f: (e: EvenementMission) => void) {
        ecouteurs.add(f)
        return () => void ecouteurs.delete(f)
      },
    }
    const deconnecter = connecterMission(source)
    expect(ecouteurs.size).toBe(1)
    for (const f of ecouteurs) f({ type: 'etoile', etoiles: 1, etoilesMax: 2 })
    deconnecter()
    expect(ecouteurs.size).toBe(0)
  })
})
