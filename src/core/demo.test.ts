import { describe, it, expect } from 'vitest'
import { ASTRES, apparenceAstre } from './astres'
import {
  DEMO_DISTANCE_CHANGEMENT_KM,
  DEMO_DUREE_MAX_CIBLE_S,
  DT_MAX_S,
  FACTEUR_ACCELERATION_TEMPS,
  VITESSE_ROTATION_CAP_MAX_DEG_S,
} from './constants'
import { autreCible, capVers, creerDemo, pilotageDemo, pointVise } from './demo'
import { avancer, creerVaisseau, directionCap, normaliserAngle } from './vaisseau'

const RAD = Math.PI / 180

describe('capVers', () => {
  it('le cap calculé regarde bien vers le point', () => {
    const position = [100, 200, 300] as const
    const point = [-4000, 900, -7000] as const
    const cap = capVers(position, point, { lacet: 0, tangage: 0 })
    const d = directionCap(cap)
    const longueur = Math.hypot(point[0] - 100, point[1] - 200, point[2] - 300)
    expect(d[0]).toBeCloseTo((point[0] - 100) / longueur, 10)
    expect(d[1]).toBeCloseTo((point[1] - 200) / longueur, 10)
    expect(d[2]).toBeCloseTo((point[2] - 300) / longueur, 10)
  })

  it('garde le cap actuel quand on est déjà sur le point', () => {
    const cap = { lacet: 0.4, tangage: 0.1 }
    expect(capVers([1, 2, 3], [1, 2, 3], cap)).toEqual(cap)
  })
})

describe('pointVise', () => {
  it('est au-dessus de l’astre : on le frôle sans le traverser', () => {
    for (const cible of ['lune', 'terre'] as const) {
      const [x, y, z] = pointVise(cible)
      expect([x, z]).toEqual([ASTRES[cible].position[0], ASTRES[cible].position[2]])
      expect(y).toBeGreaterThan(ASTRES[cible].rayonKm)
    }
  })
})

describe('pilotageDemo : changement de cible', () => {
  it('passe à l’autre astre quand le vaisseau est assez près du point visé', () => {
    const [x, y, z] = pointVise('lune')
    const proche = { ...creerVaisseau(), position: [x - DEMO_DISTANCE_CHANGEMENT_KM / 2, y, z] as const }
    expect(pilotageDemo(proche, creerDemo('lune'), 0.016).demo.cible).toBe('terre')
  })

  it('reste sur la cible quand le vaisseau est loin', () => {
    const { demo } = pilotageDemo(creerVaisseau(), creerDemo('lune'), 0.016)
    expect(demo.cible).toBe('lune')
    expect(demo.secondesSurCible).toBeCloseTo(0.016, 10)
  })

  it('change de cible après DEMO_DUREE_MAX_CIBLE_S même si le point reste loin', () => {
    const demo = { cible: 'lune' as const, secondesSurCible: DEMO_DUREE_MAX_CIBLE_S }
    expect(pilotageDemo(creerVaisseau(), demo, 0.016).demo.cible).toBe('terre')
  })

  it('autreCible alterne', () => {
    expect(autreCible('lune')).toBe('terre')
    expect(autreCible('terre')).toBe('lune')
  })
})

describe('démonstration simulée sur 3 minutes', () => {
  function simuler(secondes: number, dt: number) {
    let vaisseau = creerVaisseau()
    let demo = creerDemo()
    const departPosition = vaisseau.position
    let distanceMinTerre = Infinity
    let distanceMinLune = Infinity
    let rotationMax = 0
    const cibles = new Set<string>()
    for (let t = 0; t < secondes; t += dt) {
      const pilotage = pilotageDemo(vaisseau, demo, dt)
      demo = pilotage.demo
      cibles.add(demo.cible)
      const suivant = avancer(vaisseau, dt, {
        facteurTemps: FACTEUR_ACCELERATION_TEMPS,
        consigne: pilotage.consigne,
      })
      const dLacet = Math.abs(normaliserAngle(suivant.lacet - vaisseau.lacet))
      rotationMax = Math.max(rotationMax, dLacet / Math.min(dt, DT_MAX_S))
      vaisseau = suivant
      distanceMinTerre = Math.min(distanceMinTerre, apparenceAstre(vaisseau, ASTRES.terre).distanceKm)
      distanceMinLune = Math.min(distanceMinLune, apparenceAstre(vaisseau, ASTRES.lune).distanceKm)
    }
    return { vaisseau, departPosition, distanceMinTerre, distanceMinLune, rotationMax, cibles }
  }

  it('le vaisseau bouge et vire : la scène n’est jamais figée', () => {
    const { vaisseau, departPosition, cibles } = simuler(180, 1 / 60)
    expect(Math.hypot(...vaisseau.position.map((p, i) => p - departPosition[i]))).toBeGreaterThan(1000)
    expect(cibles).toEqual(new Set(['lune', 'terre']))
  })

  it('ne traverse jamais la Terre ni la Lune', () => {
    const { distanceMinTerre, distanceMinLune } = simuler(180, 1 / 60)
    expect(distanceMinTerre).toBeGreaterThan(ASTRES.terre.rayonKm)
    expect(distanceMinLune).toBeGreaterThan(ASTRES.lune.rayonKm)
  })

  it('le virage ne dépasse jamais la vitesse de rotation de confort', () => {
    const { rotationMax } = simuler(180, 1 / 60)
    expect(rotationMax).toBeLessThanOrEqual(VITESSE_ROTATION_CAP_MAX_DEG_S * RAD + 1e-9)
  })

  it('reste dans la région Terre-Lune (pas de fuite dans l’espace)', () => {
    const { vaisseau } = simuler(180, 1 / 60)
    expect(Math.hypot(...vaisseau.position)).toBeLessThan(2_000_000)
  })
})
