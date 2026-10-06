/**
 * Génération du ciel étoilé : positions, couleurs, tailles et phases de
 * scintillement. Pur et déterministe (graine fixe) pour être testable.
 */

export interface CielEtoile {
  /** x, y, z par étoile */
  positions: Float32Array
  /** r, g, b (0..1) par étoile */
  couleurs: Float32Array
  /** taille en pixels CSS, avant ratio de pixels */
  tailles: Float32Array
  /** phase du scintillement (0..2π) */
  phases: Float32Array
}

/** Générateur pseudo-aléatoire mulberry32 : rapide et reproductible. */
export function creerAleatoire(graine: number): () => number {
  let a = graine >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Teintes d'étoiles, du bleuté au rougeâtre, avec leur fréquence relative.
 * Les étoiles blanches et jaunâtres dominent, comme à l'œil nu.
 */
export const TEINTES_ETOILES: readonly {
  couleur: readonly [number, number, number]
  poids: number
}[] = [
  { couleur: [0.66, 0.76, 1.0], poids: 2 }, // bleuté
  { couleur: [0.82, 0.88, 1.0], poids: 3 }, // blanc bleuté
  { couleur: [1.0, 1.0, 1.0], poids: 5 }, // blanc
  { couleur: [1.0, 0.94, 0.82], poids: 4 }, // jaunâtre
  { couleur: [1.0, 0.82, 0.62], poids: 2 }, // orangé
  { couleur: [1.0, 0.68, 0.55], poids: 1 }, // rougeâtre
]

const POIDS_TOTAL = TEINTES_ETOILES.reduce((s, t) => s + t.poids, 0)

function choisirTeinte(tirage: number): readonly [number, number, number] {
  let cumul = tirage * POIDS_TOTAL
  for (const teinte of TEINTES_ETOILES) {
    cumul -= teinte.poids
    if (cumul < 0) return teinte.couleur
  }
  return TEINTES_ETOILES[TEINTES_ETOILES.length - 1].couleur
}

/**
 * Répartit `nombre` étoiles uniformément sur une sphère de rayon `rayon`
 * centrée sur l'origine.
 */
export function genererEtoiles(
  nombre: number,
  rayon: number,
  graine = 1
): CielEtoile {
  const n = Math.max(0, Math.floor(nombre))
  const aleatoire = creerAleatoire(graine)
  const positions = new Float32Array(n * 3)
  const couleurs = new Float32Array(n * 3)
  const tailles = new Float32Array(n)
  const phases = new Float32Array(n)

  for (let i = 0; i < n; i++) {
    // Point uniforme sur la sphère.
    const z = aleatoire() * 2 - 1
    const angle = aleatoire() * Math.PI * 2
    const r = Math.sqrt(1 - z * z)
    positions[i * 3] = r * Math.cos(angle) * rayon
    positions[i * 3 + 1] = r * Math.sin(angle) * rayon
    positions[i * 3 + 2] = z * rayon

    // Beaucoup d'étoiles faibles, peu de brillantes.
    const eclat = Math.pow(aleatoire(), 3)
    const intensite = 0.35 + 0.65 * eclat
    const [cr, cg, cb] = choisirTeinte(aleatoire())
    couleurs[i * 3] = cr * intensite
    couleurs[i * 3 + 1] = cg * intensite
    couleurs[i * 3 + 2] = cb * intensite

    tailles[i] = 1 + 2 * eclat
    phases[i] = aleatoire() * Math.PI * 2
  }

  return { positions, couleurs, tailles, phases }
}
