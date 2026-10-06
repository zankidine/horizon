import { describe, it, expect } from 'vitest'
import donnees from '../data/navigation.json'
import { validerTextesNavigation } from './textes-navigation'
import { ErreurValidation } from './validation'

type Arbre = { [cle: string]: Arbre | string }

function copie(): Arbre {
  return structuredClone(donnees) as unknown as Arbre
}

/** Descend dans l'arbre de textes : noeud(d, 'vraieVie.apollo'). */
function noeud(d: Arbre, chemin: string): Arbre {
  return chemin.split('.').reduce<Arbre>((courant, cle) => courant[cle] as Arbre, d)
}

function problemesDe(d: unknown): string {
  try {
    validerTextesNavigation(d)
  } catch (erreur) {
    expect(erreur).toBeInstanceOf(ErreurValidation)
    return (erreur as ErreurValidation).problemes.join('\n')
  }
  throw new Error('La validation aurait dû échouer')
}

describe('navigation.json', () => {
  it('est valide', () => {
    expect(validerTextesNavigation(donnees).vraieVie.titre.enfant).toBe('Dans la vraie vie…')
  })

  it('refuse un texte manquant en version adulte', () => {
    const d = copie()
    delete noeud(d, 'confirmer').adulte
    expect(problemesDe(d)).toContain('confirmer.adulte')
  })

  it('refuse une vitesse manquante ou inconnue', () => {
    const d = copie()
    delete noeud(d, 'vitesses').rapide
    noeud(d, 'vitesses').turbo = noeud(d, 'vitesses.lente')
    const problemes = problemesDe(d)
    expect(problemes).toContain('vitesses.rapide')
    expect(problemes).toContain('vitesses.turbo : vitesse inconnue')
  })

  it('refuse un modèle auquel il manque un marqueur', () => {
    const d = copie()
    noeud(d, 'vraieVie.apollo').enfant = 'Apollo 11 a mis {duree}.'
    noeud(d, 'duree').adulte = 'Durée du trajet'
    const problemes = problemesDe(d)
    expect(problemes).toContain('vraieVie.apollo.enfant : le marqueur {fois} manque')
    expect(problemes).toContain('duree.adulte : le marqueur {valeur} manque')
  })

  it('refuse des données qui ne sont pas un objet', () => {
    expect(problemesDe(null)).toContain('objet attendu')
  })
})
