import { describe, it, expect } from 'vitest'
import {
  DT_MAX_S,
  FACTEUR_ACCELERATION_TEMPS,
  ROULIS_AMPLITUDE_MAX_DEG,
  TANGAGE_MAX_DEG,
  VITESSE_ROTATION_CAP_MAX_DEG_S,
  VITESSE_VISUELLE_MAX_KM_S,
  VITESSE_VISUELLE_MIN_KM_S,
} from './constants'
import {
  avancer,
  creerVaisseau,
  directionCap,
  normaliserAngle,
  vitesseVisuelle,
  type EtatVaisseau,
} from './vaisseau'

const RAD = Math.PI / 180

/** Vaisseau à l'origine, cap −z, 10 km/s : un cas simple à calculer à la main. */
const base: EtatVaisseau = {
  position: [0, 0, 0],
  lacet: 0,
  tangage: 0,
  vitesseKmS: 10,
  poussee: false,
}

const distance = (a: readonly number[], b: readonly number[]) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

describe('directionCap', () => {
  it('regarde vers −z sans lacet ni tangage', () => {
    const [x, y, z] = directionCap(base)
    expect(x).toBeCloseTo(0, 12)
    expect(y).toBeCloseTo(0, 12)
    expect(z).toBeCloseTo(-1, 12)
  })

  it('un lacet de −90° regarde vers +x (la Lune), un lacet de +90° vers −x', () => {
    expect(directionCap({ lacet: -90 * RAD, tangage: 0 })[0]).toBeCloseTo(1, 10)
    expect(directionCap({ lacet: 90 * RAD, tangage: 0 })[0]).toBeCloseTo(-1, 10)
  })

  it('un tangage positif regarde vers le haut ; le vecteur reste unitaire', () => {
    const d = directionCap({ lacet: 0.7, tangage: 0.4 })
    expect(d[1]).toBeGreaterThan(0)
    expect(Math.hypot(...d)).toBeCloseTo(1, 12)
  })
})

describe('avancer : déplacement', () => {
  it('avance de vitesse × dt le long du cap', () => {
    const apres = avancer(base, 0.05)
    expect(distance(apres.position, base.position)).toBeCloseTo(10 * 0.05, 10)
    expect(apres.position[2]).toBeLessThan(0)
  })

  it('est pure : l’état d’entrée n’est pas modifié', () => {
    const copie = structuredClone(base)
    avancer(base, 0.05, { facteurTemps: 5 })
    expect(base).toEqual(copie)
  })

  it('respecte le facteur d’accélération du temps', () => {
    const normal = avancer(base, 0.05)
    const accelere = avancer(base, 0.05, { facteurTemps: FACTEUR_ACCELERATION_TEMPS })
    expect(distance(accelere.position, base.position)).toBeCloseTo(
      FACTEUR_ACCELERATION_TEMPS * distance(normal.position, base.position),
      6
    )
  })

  it('un facteur nul, négatif ou invalide laisse le vaisseau en place', () => {
    for (const facteurTemps of [0, -3, NaN, Infinity]) {
      expect(avancer(base, 0.05, { facteurTemps }).position).toEqual(base.position)
    }
  })

  it('ne recule pas avec une vitesse négative', () => {
    expect(avancer({ ...base, vitesseKmS: -5 }, 0.05).position).toEqual(base.position)
  })
})

describe('avancer : borne de dt', () => {
  it('un dt énorme (onglet resté inactif) est ramené à DT_MAX_S', () => {
    const apresUneHeure = avancer(base, 3600)
    const apresMax = avancer(base, DT_MAX_S)
    expect(apresUneHeure.position).toEqual(apresMax.position)
    expect(distance(apresUneHeure.position, base.position)).toBeCloseTo(10 * DT_MAX_S, 10)
  })

  it('la borne s’applique avant le facteur de temps', () => {
    const apres = avancer(base, 3600, { facteurTemps: FACTEUR_ACCELERATION_TEMPS })
    expect(distance(apres.position, base.position)).toBeCloseTo(
      10 * DT_MAX_S * FACTEUR_ACCELERATION_TEMPS,
      6
    )
  })

  it('un dt nul, négatif ou invalide ne fait rien', () => {
    for (const dt of [0, -1, NaN, -Infinity]) {
      expect(avancer(base, dt, { consigne: { lacet: 1, tangage: 1 } })).toEqual(base)
    }
  })
})

describe('avancer : rotation du cap (confort)', () => {
  const maxParSeconde = VITESSE_ROTATION_CAP_MAX_DEG_S * RAD

  it('le cap tourne vers la consigne sans dépasser la vitesse de rotation maximale', () => {
    const apres = avancer(base, DT_MAX_S, { consigne: { lacet: Math.PI / 2, tangage: 0 } })
    expect(apres.lacet).toBeGreaterThan(0)
    expect(apres.lacet).toBeCloseTo(maxParSeconde * DT_MAX_S, 12)
  })

  it('en 1 seconde de pas de 0,1 s, la rotation ne dépasse pas la borne', () => {
    let etat = base
    for (let i = 0; i < 10; i++) {
      etat = avancer(etat, DT_MAX_S, { consigne: { lacet: Math.PI, tangage: 1 } })
    }
    expect(etat.lacet).toBeLessThanOrEqual(maxParSeconde * 1 + 1e-12)
    expect(etat.tangage).toBeLessThanOrEqual(maxParSeconde * 1 + 1e-12)
  })

  it('le facteur de temps n’accélère pas la rotation', () => {
    const consigne = { lacet: 1, tangage: 0 }
    const a = avancer(base, 0.05, { consigne })
    const b = avancer(base, 0.05, { consigne, facteurTemps: FACTEUR_ACCELERATION_TEMPS })
    expect(b.lacet).toBe(a.lacet)
  })

  it('tourne par le plus court chemin (de 170° à −170°, en passant par 180°)', () => {
    const depart = { ...base, lacet: 170 * RAD }
    const apres = avancer(depart, DT_MAX_S, { consigne: { lacet: -170 * RAD, tangage: 0 } })
    expect(apres.lacet).toBeGreaterThan(170 * RAD)
  })

  it('arrive exactement sur la consigne sans la dépasser', () => {
    const consigne = { lacet: 0.001, tangage: 0.001 }
    const apres = avancer(base, DT_MAX_S, { consigne })
    expect(apres.lacet).toBeCloseTo(0.001, 12)
    expect(apres.tangage).toBeCloseTo(0.001, 12)
  })

  it('le tangage est borné, même si la consigne demande plus', () => {
    let etat = base
    for (let i = 0; i < 2000; i++) {
      etat = avancer(etat, DT_MAX_S, { consigne: { lacet: 0, tangage: Math.PI } })
    }
    expect(etat.tangage).toBeCloseTo(TANGAGE_MAX_DEG * RAD, 10)
  })

  it('sans consigne, le cap ne change pas', () => {
    const etat = { ...base, lacet: 0.3, tangage: 0.2 }
    const apres = avancer(etat, DT_MAX_S)
    expect(apres.lacet).toBe(0.3)
    expect(apres.tangage).toBe(0.2)
  })
})

describe('constantes de confort', () => {
  it('le roulis reste sous 1°, la rotation du cap sous quelques degrés par seconde', () => {
    expect(ROULIS_AMPLITUDE_MAX_DEG).toBeLessThan(1)
    expect(VITESSE_ROTATION_CAP_MAX_DEG_S).toBeLessThanOrEqual(5)
  })
})

describe('creerVaisseau', () => {
  it('démarre en mouvement, à l’écart de la Terre, sans poussée', () => {
    const v = creerVaisseau()
    expect(v.vitesseKmS).toBeGreaterThan(0)
    expect(Math.hypot(...v.position)).toBeGreaterThan(0)
    expect(v.poussee).toBe(false)
  })
})

describe('normaliserAngle', () => {
  it('ramène dans [−π, π]', () => {
    expect(normaliserAngle(3 * Math.PI)).toBeCloseTo(-Math.PI, 10)
    expect(normaliserAngle(-0.5)).toBeCloseTo(-0.5, 12)
    expect(normaliserAngle(2 * Math.PI + 0.25)).toBeCloseTo(0.25, 10)
  })
})

describe('vitesseVisuelle', () => {
  it('vaut 0 au minimum de l’échelle et en dessous, 1 au maximum et au-dessus', () => {
    expect(vitesseVisuelle(0)).toBe(0)
    expect(vitesseVisuelle(VITESSE_VISUELLE_MIN_KM_S)).toBe(0)
    expect(vitesseVisuelle(VITESSE_VISUELLE_MAX_KM_S)).toBe(1)
    expect(vitesseVisuelle(VITESSE_VISUELLE_MAX_KM_S * 1000)).toBe(1)
  })

  it('est logarithmique : la moyenne géométrique des bornes donne 0,5', () => {
    const milieu = Math.sqrt(VITESSE_VISUELLE_MIN_KM_S * VITESSE_VISUELLE_MAX_KM_S)
    expect(vitesseVisuelle(milieu)).toBeCloseTo(0.5, 12)
  })

  it('multiplier la vitesse par un facteur ajoute toujours la même intensité', () => {
    const ecart1 = vitesseVisuelle(2) - vitesseVisuelle(1)
    const ecart2 = vitesseVisuelle(20) - vitesseVisuelle(10)
    expect(ecart1).toBeCloseTo(ecart2, 12)
  })

  it('croît avec la vitesse et reste entre 0 et 1', () => {
    let precedent = -1
    for (const v of [0.05, 0.2, 1, 5, 30, 90]) {
      const x = vitesseVisuelle(v)
      expect(x).toBeGreaterThanOrEqual(precedent)
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(1)
      precedent = x
    }
  })

  it('une vitesse invalide donne 0', () => {
    expect(vitesseVisuelle(NaN)).toBe(0)
    expect(vitesseVisuelle(-10)).toBe(0)
  })
})
