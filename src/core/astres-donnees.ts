import donneesBrutes from '../data/astres.json'
import {
  HEURES_PAR_JOUR,
  JOURS_PAR_AN,
  KELVIN_ZERO_CELSIUS,
  KG_PAR_1E24_KG,
  KM_PAR_1E6_KM,
  PASCAL_PAR_BAR,
  PASCAL_PAR_KPA,
  PASCAL_PAR_MILLIBAR,
} from './constants'
import type { CategorieInfo } from './niveaux'
import {
  validerAstres,
  type Astre,
  type Composition,
  type Mesure,
  type MesureIndisponible,
  type MesurePlage,
  type MesureSimple,
  type UniteAstre,
} from './validation-astres'

/** Identifiant de la Terre : la référence des comparaisons (gravité relative, etc.). */
export const ID_ASTRE_REFERENCE = 'terre'

export const ASTRES: readonly Astre[] = validerAstres(donneesBrutes)

/** L'astre portant cet identifiant, ou undefined. */
export function trouverAstre(id: string): Astre | undefined {
  return ASTRES.find((a) => a.id === id)
}

/** L'astre portant cet identifiant ; lève une erreur s'il n'existe pas. */
export function astreParId(id: string): Astre {
  const astre = trouverAstre(id)
  if (!astre) throw new RangeError(`Astre inconnu : « ${id} »`)
  return astre
}

// --- Accès par catégorie d'information --------------------------------------

export interface DonneesTemperature {
  temperatures: Astre['temperatures']
}
export interface DonneesGravite {
  graviteSurface: Mesure
}
export interface DonneesAtmosphere {
  pression: Astre['atmosphere']['pression']
  composition: Composition
}
export interface DonneesOrbite {
  periodeOrbitale: Mesure
  distanceSoleil: Mesure
  dureeJour: Mesure
  rotationSiderale: Mesure
  nombreLunes: Mesure
}

/** Catégories d'information qui ont des données d'astre (les autres viennent d'ailleurs). */
export interface DonneesParCategorie {
  temperature: DonneesTemperature
  gravite: DonneesGravite
  atmosphere: DonneesAtmosphere
  orbite: DonneesOrbite
}
export type CategorieAstre = keyof DonneesParCategorie & CategorieInfo

export const CATEGORIES_ASTRE: readonly CategorieAstre[] = [
  'temperature',
  'gravite',
  'atmosphere',
  'orbite',
]

/** Les données d'un astre pour une catégorie d'information. */
export function donneesCategorie<C extends CategorieAstre>(
  astre: Astre,
  categorie: C
): DonneesParCategorie[C] {
  return donneesDeCategorie(astre, categorie) as DonneesParCategorie[C]
}

function donneesDeCategorie(astre: Astre, categorie: CategorieAstre): DonneesParCategorie[CategorieAstre] {
  switch (categorie) {
    case 'temperature':
      return { temperatures: astre.temperatures }
    case 'gravite':
      return { graviteSurface: astre.graviteSurface }
    case 'atmosphere':
      return { pression: astre.atmosphere.pression, composition: astre.atmosphere.composition }
    case 'orbite':
      return {
        periodeOrbitale: astre.periodeOrbitale,
        distanceSoleil: astre.distanceSoleil,
        dureeJour: astre.dureeJour,
        rotationSiderale: astre.rotationSiderale,
        nombreLunes: astre.nombreLunes,
      }
  }
}

// --- Lecture d'une mesure ---------------------------------------------------

export function estIndisponible(mesure: Mesure): mesure is MesureIndisponible {
  return 'indisponible' in mesure
}

export function estPlage(mesure: Mesure): mesure is MesurePlage {
  return 'min' in mesure
}

/**
 * Valeur d'une mesure dans l'unité de la source ; null si elle est indisponible
 * ou si c'est une plage. Jamais 0 à la place d'un trou.
 */
export function valeurSource(mesure: Mesure): number | null {
  return estIndisponible(mesure) || estPlage(mesure) ? null : (mesure as MesureSimple).valeur
}

// --- Conversions (la donnée reste dans l'unité de la source) ------------------

export function kelvinEnCelsius(kelvin: number): number {
  return kelvin - KELVIN_ZERO_CELSIUS
}

export function barEnKpa(bar: number): number {
  return (bar * PASCAL_PAR_BAR) / PASCAL_PAR_KPA
}

export function millibarEnKpa(millibar: number): number {
  return (millibar * PASCAL_PAR_MILLIBAR) / PASCAL_PAR_KPA
}

const CONVERSIONS_VERS_KPA: Partial<Record<UniteAstre, (valeur: number) => number>> = {
  bar: barEnKpa,
  mb: millibarEnKpa,
}

function convertir(
  mesure: Mesure,
  conversions: Partial<Record<UniteAstre, (valeur: number) => number>>
): number | null {
  const valeur = valeurSource(mesure)
  if (valeur === null) return null
  const conversion = conversions[(mesure as MesureSimple).unite]
  return conversion ? conversion(valeur) : null
}

/** Valeur d'une mesure de température en °C ; null si indisponible ou plage. */
export function temperatureCelsius(mesure: Mesure): number | null {
  return convertir(mesure, { K: kelvinEnCelsius })
}

/** Bornes d'une plage de température en °C ; null si ce n'est pas une plage disponible. */
export function plageCelsius(mesure: Mesure): { min: number; max: number } | null {
  if (estIndisponible(mesure) || !estPlage(mesure) || mesure.unite !== 'K') return null
  return { min: kelvinEnCelsius(mesure.min), max: kelvinEnCelsius(mesure.max) }
}

/** Pression en kPa ; null si indisponible ou plage. */
export function pressionKpa(mesure: Mesure): number | null {
  return convertir(mesure, CONVERSIONS_VERS_KPA)
}

// --- Grandeurs dérivées (null quand la donnée manque) -------------------------

function enUnite(mesure: Mesure, unite: UniteAstre, facteur: number): number | null {
  const valeur = valeurSource(mesure)
  return valeur === null || (mesure as MesureSimple).unite !== unite ? null : valeur * facteur
}

export function rayonMoyenKm(astre: Astre): number | null {
  return enUnite(astre.rayonMoyen, 'km', 1)
}

export function rayonEquatorialKm(astre: Astre): number | null {
  return enUnite(astre.rayonEquatorial, 'km', 1)
}

/** Diamètre moyen volumétrique : deux fois le rayon moyen volumétrique. */
export function diametreMoyenKm(astre: Astre): number | null {
  const rayon = rayonMoyenKm(astre)
  return rayon === null ? null : 2 * rayon
}

/** Diamètre équatorial : deux fois le rayon équatorial. À ne pas comparer au diamètre moyen. */
export function diametreEquatorialKm(astre: Astre): number | null {
  const rayon = rayonEquatorialKm(astre)
  return rayon === null ? null : 2 * rayon
}

export function masseKg(astre: Astre): number | null {
  return enUnite(astre.masse, '1e24 kg', KG_PAR_1E24_KG)
}

export function graviteMs2(astre: Astre): number | null {
  return enUnite(astre.graviteSurface, 'm/s2', 1)
}

/** Gravité de surface divisée par celle de la référence (la Terre par défaut). */
export function graviteRelative(astre: Astre, reference: Astre = astreParId(ID_ASTRE_REFERENCE)): number | null {
  const g = graviteMs2(astre)
  const gReference = graviteMs2(reference)
  return g === null || gReference === null ? null : g / gReference
}

/** Rapport des diamètres moyens : astre ÷ référence (la Terre par défaut). */
export function rapportDiametre(astre: Astre, reference: Astre = astreParId(ID_ASTRE_REFERENCE)): number | null {
  const d = diametreMoyenKm(astre)
  const dReference = diametreMoyenKm(reference)
  return d === null || dReference === null ? null : d / dReference
}

export function dureeJourHeures(astre: Astre): number | null {
  return enUnite(astre.dureeJour, 'h', 1)
}

/** Durée du jour en jours terrestres (jours de HEURES_PAR_JOUR heures). */
export function dureeJourEnJoursTerrestres(astre: Astre): number | null {
  const heures = dureeJourHeures(astre)
  return heures === null ? null : heures / HEURES_PAR_JOUR
}

export function periodeOrbitaleJours(astre: Astre): number | null {
  return enUnite(astre.periodeOrbitale, 'j', 1)
}

/** Période orbitale en années terrestres (années juliennes de JOURS_PAR_AN jours). */
export function periodeOrbitaleAnnees(astre: Astre): number | null {
  const jours = periodeOrbitaleJours(astre)
  return jours === null ? null : jours / JOURS_PAR_AN
}

export function distanceSoleilKm(astre: Astre): number | null {
  return enUnite(astre.distanceSoleil, '1e6 km', KM_PAR_1E6_KM)
}

export function nombreLunes(astre: Astre): number | null {
  return enUnite(astre.nombreLunes, 'nombre', 1)
}
