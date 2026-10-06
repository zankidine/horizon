import { describe, it, expect } from 'vitest'
import donnees from '../data/destinations.json'
import { DISTANCE_TERRE_LUNE_KM } from './constants'
import { distanceDestinationKm, validerDestinations } from './destinations'
import { ErreurValidation } from './validation'

/** Copie profonde des données réelles, à abîmer dans chaque test. */
function copie(): { destinations: Record<string, unknown>[] } {
  return structuredClone(donnees) as { destinations: Record<string, unknown>[] }
}

function problemesDe(donneesInvalides: unknown): string[] {
  try {
    validerDestinations(donneesInvalides)
  } catch (erreur) {
    expect(erreur).toBeInstanceOf(ErreurValidation)
    return [...(erreur as ErreurValidation).problemes]
  }
  throw new Error('La validation aurait dû échouer')
}

describe('destinations.json', () => {
  it('est valide : la Lune est active, les autres sont « bientôt »', () => {
    const destinations = validerDestinations(donnees)
    const [lune, ...autres] = destinations
    expect(lune).toMatchObject({ id: 'lune', active: true })
    expect(autres.length).toBeGreaterThanOrEqual(2)
    expect(autres.every((d) => !d.active && d.distanceConstante === undefined)).toBe(true)
  })

  it('la distance de la Lune vient de constants.ts', () => {
    const [lune, mars] = validerDestinations(donnees)
    expect(lune.distanceConstante).toBe('DISTANCE_TERRE_LUNE_KM')
    expect(distanceDestinationKm(lune)).toBe(DISTANCE_TERRE_LUNE_KM)
    expect(distanceDestinationKm(mars)).toBeUndefined()
  })
})

describe('validerDestinations : constante référencée', () => {
  it('refuse un nom de constante qui n’existe pas', () => {
    const d = copie()
    d.destinations[0].distanceConstante = 'DISTANCE_TERRE_LUNNE_KM'
    expect(problemesDe(d).join('\n')).toContain('« DISTANCE_TERRE_LUNNE_KM » n\'existe pas')
  })

  it('refuse un nom hérité de Object.prototype', () => {
    const d = copie()
    d.destinations[0].distanceConstante = 'toString'
    expect(problemesDe(d).join('\n')).toContain('n\'existe pas')
  })

  it('refuse une constante qui n’est pas une distance en km', () => {
    const d = copie()
    d.destinations[0].distanceConstante = 'JOURS_PAR_AN'
    expect(problemesDe(d).join('\n')).toContain('n\'est pas une distance')
  })

  it('refuse une constante qui n’est pas un nombre', () => {
    const d = copie()
    d.destinations[0].distanceConstante = 'VITESSES_CROISIERE_KM_H'
    expect(problemesDe(d).join('\n')).toContain('n\'existe pas')
  })

  it('exige un nom de constante pour une destination active', () => {
    const d = copie()
    delete d.destinations[0].distanceConstante
    expect(problemesDe(d).join('\n')).toContain('nom de constante attendu')
  })

  it('interdit une distance sur une destination désactivée', () => {
    const d = copie()
    d.destinations[1].distanceConstante = 'DISTANCE_TERRE_LUNE_KM'
    expect(problemesDe(d).join('\n')).toContain('interdite pour une destination désactivée')
  })
})

describe('validerDestinations : structure', () => {
  it('refuse des données qui ne sont pas un tableau non vide', () => {
    expect(problemesDe(null)[0]).toContain('tableau non vide')
    expect(problemesDe({ destinations: [] })[0]).toContain('tableau non vide')
    expect(problemesDe({ destinations: 'lune' })[0]).toContain('tableau non vide')
  })

  it('exige les textes en version enfant ET adulte', () => {
    const d = copie()
    delete (d.destinations[0].nom as Record<string, unknown>).adulte
    ;(d.destinations[1].description as Record<string, unknown>).enfant = '  '
    const problemes = problemesDe(d).join('\n')
    expect(problemes).toContain('destinations[0].nom.adulte')
    expect(problemes).toContain('destinations[1].description.enfant')
  })

  it('refuse un identifiant en double ou mal formé', () => {
    const d = copie()
    d.destinations[1].id = 'lune'
    d.destinations[2].id = 'Jupiter!'
    const problemes = problemesDe(d).join('\n')
    expect(problemes).toContain('« lune » est en double')
    expect(problemes).toContain('destinations[2].id')
  })

  it('refuse un « active » qui n’est pas un booléen', () => {
    const d = copie()
    d.destinations[0].active = 'oui'
    expect(problemesDe(d).join('\n')).toContain('active : booléen attendu')
  })

  it('liste tous les problèmes d’un coup', () => {
    const d = copie()
    d.destinations[0].distanceConstante = 'NOPE_KM'
    d.destinations[1].id = ''
    expect(problemesDe(d).length).toBeGreaterThanOrEqual(2)
  })
})

describe('validerDestinations : astre facultatif', () => {
  it('accepte l’absence de champ astre (jupiter) et refuse un identifiant mal formé', () => {
    const d = copie()
    expect(d.destinations[2].astre).toBeUndefined()
    d.destinations[0].astre = 'La Lune!'
    expect(problemesDe(d).join('\n')).toContain('destinations[0].astre')
  })
})
