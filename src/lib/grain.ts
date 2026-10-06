/**
 * Grain très fin du verre : une petite texture générée une fois (le canvas la
 * transforme en data URL), répétée en CSS à faible opacité. Fonction pure.
 */
import { hash } from './bruit'

/** Côté de la tuile, en pixels. */
export const COTE_GRAIN = 96

/** Pixels RGBA (blanc de transparence variable) d'une tuile carrée de `cote` pixels. */
export function genererGrain(cote = COTE_GRAIN, graine = 1): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(cote * cote * 4)
  for (let i = 0; i < cote * cote; i++) {
    const clair = hash(i, graine) > 0.5
    pixels[i * 4] = clair ? 255 : 0
    pixels[i * 4 + 1] = clair ? 255 : 0
    pixels[i * 4 + 2] = clair ? 255 : 0
    pixels[i * 4 + 3] = Math.floor(hash(i, graine + 17) * 255)
  }
  return pixels
}
