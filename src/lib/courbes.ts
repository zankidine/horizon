/**
 * Courbes des graphes animés, en fonctions pures : elles donnent des nombres,
 * le canvas les dessine. `t` est le temps en secondes (figé en mouvement réduit).
 * Ces courbes sont décoratives : le HUD les marque « simulation ».
 */
import { bruitFractal } from './bruit'

const DEUX_PI = 2 * Math.PI

function borner(valeur: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, valeur))
}

/** Oscilloscope : `n` valeurs dans [-1, 1], mélange de sinus et de bruit lent. */
export function oscilloscope(
  n: number,
  t: number,
  graine = 0,
  amplitude = 1
): number[] {
  const nombre = Math.max(0, Math.floor(n))
  const a = borner(amplitude, 0, 1)
  return Array.from({ length: nombre }, (_, i) => {
    const x = nombre > 1 ? i / (nombre - 1) : 0
    const sinus = Math.sin(DEUX_PI * (3 * x + 0.35 * t)) * 0.6
    const souffle = (bruitFractal(x * 5 + t * 0.6, graine) * 2 - 1) * 0.4
    return borner((sinus + souffle) * a, -1, 1)
  })
}

/** Spectre : `n` barres dans [0, 1], plus hautes dans les graves, qui respirent. */
export function spectre(n: number, t: number, graine = 0): number[] {
  const nombre = Math.max(0, Math.floor(n))
  return Array.from({ length: nombre }, (_, i) => {
    const x = nombre > 1 ? i / (nombre - 1) : 0
    const pente = 0.25 + 0.75 * Math.pow(1 - x, 1.4)
    const vie = bruitFractal(i * 0.9 + t * 1.4, graine + 7, 2)
    return borner(pente * (0.35 + 0.65 * vie), 0, 1)
  })
}

/**
 * Onde du copilote : `n` valeurs dans [-1, 1]. Quand le copilote parle,
 * l'amplitude suit un bruit rapide ; sinon la ligne respire à peine.
 */
export function onde(
  n: number,
  t: number,
  parle: boolean,
  graine = 0
): number[] {
  const nombre = Math.max(0, Math.floor(n))
  return Array.from({ length: nombre }, (_, i) => {
    const x = nombre > 1 ? i / (nombre - 1) : 0
    const bord = Math.sin(Math.PI * x)
    const enveloppe = parle
      ? 0.25 + 0.75 * bruitFractal(x * 4 + t * 3.2, graine + 3)
      : 0.06 + 0.04 * Math.sin(DEUX_PI * (x + 0.2 * t))
    const porteuse = Math.sin(DEUX_PI * (14 * x + 2.4 * t))
    return borner(bord * enveloppe * porteuse, -1, 1)
  })
}

/** Valeur d'ambiance autour d'une base, qui dérive doucement (jauges fictives). */
export function deriveDouce(
  base: number,
  t: number,
  graine: number,
  amplitude = 0.04
): number {
  return borner(
    base + (bruitFractal(t * 0.25, graine) * 2 - 1) * amplitude,
    0,
    1
  )
}
