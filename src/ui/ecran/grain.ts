/**
 * Petite texture de grain, générée une seule fois (canvas puis URL de données)
 * puis répétée en CSS à très faible opacité : aucun filtre plein écran.
 */
import { COTE_GRAIN, genererGrain } from '../../lib/grain'

let url: string | undefined

export function urlGrain(): string {
  if (url !== undefined) return url
  url = ''
  if (typeof document === 'undefined') return url
  try {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = COTE_GRAIN
    const ctx = canvas.getContext('2d')
    if (!ctx) return url
    const pixels = genererGrain(COTE_GRAIN, 1)
    ctx.putImageData(
      new ImageData(new Uint8ClampedArray(pixels), COTE_GRAIN, COTE_GRAIN),
      0,
      0
    )
    url = canvas.toDataURL('image/png')
  } catch {
    // Sans canvas, pas de grain : le reste du verre suffit.
  }
  return url
}
