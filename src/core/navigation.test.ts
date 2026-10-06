import { describe, it, expect } from 'vitest'
import donnees from '../data/destinations.json'
import {
  APOLLO_11_DUREE_TRAJET_JOURS,
  HEURES_PAR_JOUR,
  DISTANCE_TERRE_LUNE_KM,
  VITESSES_CROISIERE_KM_H,
  VITESSE_LUMIERE_KM_S,
} from './constants'
import { validerDestinations } from './destinations'
import {
  APOLLO_11_DUREE_TRAJET_SECONDES,
  VITESSES,
  calculerTrajet,
  vitesseMoyenneApolloKmH,
} from './navigation'
import { secondesEn } from './units'

const [lune, mars] = validerDestinations(donnees)

describe('calculerTrajet : la Lune', () => {
  it('renvoie distance, durée, temps de lumière et délai radio', () => {
    const trajet = calculerTrajet(lune, 'normale')
    expect(trajet.destinationId).toBe('lune')
    expect(trajet.distanceKm).toBe(DISTANCE_TERRE_LUNE_KM)
    expect(trajet.vitesseKmH).toBe(VITESSES_CROISIERE_KM_H.normale)
    expect(trajet.tempsLumiereSecondes).toBeCloseTo(DISTANCE_TERRE_LUNE_KM / VITESSE_LUMIERE_KM_S, 10)
    expect(trajet.tempsLumiereSecondes).toBeCloseTo(1.28, 2)
    expect(trajet.delaiRadioSecondes).toBeCloseTo(2 * trajet.tempsLumiereSecondes, 10)
  })

  it.each(VITESSES)('durée à la vitesse « %s » = distance / vitesse', (vitesse) => {
    const trajet = calculerTrajet(lune, vitesse)
    const attendueHeures = DISTANCE_TERRE_LUNE_KM / VITESSES_CROISIERE_KM_H[vitesse]
    expect(secondesEn(trajet.dureeSecondes, 'heure')).toBeCloseTo(attendueHeures, 10)
  })

  it('les ordres de grandeur des trois vitesses sont ceux annoncés', () => {
    expect(secondesEn(calculerTrajet(lune, 'lente').dureeSecondes, 'heure')).toBeCloseTo(19.2, 1)
    expect(secondesEn(calculerTrajet(lune, 'normale').dureeSecondes, 'heure')).toBeCloseTo(3.8, 1)
    expect(secondesEn(calculerTrajet(lune, 'rapide').dureeSecondes, 'minute')).toBeCloseTo(23, 0)
  })

  it('plus on va vite, plus le trajet est court', () => {
    const [lente, normale, rapide] = VITESSES.map((v) => calculerTrajet(lune, v).dureeSecondes)
    expect(lente).toBeGreaterThan(normale)
    expect(normale).toBeGreaterThan(rapide)
  })

  it('la lumière reste plus rapide que le vaisseau, même à la vitesse rapide', () => {
    const trajet = calculerTrajet(lune, 'rapide')
    expect(trajet.tempsLumiereSecondes).toBeLessThan(trajet.dureeSecondes)
  })
})

describe('comparaison avec Apollo 11', () => {
  it('la vitesse moyenne d’Apollo 11 vient de la distance et de la durée', () => {
    const attendue = DISTANCE_TERRE_LUNE_KM / (APOLLO_11_DUREE_TRAJET_JOURS * HEURES_PAR_JOUR)
    expect(vitesseMoyenneApolloKmH()).toBeCloseTo(attendue, 6)
  })

  it('le rapport égale durée d’Apollo / durée du trajet pour la Lune', () => {
    for (const vitesse of VITESSES) {
      const trajet = calculerTrajet(lune, vitesse)
      expect(trajet.foisPlusRapideQueApollo).toBeCloseTo(
        APOLLO_11_DUREE_TRAJET_SECONDES / trajet.dureeSecondes,
        8
      )
    }
  })

  it('chaque vitesse fictive est plus rapide qu’Apollo 11, et le rapport croît', () => {
    const rapports = VITESSES.map((v) => calculerTrajet(lune, v).foisPlusRapideQueApollo)
    expect(rapports.every((r) => r > 1)).toBe(true)
    expect(rapports[0]).toBeLessThan(rapports[1])
    expect(rapports[1]).toBeLessThan(rapports[2])
  })
})

describe('calculerTrajet : refus', () => {
  it('refuse une destination désactivée', () => {
    expect(mars.active).toBe(false)
    expect(() => calculerTrajet(mars, 'normale')).toThrow(/n'est pas disponible/)
  })

  it('refuse une vitesse inconnue', () => {
    // @ts-expect-error vitesse volontairement invalide
    expect(() => calculerTrajet(lune, 'ultra')).toThrow(RangeError)
    // @ts-expect-error nom hérité de Object.prototype
    expect(() => calculerTrajet(lune, 'toString')).toThrow(RangeError)
  })
})
