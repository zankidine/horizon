import { describe, it, expect } from 'vitest'
import {
  lirePreferences,
  nettoyerNomCopilote,
  serialiserPreferences,
  LONGUEUR_MAX_COPILOTE,
  PREFERENCES_PAR_DEFAUT,
  type Preferences,
} from './preferences'

const exemple: Preferences = {
  profil: 'adulte',
  ambianceCockpit: 'cinema',
  copilote: 'Nova',
}

describe('serialiserPreferences / lirePreferences', () => {
  it('relit exactement ce qui a été sérialisé', () => {
    expect(lirePreferences(serialiserPreferences(exemple))).toEqual(exemple)
  })

  it('renvoie {} pour un contenu absent ou illisible', () => {
    expect(lirePreferences(null)).toEqual({})
    expect(lirePreferences(undefined)).toEqual({})
    expect(lirePreferences('')).toEqual({})
    expect(lirePreferences('pas du json {')).toEqual({})
    expect(lirePreferences('42')).toEqual({})
    expect(lirePreferences('null')).toEqual({})
    expect(lirePreferences('[1,2]')).toEqual({})
  })

  it('ignore une version inconnue', () => {
    expect(
      lirePreferences(JSON.stringify({ ...exemple, version: 999 }))
    ).toEqual({})
    expect(lirePreferences(JSON.stringify(exemple))).toEqual({})
  })

  it('ignore chaque valeur invalide séparément', () => {
    const brut = JSON.stringify({
      version: 1,
      profil: 'robot',
      ambianceCockpit: 'cinema',
      copilote: 42,
    })
    expect(lirePreferences(brut)).toEqual({ ambianceCockpit: 'cinema' })
  })

  it('nettoie le nom du copilote à la lecture', () => {
    const brut = JSON.stringify({
      version: 1,
      copilote: '  Nova \n  Étoile  ',
    })
    expect(lirePreferences(brut)).toEqual({ copilote: 'Nova Étoile' })
  })

  it('laisse les valeurs par défaut valides', () => {
    const relu = lirePreferences(
      serialiserPreferences({
        ...PREFERENCES_PAR_DEFAUT,
        copilote: 'Luna',
      })
    )
    expect(relu.profil).toBe('enfant')
    expect(relu.ambianceCockpit).toBe('aventure')
  })
})

describe('nettoyerNomCopilote', () => {
  it('garde un nom simple et les accents', () => {
    expect(nettoyerNomCopilote('Comète')).toBe('Comète')
  })

  it('normalise les espaces et retire les caractères de contrôle', () => {
    expect(nettoyerNomCopilote('  Ma   Lune\t\u0007 ')).toBe('Ma Lune')
  })

  it('limite la longueur en caractères, sans couper un emoji', () => {
    const long = 'a'.repeat(LONGUEUR_MAX_COPILOTE + 10)
    expect(nettoyerNomCopilote(long)).toHaveLength(LONGUEUR_MAX_COPILOTE)
    const emojis = '🚀'.repeat(LONGUEUR_MAX_COPILOTE + 5)
    expect([...(nettoyerNomCopilote(emojis) ?? '')]).toHaveLength(
      LONGUEUR_MAX_COPILOTE
    )
  })

  it("renvoie null pour une valeur vide ou qui n'est pas du texte", () => {
    expect(nettoyerNomCopilote('')).toBeNull()
    expect(nettoyerNomCopilote('   ')).toBeNull()
    expect(nettoyerNomCopilote(null)).toBeNull()
    expect(nettoyerNomCopilote(12)).toBeNull()
    expect(nettoyerNomCopilote({})).toBeNull()
  })
})
