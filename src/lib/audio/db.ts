/**
 * Maths du son : décibels, gains, enveloppes. Fonctions pures, sans Web Audio.
 */

/** Convertit des décibels (0 dB = gain 1) en gain linéaire. −Infinity donne 0. */
export function dbEnGain(db: number): number {
  return db === -Infinity ? 0 : 10 ** (db / 20)
}

/** Convertit un gain linéaire en décibels ; un gain nul ou négatif donne −Infinity. */
export function gainEnDb(gain: number): number {
  return gain <= 0 ? -Infinity : 20 * Math.log10(gain)
}

export function borner(valeur: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, valeur))
}

/**
 * Courbe d'un curseur de volume (0 à 1) vers un gain : quadratique, car
 * l'oreille entend en échelle logarithmique. 0 donne le silence, 1 donne 1.
 */
export function volumeEnGain(volume: number): number {
  const v = borner(Number.isFinite(volume) ? volume : 0, 0, 1)
  return v * v
}

/** Attaque minimale d'une enveloppe : en dessous, le démarrage claque. */
export const ATTAQUE_MIN_S = 0.01

/** Relâchement minimal d'une enveloppe : en dessous, l'arrêt claque. */
export const RELACHEMENT_MIN_S = 0.02

/** Enveloppe ADSR simplifiée : durées en secondes, soutien en fraction du pic (0 à 1). */
export interface Enveloppe {
  attaque: number
  decroissance: number
  soutien: number
  relachement: number
}

export interface PointEnveloppe {
  /** Secondes depuis le début. */
  t: number
  /** Gain. */
  v: number
}

/**
 * Points d'une enveloppe : silence, pic, soutien, fin au silence. Attaque et
 * relâchement ne descendent jamais sous un minimum (pas de claquement).
 */
export function pointsEnveloppe(env: Enveloppe, pic: number, dureeSoutienS: number): PointEnveloppe[] {
  const attaque = Math.max(ATTAQUE_MIN_S, env.attaque)
  const decroissance = Math.max(0, env.decroissance)
  const relachement = Math.max(RELACHEMENT_MIN_S, env.relachement)
  const niveau = pic * borner(env.soutien, 0, 1)
  const finDecroissance = attaque + decroissance
  const finSoutien = finDecroissance + Math.max(0, dureeSoutienS)
  return [
    { t: 0, v: 0 },
    { t: attaque, v: pic },
    { t: finDecroissance, v: niveau },
    { t: finSoutien, v: niveau },
    { t: finSoutien + relachement, v: 0 },
  ]
}

/** Durée totale d'une enveloppe, en secondes. */
export function dureeEnveloppe(points: readonly PointEnveloppe[]): number {
  return points[points.length - 1].t
}
