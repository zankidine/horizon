/**
 * Page de démonstration de l'écran de navigation, servie en mode dev :
 * http://localhost:5173/navigation-demo.html
 * Elle n'est pas dans le build (la configuration de Vite ne change pas).
 */
import { mount } from 'svelte'
import '../app.css'
import EcranNavigation from '../ui/navigation/EcranNavigation.svelte'
import type { Cap } from '../ui/navigation/navigation.svelte'
import { appStore, type Profile } from '../lib/stores/app.svelte'

const racine = document.getElementById('demo')!

// Barre de la démo : change le profil (valeur du store) et affiche le dernier cap.
const barre = document.createElement('div')
barre.style.cssText =
  'display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 16px;background:#0b0e11;color:#e3e7ec;font:14px system-ui'
const journal = document.createElement('code')

for (const profil of ['enfant', 'adulte'] as Profile[]) {
  const bouton = document.createElement('button')
  bouton.type = 'button'
  bouton.textContent = `Profil ${profil}`
  bouton.style.cssText = 'min-height:44px;min-width:44px;padding:0 12px;font:inherit'
  bouton.addEventListener('click', () => {
    appStore.profile = profil
  })
  barre.append(bouton)
}
barre.append(journal)

const zone = document.createElement('div')
racine.append(barre, zone)

function surCapConfirme(cap: Cap): void {
  journal.textContent = `Cap confirmé : ${cap.destination.id}, ${cap.vitesse}, ${Math.round(cap.trajet.dureeSecondes)} s`
}

mount(EcranNavigation, { target: zone, props: { onConfirmer: surCapConfirme } })
