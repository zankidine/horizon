import { describe, expect, it } from 'vitest'
import { TOLERANCE_CALCUL_NIVEAU } from '../core/constants'
import { FORMATS_VALEUR } from '../core/mission-types'
import { placeBonneReponse, reponsesPossibles, uniteSaisie } from './mission-reponses'

describe('reponsesPossibles', () => {
  it('donne trois réponses distinctes dont une seule correcte', () => {
    const r = reponsesPossibles(384400, 'km', 1, 'v2-calcul')
    expect(r).toHaveLength(3)
    expect(r.filter((x) => x.correcte)).toHaveLength(1)
    expect(new Set(r.map((x) => x.libelle)).size).toBe(3)
    expect(r.find((x) => x.correcte)?.valeur).toBe(384400)
  })

  it('écrit la bonne réponse avec les unités et les espaces du moteur', () => {
    const bonne = reponsesPossibles(384400, 'km', 1, 'a').find((x) => x.correcte)
    expect(bonne?.libelle.replace(/[\s\u00a0\u202f]+/g, ' ')).toBe('380 000 km')
  })

  it('met des fausses valeurs hors de la tolérance, à tous les niveaux', () => {
    for (const niveau of [1, 2, 3, 4] as const) {
      for (const attendu of [39, 384400, 6.2]) {
        for (const r of reponsesPossibles(attendu, 'nombre', niveau, 'x').filter((x) => !x.correcte)) {
          expect(Math.abs(r.valeur - attendu)).toBeGreaterThan(TOLERANCE_CALCUL_NIVEAU[niveau] * attendu)
        }
      }
    }
  })

  it('garde la même place pour la même graine et varie selon la graine', () => {
    expect(placeBonneReponse('s7-4')).toBe(placeBonneReponse('s7-4'))
    const places = new Set(['v2-calcul', 's7-4', 's10-4', 'a', 'b', 'c', 'd'].map(placeBonneReponse))
    expect(places.size).toBeGreaterThan(1)
  })

  it('donne une unité pour chaque format', () => {
    for (const f of FORMATS_VALEUR) expect(typeof uniteSaisie(f)).toBe('string')
    expect(uniteSaisie('pourcent')).toBe('%')
    expect(uniteSaisie('km')).toBe('km')
    expect(uniteSaisie('cm')).toBe('cm')
  })
})
