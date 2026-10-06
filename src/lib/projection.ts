/**
 * Où tombe une direction sur l'écran ? Sert à placer le réticule sur la cible.
 * Repère du vaisseau : x vers la droite, y vers le haut, la caméra regarde vers −z.
 */
export type Direction = readonly [number, number, number]

export interface PointEcran {
  /** Fractions de l'écran : (0, 0) en haut à gauche, (1, 1) en bas à droite. */
  x: number
  y: number
  /** Vrai si la direction est devant la caméra. */
  devant: boolean
}

/**
 * Projection en perspective. `fovVerticalDeg` est le champ vertical de la
 * caméra, `aspect` le rapport largeur / hauteur de l'écran. Une direction
 * derrière la caméra est envoyée loin hors de l'écran, du côté où elle se
 * trouve, pour que le réticule reste au bord et indique le sens à tourner.
 */
export function projeterSurEcran(
  direction: Direction,
  fovVerticalDeg: number,
  aspect: number
): PointEcran {
  const [dx, dy, dz] = direction
  const tanDemi = Math.tan((fovVerticalDeg * Math.PI) / 360)
  if (!(tanDemi > 0) || !(aspect > 0) || ![dx, dy, dz].every(Number.isFinite)) {
    return { x: 0.5, y: 0.5, devant: false }
  }
  if (dz < 0) {
    const ndcX = dx / -dz / (tanDemi * aspect)
    const ndcY = dy / -dz / tanDemi
    return { x: 0.5 + 0.5 * ndcX, y: 0.5 - 0.5 * ndcY, devant: true }
  }
  const norme = Math.hypot(dx, dy) || 1
  const sortie = 4
  return {
    x: 0.5 + (dx / norme) * sortie,
    y: 0.5 - (dy / norme) * sortie,
    devant: false,
  }
}
