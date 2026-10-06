import { describe, it, expect } from 'vitest'
import {
  DISTANCE_TERRE_LUNE_KM,
  HAUTEUR_TOUR_EIFFEL_M,
  JOURS_PAR_AN,
  VITESSE_MARCHE_KM_H,
  VITESSE_VOITURE_KM_H,
} from './constants'
import {
  arrondirSignificatif,
  delaiRadioAllerRetourSecondes,
  dureeTrajetHeures,
  dureeTrajetSecondes,
  kmEnMetres,
  metresEnKm,
  secondesEn,
  tempsLumiereSecondes,
  uniteDureeLisible,
} from './units'

describe('conversions', () => {
  it('passe des mètres aux kilomètres et inversement', () => {
    expect(metresEnKm(HAUTEUR_TOUR_EIFFEL_M)).toBeCloseTo(0.33, 10)
    expect(kmEnMetres(metresEnKm(HAUTEUR_TOUR_EIFFEL_M))).toBeCloseTo(HAUTEUR_TOUR_EIFFEL_M, 10)
  })

  it('une année vaut 365,25 jours', () => {
    const unAnEnSecondes = 1 / secondesEn(1, 'an')
    expect(secondesEn(unAnEnSecondes, 'jour')).toBeCloseTo(JOURS_PAR_AN, 10)
    expect(secondesEn(unAnEnSecondes, 'mois')).toBeCloseTo(12, 10)
  })
})

describe('durée de trajet', () => {
  it('vaut distance / vitesse', () => {
    expect(dureeTrajetHeures(VITESSE_VOITURE_KM_H, VITESSE_VOITURE_KM_H)).toBe(1)
    expect(dureeTrajetSecondes(VITESSE_MARCHE_KM_H, VITESSE_MARCHE_KM_H)).toBe(3600)
  })

  it('refuse une vitesse nulle ou négative', () => {
    expect(() => dureeTrajetHeures(10, 0)).toThrow(RangeError)
    expect(() => dureeTrajetHeures(10, -5)).toThrow(RangeError)
  })

  it('marcher jusqu’à la Lune sans s’arrêter prend environ 8,8 ans', () => {
    const annees = secondesEn(dureeTrajetSecondes(DISTANCE_TERRE_LUNE_KM, VITESSE_MARCHE_KM_H), 'an')
    expect(annees).toBeCloseTo(8.8, 1)
  })
})

describe('lumière et radio', () => {
  it('la lumière met environ 1,28 s pour aller de la Terre à la Lune', () => {
    expect(tempsLumiereSecondes(DISTANCE_TERRE_LUNE_KM)).toBeCloseTo(1.28, 2)
  })

  it('le délai radio aller-retour est le double du temps de lumière', () => {
    expect(delaiRadioAllerRetourSecondes(DISTANCE_TERRE_LUNE_KM)).toBeCloseTo(2.56, 2)
  })
})

describe('uniteDureeLisible', () => {
  it('choisit la plus grande unité où la durée vaut au moins 1', () => {
    expect(uniteDureeLisible(0.5)).toBe('seconde')
    expect(uniteDureeLisible(59)).toBe('seconde')
    expect(uniteDureeLisible(60)).toBe('minute')
    expect(uniteDureeLisible(3600)).toBe('heure')
    expect(uniteDureeLisible(86400)).toBe('jour')
    expect(uniteDureeLisible(40 * 86400)).toBe('mois')
    expect(uniteDureeLisible(400 * 86400)).toBe('an')
  })
})

describe('arrondirSignificatif', () => {
  it('arrondit à n chiffres significatifs', () => {
    expect(arrondirSignificatif(30.168, 2)).toBe(30)
    expect(arrondirSignificatif(8.7708, 2)).toBe(8.8)
    expect(arrondirSignificatif(1.2822, 4)).toBe(1.282)
    expect(arrondirSignificatif(1_164_848, 2)).toBe(1_200_000)
    expect(arrondirSignificatif(0.000123456, 2)).toBe(0.00012)
  })

  it('arrondit 0,5 vers le haut et laisse 0 intact', () => {
    expect(arrondirSignificatif(2.5, 1)).toBe(3)
    expect(arrondirSignificatif(0, 3)).toBe(0)
  })
})
