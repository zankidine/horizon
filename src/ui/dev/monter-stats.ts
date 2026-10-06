/**
 * Monte le petit panneau de statistiques du HUD (coût du moteur par image,
 * nombre de canvas, nombre de nœuds DOM). Importé seulement sous
 * `import.meta.env.DEV` : il n'entre pas dans la build de production.
 */
import { mount } from 'svelte'
import PanneauStats from './PanneauStats.svelte'

let monte = false

export function monterPanneauStats(): void {
  if (monte || typeof document === 'undefined') return
  monte = true
  mount(PanneauStats, { target: document.body })
}
