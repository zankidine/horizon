/**
 * Monte le panneau de réglage du vaisseau sur la page. Importé seulement
 * sous `import.meta.env.DEV` (voir creerSceneHublot) : il n'entre pas dans la
 * build de production.
 */
import { mount } from 'svelte'
import PanneauVaisseau from './PanneauVaisseau.svelte'

let monte = false

export function monterPanneauVaisseau(): void {
  if (monte || typeof document === 'undefined') return
  monte = true
  mount(PanneauVaisseau, { target: document.body })
}
