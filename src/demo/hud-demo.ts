/**
 * Page de démonstration du kit HUD, servie en mode dev seulement :
 * http://localhost:5173/hud-demo.html
 * Elle montre tous les composants dans les deux ambiances et les deux niveaux
 * de qualité (haut : flou d'arrière-plan ; bas : sans flou), plus le contraste
 * de chaque couleur de texte. Elle n'est pas dans le build.
 */
import { mount } from 'svelte'
import '../ui/theme/polices.css'
import '../ui/theme/tokens.css'
import HudDemo from './HudDemo.svelte'

document.body.style.cssText = 'margin:0;background:#0b0e11;color:#e3e7ec'
mount(HudDemo, { target: document.getElementById('demo')! })
