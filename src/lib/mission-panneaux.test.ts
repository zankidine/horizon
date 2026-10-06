import { describe, expect, it } from 'vitest'
import { TYPES_ETAPE } from '../core/mission-types'
import { panneauxUtiles } from './mission-panneaux'

describe('panneauxUtiles', () => {
  it('montre le trajet pendant le voyage et la cible pendant une observation', () => {
    expect(panneauxUtiles('voyage')).toEqual(['trajet'])
    expect(panneauxUtiles('observation')).toEqual(['cible'])
  })

  it('replie tout le reste, y compris sans étape', () => {
    for (const type of TYPES_ETAPE.filter((t) => t !== 'voyage' && t !== 'observation')) expect(panneauxUtiles(type)).toEqual([])
    expect(panneauxUtiles(null)).toEqual([])
  })
})
