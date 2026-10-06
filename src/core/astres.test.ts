import { describe, it, expect } from 'vitest'
import {
  DIAMETRE_AFFICHE_MAX_DEG,
  DIAMETRE_AFFICHE_MIN_DEG,
  DIAMETRE_LUNE_KM,
  DISTANCE_TERRE_LUNE_KM,
  RAYON_LUNE_KM,
} from './constants'
import {
  ASTRES,
  apparenceAstre,
  diametreAffiche,
  diametreAngulaire,
  versRepereVaisseau,
} from './astres'
import type { EtatVaisseau } from './vaisseau'

const DEG = 180 / Math.PI
const RAD = Math.PI / 180

function vaisseauEn(position: [number, number, number], lacet = 0, tangage = 0): EtatVaisseau {
  return { position, lacet, tangage, vitesseKmS: 0, poussee: false }
}

describe('apparenceAstre : diamètre angulaire', () => {
  it('depuis la Terre, la Lune mesure environ 0,52°', () => {
    const { diametreAngulaireRad } = apparenceAstre(vaisseauEn([0, 0, 0]), ASTRES.lune)
    expect(diametreAngulaireRad * DEG).toBeCloseTo(0.52, 2)
  })

  it('depuis la Lune, la Terre mesure environ 1,9°', () => {
    const { diametreAngulaireRad } = apparenceAstre(
      vaisseauEn([DISTANCE_TERRE_LUNE_KM, 0, 0]),
      ASTRES.terre
    )
    expect(diametreAngulaireRad * DEG).toBeCloseTo(1.9, 1)
  })

  it('utilise le diamètre de la Lune de constants.ts', () => {
    expect(RAYON_LUNE_KM).toBe(DIAMETRE_LUNE_KM / 2)
    expect(diametreAngulaire(RAYON_LUNE_KM, DISTANCE_TERRE_LUNE_KM)).toBeCloseTo(
      2 * Math.atan(DIAMETRE_LUNE_KM / 2 / DISTANCE_TERRE_LUNE_KM),
      12
    )
  })

  it('grossit quand on s’approche', () => {
    const loin = apparenceAstre(vaisseauEn([0, 0, 500_000]), ASTRES.terre)
    const pres = apparenceAstre(vaisseauEn([0, 0, 50_000]), ASTRES.terre)
    expect(pres.diametreAngulaireRad).toBeGreaterThan(loin.diametreAngulaireRad)
    expect(pres.distanceKm).toBe(50_000)
  })

  it('au centre même de l’astre : pas de division par zéro, direction vers l’avant', () => {
    const a = apparenceAstre(vaisseauEn([0, 0, 0]), ASTRES.terre)
    expect(a.distanceKm).toBe(0)
    expect(a.direction).toEqual([0, 0, -1])
    expect(a.diametreAngulaireRad).toBeCloseTo(Math.PI, 12)
  })
})

describe('apparenceAstre : direction', () => {
  it('la direction dans le monde est unitaire et pointe vers l’astre', () => {
    const { direction } = apparenceAstre(vaisseauEn([0, 0, 0]), ASTRES.lune)
    expect(direction[0]).toBeCloseTo(1, 12)
    expect(Math.hypot(...direction)).toBeCloseTo(1, 12)
  })

  it('cap vers la Lune (lacet −90°) : la Lune est droit devant', () => {
    const { directionVaisseau } = apparenceAstre(vaisseauEn([0, 0, 0], -90 * RAD), ASTRES.lune)
    expect(directionVaisseau[0]).toBeCloseTo(0, 10)
    expect(directionVaisseau[1]).toBeCloseTo(0, 10)
    expect(directionVaisseau[2]).toBeCloseTo(-1, 10)
  })

  it('le cap fait tourner le ciel : en virant à gauche, la Lune passe à droite', () => {
    const devant = apparenceAstre(vaisseauEn([0, 0, 0], -90 * RAD), ASTRES.lune)
    const aGauche = apparenceAstre(vaisseauEn([0, 0, 0], -80 * RAD), ASTRES.lune)
    expect(aGauche.directionVaisseau[0]).toBeGreaterThan(devant.directionVaisseau[0])
    // Angle de 10° entre l'avant et la Lune.
    expect(Math.atan2(aGauche.directionVaisseau[0], -aGauche.directionVaisseau[2]) * DEG).toBeCloseTo(10, 8)
  })

  it('en levant le nez, un astre à l’horizon passe sous la ligne de visée', () => {
    const { directionVaisseau } = apparenceAstre(vaisseauEn([0, 0, 0], -90 * RAD, 20 * RAD), ASTRES.lune)
    expect(directionVaisseau[1]).toBeLessThan(0)
    expect(Math.asin(-directionVaisseau[1]) * DEG).toBeCloseTo(20, 8)
  })

  it('la rotation vers le repère du vaisseau conserve la longueur', () => {
    const v = versRepereVaisseau({ lacet: 1.1, tangage: -0.4 }, [3, 4, 12])
    expect(Math.hypot(...v)).toBeCloseTo(13, 10)
  })
})

describe('diametreAffiche (taille à l’écran)', () => {
  it('reste entre le minimum et le maximum affichés', () => {
    for (const reelDeg of [0.001, 0.2, 0.52, 1.9, 10, 60, 120, 179]) {
      const deg = diametreAffiche(reelDeg * RAD) * DEG
      expect(deg).toBeGreaterThanOrEqual(DIAMETRE_AFFICHE_MIN_DEG - 1e-9)
      expect(deg).toBeLessThanOrEqual(DIAMETRE_AFFICHE_MAX_DEG + 1e-9)
    }
  })

  it('croît avec la taille réelle, sans jamais décroître', () => {
    let precedent = 0
    for (let reelDeg = 0.05; reelDeg < 175; reelDeg *= 1.3) {
      const x = diametreAffiche(reelDeg * RAD)
      expect(x).toBeGreaterThanOrEqual(precedent)
      precedent = x
    }
  })

  it('la Lune, trop petite pour être vue à sa taille réelle, est agrandie', () => {
    const lune = apparenceAstre(vaisseauEn([0, 0, 0]), ASTRES.lune).diametreAngulaireRad
    expect(diametreAffiche(lune)).toBeGreaterThan(2 * lune)
  })

  it('la Terre reste plus grosse que la Lune depuis un point à égale distance', () => {
    const v = vaisseauEn([DISTANCE_TERRE_LUNE_KM / 2, 0, DISTANCE_TERRE_LUNE_KM / 2])
    const terre = diametreAffiche(apparenceAstre(v, ASTRES.terre).diametreAngulaireRad)
    const lune = diametreAffiche(apparenceAstre(v, ASTRES.lune).diametreAngulaireRad)
    expect(terre).toBeGreaterThan(lune)
  })

  it('une valeur invalide donne la taille minimale', () => {
    expect(diametreAffiche(NaN) * DEG).toBeCloseTo(DIAMETRE_AFFICHE_MIN_DEG, 10)
    expect(diametreAffiche(-1) * DEG).toBeCloseTo(DIAMETRE_AFFICHE_MIN_DEG, 10)
  })
})
