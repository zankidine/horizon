import { describe, it, expect } from 'vitest'
import donnees from '../data/hud.json'
import { ErreurValidation } from '../core/validation'
import { validerDonneesHud } from './textes-hud'

describe('hud.json', () => {
  it('est valide et complet en version enfant et adulte', () => {
    expect(() => validerDonneesHud(donnees)).not.toThrow()
  })

  it('refuse un texte sans version adulte', () => {
    const copie = structuredClone(donnees) as unknown as {
      textes: { cap: { titre: Record<string, string> } }
    }
    delete copie.textes.cap.titre.adulte
    expect(() => validerDonneesHud(copie)).toThrow(ErreurValidation)
  })

  it('refuse un modèle sans son marqueur', () => {
    const copie = structuredClone(donnees)
    copie.textes.cible.distance.enfant = 'Loin'
    expect(() => validerDonneesHud(copie)).toThrow(/marqueur \{valeur\}/)
  })

  it('refuse une jauge hors de 0 à 1', () => {
    const copie = structuredClone(donnees)
    copie.demo.energie = 1.5
    expect(() => validerDonneesHud(copie)).toThrow(/demo\.energie/)
  })

  it('refuse un document qui n’est pas un objet', () => {
    expect(() => validerDonneesHud(null)).toThrow(ErreurValidation)
  })
})
