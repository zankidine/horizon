/**
 * Dessins canvas des graphes du HUD. Les nombres viennent de fonctions pures
 * (src/lib) ; ici, seulement du tracé. Les graphes sont décoratifs ou
 * redondants avec du texte : le composant les cache aux lecteurs d'écran.
 */
import { ASTRES } from '../../core/astres'
import { directionCap, type EtatVaisseau } from '../../core/vaisseau'
import { DISTANCE_TERRE_LUNE_KM } from '../../core/constants'
import { onde, oscilloscope, spectre } from '../../lib/courbes'
import { graduationsBoussole, pointCardinal } from '../../lib/hud'
import {
  angleBalayage,
  azimut,
  intensiteBlip,
  pointsDecoratifs,
  rayonRadar,
} from '../../lib/radar'
import { capBoussoleDeg, cadrerTrajet, directionAstre } from '../../lib/vol'
import type { CouleursHud } from './moteur.svelte.ts'

type Ctx = CanvasRenderingContext2D

function trait(ctx: Ctx, c: CouleursHud, alpha = 1, facteur = 1): void {
  ctx.strokeStyle = c.ligne
  ctx.lineWidth = c.epaisseur * facteur
  ctx.globalAlpha = alpha
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
}

function grille(
  ctx: Ctx,
  l: number,
  h: number,
  c: CouleursHud,
  colonnes = 8,
  lignes = 4
): void {
  trait(ctx, c, 0.18, 0.7)
  ctx.beginPath()
  for (let i = 1; i < colonnes; i++) {
    const x = (l * i) / colonnes
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
  }
  for (let j = 1; j < lignes; j++) {
    const y = (h * j) / lignes
    ctx.moveTo(0, y)
    ctx.lineTo(l, y)
  }
  ctx.stroke()
  ctx.globalAlpha = 1
}

/** Oscilloscope du réacteur (simulation). */
export function dessinOscilloscope(
  ctx: Ctx,
  t: number,
  l: number,
  h: number,
  c: CouleursHud
): void {
  grille(ctx, l, h, c)
  const valeurs = oscilloscope(Math.max(2, Math.ceil(l / 3)), t, 1, 0.9)
  trait(ctx, c, 1, 1.4)
  ctx.shadowColor = c.ligne
  ctx.shadowBlur = 0
  ctx.beginPath()
  valeurs.forEach((v, i) => {
    const x = (i / (valeurs.length - 1)) * l
    const y = h / 2 - v * (h / 2 - 2)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.stroke()
  ctx.globalAlpha = 1
}

/** Spectre (simulation). */
export function dessinSpectre(
  ctx: Ctx,
  t: number,
  l: number,
  h: number,
  c: CouleursHud
): void {
  const nombre = Math.max(4, Math.floor(l / 8))
  const barres = spectre(nombre, t, 2)
  const pas = l / nombre
  ctx.fillStyle = c.ligne
  barres.forEach((v, i) => {
    const hauteur = Math.max(1, v * (h - 2))
    ctx.globalAlpha = 0.45 + 0.55 * v
    ctx.fillRect(i * pas + pas * 0.15, h - hauteur, pas * 0.7, hauteur)
  })
  ctx.globalAlpha = 1
}

/** Forme d'onde du copilote : plus ample quand il « parle ». */
export function dessinOnde(parle: () => boolean) {
  return (ctx: Ctx, t: number, l: number, h: number, c: CouleursHud): void => {
    const valeurs = onde(Math.max(2, Math.ceil(l / 2)), t, parle(), 3)
    trait(ctx, c, 1, 1.4)
    ctx.beginPath()
    valeurs.forEach((v, i) => {
      const x = (i / (valeurs.length - 1)) * l
      const y = h / 2 - v * (h / 2 - 1)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
    ctx.globalAlpha = 1
  }
}

/** Ruban de cap : graduations qui défilent, repère au centre. */
export function dessinRuban(etat: () => EtatVaisseau) {
  return (ctx: Ctx, _t: number, l: number, h: number, c: CouleursHud): void => {
    const cap = capBoussoleDeg(etat().lacet)
    const demiChamp = 45
    ctx.fillStyle = c.texte
    ctx.font = `600 ${Math.max(11, Math.min(13, h * 0.34))}px ${c.police}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    for (const g of graduationsBoussole(cap, demiChamp, 5)) {
      const x = g.position * l
      const majeure = g.majeure
      trait(ctx, c, majeure ? 1 : 0.6, 1)
      ctx.beginPath()
      ctx.moveTo(x, h)
      ctx.lineTo(x, h - (majeure ? h * 0.38 : h * 0.2))
      ctx.stroke()
      if (majeure) {
        ctx.globalAlpha = 0.9
        const texte =
          g.cap % 45 === 0
            ? pointCardinal(g.cap)
            : String(Math.round(g.cap)).padStart(3, '0')
        ctx.fillText(texte, x, h - h * 0.5)
      }
    }
    ctx.globalAlpha = 1
    // Repère central.
    ctx.fillStyle = c.accent
    ctx.beginPath()
    ctx.moveTo(l / 2 - 4, 0)
    ctx.lineTo(l / 2 + 4, 0)
    ctx.lineTo(l / 2, 7)
    ctx.closePath()
    ctx.fill()
  }
}

/** Distance maximale du radar : un peu au-delà de la Lune. */
const DISTANCE_MAX_RADAR_KM = DISTANCE_TERRE_LUNE_KM * 1.5

/** Radar circulaire : la Lune et la Terre sont à leur vraie direction ; les autres points sont décoratifs. */
export function dessinRadar(etat: () => EtatVaisseau) {
  return (ctx: Ctx, t: number, l: number, h: number, c: CouleursHud): void => {
    const rayon = Math.min(l, h) / 2 - 3
    const cx = l / 2
    const cy = h / 2
    trait(ctx, c, 0.35, 0.8)
    for (const f of [1, 0.66, 0.33]) {
      ctx.beginPath()
      ctx.arc(cx, cy, rayon * f, 0, 2 * Math.PI)
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.moveTo(cx - rayon, cy)
    ctx.lineTo(cx + rayon, cy)
    ctx.moveTo(cx, cy - rayon)
    ctx.lineTo(cx, cy + rayon)
    ctx.stroke()

    // Balayage : une ligne et sa traînée (angle 0 = devant = haut).
    const balayage = angleBalayage(t)
    ctx.fillStyle = c.ligne
    for (let k = 0; k < 18; k++) {
      const a = balayage - k * 0.045 - Math.PI / 2
      ctx.globalAlpha = 0.22 * (1 - k / 18)
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, rayon, a - 0.05, a)
      ctx.closePath()
      ctx.fill()
    }
    trait(ctx, c, 0.9, 1.2)
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.sin(balayage) * rayon, cy - Math.cos(balayage) * rayon)
    ctx.stroke()

    // Points décoratifs (simulation).
    ctx.fillStyle = c.ligne
    for (const p of pointsDecoratifs(6, t, 5)) {
      ctx.globalAlpha = 0.15 + 0.6 * intensiteBlip(p.angle, balayage)
      ctx.beginPath()
      ctx.arc(
        cx + Math.sin(p.angle) * p.rayon * rayon,
        cy - Math.cos(p.angle) * p.rayon * rayon,
        1.6,
        0,
        2 * Math.PI
      )
      ctx.fill()
    }

    // Astres réels : direction et distance calculées par le jeu.
    const e = etat()
    ctx.font = `700 ${Math.max(11, rayon * 0.2)}px ${c.police}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const [id, lettre] of [
      ['lune', 'L'],
      ['terre', 'T'],
    ] as const) {
      const direction = directionAstre(e, id)
      const dist = Math.hypot(
        ASTRES[id].position[0] - e.position[0],
        ASTRES[id].position[1] - e.position[1],
        ASTRES[id].position[2] - e.position[2]
      )
      const r = rayonRadar(dist, DISTANCE_MAX_RADAR_KM) * rayon
      const a = azimut(direction)
      const x = cx + Math.sin(a) * r
      const y = cy - Math.cos(a) * r
      ctx.globalAlpha = 1
      ctx.fillStyle = c.accent
      ctx.beginPath()
      ctx.arc(x, y, 3.2, 0, 2 * Math.PI)
      ctx.fill()
      ctx.fillStyle = c.texte
      ctx.fillText(lettre, x + 8, y - 7)
    }
    ctx.globalAlpha = 1
  }
}

/** Carte du trajet vue du dessus : Terre, Lune, route, vaisseau orienté (astres hors échelle). */
export function dessinGps(etat: () => EtatVaisseau) {
  return (ctx: Ctx, t: number, l: number, h: number, c: CouleursHud): void => {
    const e = etat()
    const cadre = cadrerTrajet(
      [ASTRES.terre.position, ASTRES.lune.position, e.position],
      l,
      h,
      14
    )
    const px = (p: readonly [number, number, number]): [number, number] => [
      cadre.origineX + p[0] * cadre.echelle,
      cadre.origineY + p[2] * cadre.echelle,
    ]
    const [tx, ty] = px(ASTRES.terre.position)
    const [lx, ly] = px(ASTRES.lune.position)
    const [vx, vy] = px(e.position)

    // Route Terre-Lune, tiretée (les tirets avancent doucement).
    trait(ctx, c, 0.55, 0.9)
    ctx.setLineDash([5, 5])
    ctx.lineDashOffset = -t * 6
    ctx.beginPath()
    ctx.moveTo(tx, ty)
    ctx.lineTo(lx, ly)
    ctx.stroke()
    // Chemin du vaisseau vers la Lune.
    trait(ctx, c, 0.9, 1.1)
    ctx.beginPath()
    ctx.moveTo(vx, vy)
    ctx.lineTo(lx, ly)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = c.ligne
    for (const [x, y, r] of [
      [tx, ty, 6],
      [lx, ly, 3.5],
    ] as const) {
      ctx.globalAlpha = 0.9
      ctx.beginPath()
      ctx.arc(x, y, r, 0, 2 * Math.PI)
      ctx.fill()
    }

    // Vaisseau : triangle dans le sens du cap (vue du dessus : x, z).
    const d = directionCap(e)
    const angle = Math.atan2(d[2], d[0])
    ctx.save()
    ctx.translate(vx, vy)
    ctx.rotate(angle)
    ctx.globalAlpha = 1
    ctx.fillStyle = c.accent
    ctx.beginPath()
    ctx.moveTo(7, 0)
    ctx.lineTo(-5, 4.5)
    ctx.lineTo(-5, -4.5)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    ctx.globalAlpha = 1
  }
}
