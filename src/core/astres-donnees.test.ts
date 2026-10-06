import { describe, it, expect } from 'vitest'
import destinations from '../data/destinations.json'
import {
  ASTRES,
  astreParId,
  barEnKpa,
  CATEGORIES_ASTRE,
  diametreEquatorialKm,
  diametreMoyenKm,
  distanceSoleilKm,
  donneesCategorie,
  dureeJourEnJoursTerrestres,
  dureeJourHeures,
  estIndisponible,
  graviteRelative,
  kelvinEnCelsius,
  masseKg,
  millibarEnKpa,
  nombreLunes,
  periodeOrbitaleAnnees,
  plageCelsius,
  pressionKpa,
  rapportDiametre,
  temperatureCelsius,
  trouverAstre,
  valeurSource,
} from './astres-donnees'
import {
  DIAMETRE_LUNE_KM,
  DIAMETRE_TERRE_KM,
  TOLERANCE_CONCORDANCE_DIAMETRE_KM,
} from './constants'
import { CATEGORIES_INFO } from './niveaux'
import { validerDestinations } from './destinations'

const terre = astreParId('terre')
const lune = astreParId('lune')
const mars = astreParId('mars')

describe('accès par identifiant', () => {
  it('trouve un astre ou renvoie undefined, ou lève une erreur', () => {
    expect(trouverAstre('mars')?.nom).toBe('Mars')
    expect(trouverAstre('pluton')).toBeUndefined()
    expect(() => astreParId('pluton')).toThrow(/Astre inconnu/)
  })
})

describe('accès par catégorie d’information', () => {
  it('les catégories d’astre sont des CategorieInfo', () => {
    for (const c of CATEGORIES_ASTRE) expect(CATEGORIES_INFO).toContain(c)
    expect(CATEGORIES_ASTRE).toEqual(['temperature', 'gravite', 'atmosphere', 'orbite'])
  })

  it('renvoie les données de chaque catégorie', () => {
    expect(donneesCategorie(mars, 'temperature').temperatures).toHaveLength(2)
    expect(donneesCategorie(mars, 'gravite').graviteSurface).toBe(mars.graviteSurface)
    expect(donneesCategorie(mars, 'atmosphere').composition.constituants[0].formule).toBe('CO2')
    expect(Object.keys(donneesCategorie(mars, 'orbite'))).toEqual([
      'periodeOrbitale',
      'distanceSoleil',
      'dureeJour',
      'rotationSiderale',
      'nombreLunes',
    ])
  })
})

describe('conversions (valeurs de contrôle à la main)', () => {
  it('K → °C : 273,15 K = 0 °C, 288 K = 14,85 °C', () => {
    expect(kelvinEnCelsius(273.15)).toBeCloseTo(0, 10)
    expect(kelvinEnCelsius(288)).toBeCloseTo(14.85, 10)
    expect(kelvinEnCelsius(0)).toBeCloseTo(-273.15, 10)
  })

  it('bar → kPa : 1 bar = 100 kPa ; mb → kPa : 1013,25 mb = 101,325 kPa', () => {
    expect(barEnKpa(1)).toBe(100)
    expect(millibarEnKpa(1013.25)).toBeCloseTo(101.325, 10)
    expect(millibarEnKpa(1000)).toBe(100)
  })

  it('convertit les mesures des fiches', () => {
    expect(temperatureCelsius(terre.temperatures[0])).toBeCloseTo(14.85, 10)
    expect(temperatureCelsius(mars.temperatures[0])).toBeCloseTo(-59.15, 10)
    expect(plageCelsius(lune.temperatures[1])).toEqual({
      min: expect.closeTo(-178.15, 10),
      max: expect.closeTo(116.85, 10),
    })
    expect(pressionKpa(terre.atmosphere.pression[0])).toBeCloseTo(101.4, 10)
    expect(pressionKpa(mars.atmosphere.pression[0])).toBeCloseTo(0.636, 10)
    expect(pressionKpa(lune.atmosphere.pression[0])).toBeCloseTo(3e-13, 20)
  })

  it('une plage n’est pas une valeur : null, et une valeur n’est pas une plage', () => {
    expect(temperatureCelsius(terre.temperatures[1])).toBeNull()
    expect(plageCelsius(terre.temperatures[0])).toBeNull()
    expect(pressionKpa(mars.atmosphere.pression[1])).toBeNull()
  })
})

describe('données indisponibles : null, jamais zéro', () => {
  it('la Lune n’a pas de durée du jour, de distance au Soleil, de lunes ni de moyenne de température', () => {
    expect(estIndisponible(lune.dureeJour)).toBe(true)
    expect(dureeJourHeures(lune)).toBeNull()
    expect(dureeJourEnJoursTerrestres(lune)).toBeNull()
    expect(distanceSoleilKm(lune)).toBeNull()
    expect(nombreLunes(lune)).toBeNull()
    expect(valeurSource(lune.temperatures[0])).toBeNull()
    expect(temperatureCelsius(lune.temperatures[0])).toBeNull()
  })

  it('un dérivé qui dépend d’un trou est null', () => {
    const sansGravite = { ...lune, graviteSurface: lune.dureeJour }
    expect(graviteRelative(sansGravite)).toBeNull()
  })
})

describe('grandeurs dérivées (valeurs de contrôle à la main)', () => {
  it('gravité relative : 1,62 ÷ 9,82 et 3,73 ÷ 9,82', () => {
    expect(graviteRelative(terre)).toBe(1)
    expect(graviteRelative(lune)).toBeCloseTo(0.16497, 5)
    expect(graviteRelative(mars)).toBeCloseTo(0.37984, 5)
  })

  it('durée du jour de Mars : 24,6597 h = 1,02749 jour terrestre', () => {
    expect(dureeJourHeures(mars)).toBe(24.6597)
    expect(dureeJourEnJoursTerrestres(mars)).toBeCloseTo(1.027488, 6)
    expect(dureeJourEnJoursTerrestres(terre)).toBe(1)
  })

  it('période orbitale de Mars : 686,980 j ÷ 365,25 = 1,880849 an', () => {
    expect(periodeOrbitaleAnnees(mars)).toBeCloseTo(1.880849, 6)
  })

  it('distance au Soleil de Mars : 227,956 millions de km', () => {
    expect(distanceSoleilKm(mars)).toBeCloseTo(227_956_000, 3)
  })

  it('masse de la Terre : 5,9722 × 10²⁴ kg', () => {
    expect(masseKg(terre)).toBeCloseTo(5.9722e24, -15)
  })

  it('diamètres : moyen = 2 × rayon moyen, équatorial = 2 × rayon équatorial', () => {
    expect(diametreMoyenKm(terre)).toBe(12_742)
    expect(diametreEquatorialKm(terre)).toBeCloseTo(12_756.274, 6)
    expect(diametreMoyenKm(mars)).toBe(6779)
  })

  it('rapport de diamètre : Mars ÷ Terre = 6779 ÷ 12742, Lune ÷ Terre = 3474,8 ÷ 12742', () => {
    expect(rapportDiametre(mars)).toBeCloseTo(0.532, 3)
    expect(rapportDiametre(lune)).toBeCloseTo(0.27270, 5)
  })

  it('nombre de lunes : Terre 1, Mars 2', () => {
    expect(nombreLunes(terre)).toBe(1)
    expect(nombreLunes(mars)).toBe(2)
  })
})

describe('concordance avec constants.ts (diamètres de même nature : moyens)', () => {
  it('Terre : 2 × rayon moyen volumétrique = DIAMETRE_TERRE_KM', () => {
    expect(
      diametreMoyenKm(terre),
      `astres.json (${diametreMoyenKm(terre)} km) et constants.ts (${DIAMETRE_TERRE_KM} km) ne concordent plus`
    ).toBe(DIAMETRE_TERRE_KM)
  })

  it('Lune : écart de moins de 1 km avec DIAMETRE_LUNE_KM, signalé dans la sortie', () => {
    const nasa = diametreMoyenKm(lune)!
    const ecart = Math.abs(nasa - DIAMETRE_LUNE_KM)
    if (ecart > 0) {
      console.warn(
        `[astres] Lune : ${nasa} km (NASA, 2 × rayon moyen volumétrique) contre ${DIAMETRE_LUNE_KM} km ` +
          `(constants.ts) : écart de ${ecart.toFixed(1)} km, toléré sous ${TOLERANCE_CONCORDANCE_DIAMETRE_KM} km.`
      )
    }
    expect(
      ecart,
      `Diamètre de la Lune : astres.json ${nasa} km et constants.ts ${DIAMETRE_LUNE_KM} km diffèrent de ${ecart} km ` +
        `(maximum toléré : ${TOLERANCE_CONCORDANCE_DIAMETRE_KM} km). Mettre à jour l'un des deux.`
    ).toBeLessThan(TOLERANCE_CONCORDANCE_DIAMETRE_KM)
  })

  it('le test compare des grandeurs de même nature : jamais équatorial contre moyen', () => {
    // 2 × rayon équatorial de la Terre (12 756,3 km) s'écarte de 14 km de DIAMETRE_TERRE_KM : ce n'est pas la même grandeur.
    expect(Math.abs(diametreEquatorialKm(terre)! - DIAMETRE_TERRE_KM)).toBeGreaterThan(
      TOLERANCE_CONCORDANCE_DIAMETRE_KM
    )
  })
})

describe('destinations.json et astres.json', () => {
  it('chaque astre cité par une destination existe dans astres.json', () => {
    const ciblees = validerDestinations(destinations).filter((d) => d.astre !== undefined)
    expect(ciblees.map((d) => d.astre)).toEqual(['lune', 'mars'])
    for (const d of ciblees) expect(trouverAstre(d.astre!), `astre « ${d.astre} » de ${d.id}`).toBeDefined()
  })

  it('astres.json a au moins Terre, Lune, Mars', () => {
    expect(ASTRES.map((a) => a.id)).toEqual(expect.arrayContaining(['terre', 'lune', 'mars']))
  })
})
