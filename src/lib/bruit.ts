/**
 * Bruit procédural doux, maison : aucune dépendance. Sert aux valeurs et aux
 * courbes décoratives du HUD (oscilloscope, spectre, radar, onde du copilote).
 * Tout est déterministe : même entrée, même sortie.
 */

/** Nombre pseudo-aléatoire dans [0, 1[ pour un entier et une graine. */
export function hash(entier: number, graine = 0): number {
  let h = (entier | 0) ^ Math.imul(graine | 0, 0x9e3779b1)
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

/** Interpolation en quintique : dérivées nulles aux nœuds, donc aucun à-coup. */
function lisser(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10)
}

/** Bruit de valeurs lissé, dans [0, 1] ; continu en x. */
export function bruit1D(x: number, graine = 0): number {
  if (!Number.isFinite(x)) return 0.5
  const i = Math.floor(x)
  const f = x - i
  return hash(i, graine) + (hash(i + 1, graine) - hash(i, graine)) * lisser(f)
}

/** Somme d'octaves : plus de détail, toujours dans [0, 1]. */
export function bruitFractal(x: number, graine = 0, octaves = 3): number {
  let somme = 0
  let amplitude = 1
  let total = 0
  let frequence = 1
  for (let o = 0; o < octaves; o++) {
    somme += bruit1D(x * frequence, graine + o * 101) * amplitude
    total += amplitude
    amplitude /= 2
    frequence *= 2
  }
  return total > 0 ? somme / total : 0.5
}

/** Bruit 2D lissé dans [0, 1] : coin à coin, interpolation bilinéaire lissée. */
export function bruit2D(x: number, y: number, graine = 0): number {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return 0.5
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = lisser(x - ix)
  const fy = lisser(y - iy)
  const coin = (dx: number, dy: number): number =>
    hash((ix + dx) * 73856093 + (iy + dy) * 19349663, graine)
  const haut = coin(0, 0) + (coin(1, 0) - coin(0, 0)) * fx
  const bas = coin(0, 1) + (coin(1, 1) - coin(0, 1)) * fx
  return haut + (bas - haut) * fy
}
