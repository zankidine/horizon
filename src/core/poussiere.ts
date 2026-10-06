import { creerAleatoire } from './etoiles'

/**
 * Grains de poussière spatiale proches. Leurs positions sont des fractions
 * de la boîte qui entoure le vaisseau (0 à 1 sur chaque axe) : le rendu les
 * recycle en les faisant boucler dans cette boîte. Pur et déterministe.
 */
export interface Poussiere {
  /** x, y, z de chaque grain, dans [0, 1[. */
  positions: Float32Array
  /** Taille relative de chaque grain, de 0,5 à 1,5. */
  tailles: Float32Array
  /** Phase aléatoire de chaque grain, dans [0, 1[ (éclat, variété). */
  phases: Float32Array
}

export function genererPoussiere(nombre: number, graine = 7): Poussiere {
  const n = Math.max(0, Math.floor(nombre))
  const aleatoire = creerAleatoire(graine)
  const positions = new Float32Array(n * 3)
  const tailles = new Float32Array(n)
  const phases = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    positions[i * 3] = aleatoire()
    positions[i * 3 + 1] = aleatoire()
    positions[i * 3 + 2] = aleatoire()
    tailles[i] = 0.5 + aleatoire()
    phases[i] = aleatoire()
  }
  return { positions, tailles, phases }
}
