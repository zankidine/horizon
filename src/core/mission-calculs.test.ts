import { describe, it, expect } from 'vitest'
import {
  ALTITUDE_ORBITE_LUNAIRE_KM,
  APOLLO_11_ORBITE_LUNAIRE_BASSE_KM,
  APOLLO_11_ORBITE_LUNAIRE_HAUTE_KM,
  APOLLO_11_SORTIE_H,
  APOLLO_11_SURFACE_H,
  APOLLO_11_TRAJET_H,
  APOLLO_11_VITESSE_MOYENNE_KM_H,
  DESCENTE_ZONE_VITESSE_MAX_MS,
  DESCENTE_ZONE_VITESSE_MIN_MS,
  DISTANCE_TERRE_LUNE_KM,
  SITES_LUMIERE_POURCENT,
  SITES_PLANEITE_POURCENT,
} from './constants'
import {
  dureeOrbiteCacheeS,
  fractionOrbiteCachee,
  fractionOrbiteCacheePourcent,
  graviteSurfaceMs2,
  hauteurSautLuneCm,
  periodeOrbiteLunaireS,
  rapportGravitesTerreLune,
  rayonOrbiteLunaireKm,
  resoudreCalcul,
} from './mission-calculs'

// Valeurs de contrôle calculées à la main (R = 1 737 km, h = 110 km, g = 1,62 m/s²).
describe('orbite lunaire : coupure radio', () => {
  it('rayon de l’orbite : 1 737 + 110 = 1 847 km', () => {
    expect(rayonOrbiteLunaireKm()).toBe(1847)
  })

  it('période : 2π √(a³ / (g R²)) ≈ 7 134 s, soit environ 2 heures', () => {
    // g R² = 0,00162 km/s² × 1 737² km² = 4 887,8 km³/s² ; a³ = 6 300 872 423 km³ ;
    // a³ / (g R²) = 1 289 124 s² ; racine = 1 135,4 s ; × 2π = 7 133,8 s.
    expect(periodeOrbiteLunaireS()).toBeCloseTo(7133.8, 0)
    expect(periodeOrbiteLunaireS() / 3600).toBeGreaterThan(1.9)
    expect(periodeOrbiteLunaireS() / 3600).toBeLessThan(2.1)
  })

  it('fraction cachée : 2 asin(1 737 / 1 847) / (2π) ≈ 0,38959, soit environ 39 %', () => {
    // asin(0,940444) = 1,223941 rad ; 2 × 1,223941 / (2π) = 0,389590.
    expect(fractionOrbiteCachee()).toBeCloseTo(0.38959, 4)
    expect(fractionOrbiteCacheePourcent()).toBeCloseTo(38.959, 2)
    expect(fractionOrbiteCacheePourcent()).toBeGreaterThan(38.5)
    expect(fractionOrbiteCacheePourcent()).toBeLessThan(39.5)
  })

  it('durée de coupure : 0,38959 × 7 133,8 s ≈ 2 779 s, soit environ 46 minutes', () => {
    expect(dureeOrbiteCacheeS()).toBeCloseTo(2779.3, 0)
    expect(dureeOrbiteCacheeS() / 60).toBeGreaterThan(46)
    expect(dureeOrbiteCacheeS() / 60).toBeLessThan(47)
  })

  it('« plus d’un quart, moins de la moitié » (indice de la mission) est vrai', () => {
    expect(fractionOrbiteCachee()).toBeGreaterThan(1 / 4)
    expect(fractionOrbiteCachee()).toBeLessThan(1 / 2)
  })

  it('plus l’orbite est basse, plus la part cachée approche la moitié (limite h → 0)', () => {
    // Avec h = 0 : asin(1) = π/2, donc la fraction vaut exactement 1/2. Contrôle de la formule.
    expect(Math.asin(1) / Math.PI).toBe(0.5)
    expect(fractionOrbiteCachee()).toBeLessThan(Math.asin(1) / Math.PI)
  })

  it('l’altitude du jeu est entre l’orbite basse et l’orbite haute d’Apollo 11 (62 et 70,5 miles)', () => {
    expect(APOLLO_11_ORBITE_LUNAIRE_BASSE_KM).toBeCloseTo(99.78, 2) // 62 × 1,609344
    expect(APOLLO_11_ORBITE_LUNAIRE_HAUTE_KM).toBeCloseTo(113.46, 2) // 70,5 × 1,609344
    expect(ALTITUDE_ORBITE_LUNAIRE_KM).toBeGreaterThan(APOLLO_11_ORBITE_LUNAIRE_BASSE_KM)
    expect(ALTITUDE_ORBITE_LUNAIRE_KM).toBeLessThan(APOLLO_11_ORBITE_LUNAIRE_HAUTE_KM)
  })
})

describe('saut : rapport des gravités (astres.json)', () => {
  it('gravités : 9,82 m/s² sur Terre, 1,62 m/s² sur la Lune', () => {
    expect(graviteSurfaceMs2('terre')).toBe(9.82)
    expect(graviteSurfaceMs2('lune')).toBe(1.62)
  })

  it('rapport : 9,82 / 1,62 ≈ 6,0617 ; saut de 40 cm sur Terre : 40 × 6,0617 ≈ 242,47 cm', () => {
    expect(rapportGravitesTerreLune()).toBeCloseTo(6.0617, 4)
    expect(hauteurSautLuneCm()).toBeCloseTo(242.47, 2)
  })

  it('l’astre inconnu lève une erreur', () => {
    expect(() => graviteSurfaceMs2('pluton')).toThrow()
  })
})

describe('calculs appelables par nom', () => {
  it('un calcul connu donne sa valeur, un nom inconnu ou hérité donne undefined', () => {
    expect(resoudreCalcul('fractionOrbiteCachee')).toBe(fractionOrbiteCachee())
    expect(resoudreCalcul('nExistePas')).toBeUndefined()
    expect(resoudreCalcul('toString')).toBeUndefined()
    expect(resoudreCalcul('constructor')).toBeUndefined()
  })
})

describe('Apollo 11 : valeurs NASA et valeurs déduites', () => {
  it('trajet : 75 h 50 min − (2 h 44 min + 5 min 48 s) ≈ 73,00 h, soit environ 3 jours', () => {
    // 75,8333 − 2,7333 − 0,09667 = 73,0033 h.
    expect(APOLLO_11_TRAJET_H).toBeCloseTo(73.0033, 3)
    expect(APOLLO_11_TRAJET_H / 24).toBeGreaterThan(2.9)
    expect(APOLLO_11_TRAJET_H / 24).toBeLessThan(3.1)
  })

  it('vitesse moyenne : 384 400 km / 73,0033 h ≈ 5 265 km/h', () => {
    expect(APOLLO_11_VITESSE_MOYENNE_KM_H).toBeCloseTo(DISTANCE_TERRE_LUNE_KM / 73.0033, 1)
    expect(APOLLO_11_VITESSE_MOYENNE_KM_H).toBeCloseTo(5265.5, 0)
  })

  it('séjour : 21 h 36 min = 21,6 h ; la sortie dure plus de 2,5 h', () => {
    expect(APOLLO_11_SURFACE_H).toBeCloseTo(21.6, 10)
    expect(APOLLO_11_SORTIE_H).toBeLessThan(APOLLO_11_SURFACE_H)
  })
})

describe('valeurs de jeu', () => {
  it('descente : la zone de réussite a un minimum inférieur à son maximum', () => {
    expect(DESCENTE_ZONE_VITESSE_MIN_MS).toBeLessThan(DESCENTE_ZONE_VITESSE_MAX_MS)
  })

  it('sites fictifs : Alpha le plus plat, Bêta le plus lumineux, Gamma le meilleur compromis (les textes le disent)', () => {
    const sites = ['alpha', 'beta', 'gamma'] as const
    const plat = [...sites].sort((a, b) => SITES_PLANEITE_POURCENT[b] - SITES_PLANEITE_POURCENT[a])[0]
    const lumineux = [...sites].sort((a, b) => SITES_LUMIERE_POURCENT[b] - SITES_LUMIERE_POURCENT[a])[0]
    const compromis = [...sites].sort(
      (a, b) =>
        SITES_PLANEITE_POURCENT[b] + SITES_LUMIERE_POURCENT[b] - (SITES_PLANEITE_POURCENT[a] + SITES_LUMIERE_POURCENT[a])
    )[0]
    expect([plat, lumineux, compromis]).toEqual(['alpha', 'beta', 'gamma'])
  })
})
