/**
 * Moteur des graphes animés du HUD : une seule boucle requestAnimationFrame
 * pour tous les canvas. Il respecte le budget (src/lib/budget.ts) :
 *  - images par seconde selon la qualité (haut 30, moyen 20, bas 10) ;
 *  - au plus 6 canvas animés en même temps ;
 *  - pause quand l'onglet est caché, que le HUD est masqué (H) ou que le
 *    panneau est replié : plus aucune image n'est demandée au navigateur ;
 *  - mouvement réduit : les graphes sont dessinés une fois, figés.
 * Le HUD ne doit jamais dégrader la 3D : le moteur ne dessine que ce qui se voit.
 */
import type { NiveauQualite } from '../../core/qualite'
import {
  IMAGES_PAR_SECONDE,
  imageDue,
  moyenne,
  moyenneGlissante,
  ratioPixelsCanvas,
  selectionnerAnimes,
} from '../../lib/budget'

/** Couleurs et traits lus dans les tokens du thème (--hud-*). */
export interface CouleursHud {
  ligne: string
  texte: string
  alerte: string
  accent: string
  /** Épaisseur de trait en pixels CSS. */
  epaisseur: number
  /** Police des chiffres. */
  police: string
}

export const COULEURS_PAR_DEFAUT: CouleursHud = {
  ligne: '#7be8ff',
  texte: '#eefcff',
  alerte: '#ff6b5e',
  accent: '#ffffff',
  epaisseur: 1,
  police: 'monospace',
}

/** Un graphe : ce qu'il dessine et quand il est visible. */
export interface Graphe {
  canvas: HTMLCanvasElement
  /** Plus petit = plus important quand plus de 6 graphes sont actifs. */
  priorite: number
  /** Dessine une image. Les coordonnées sont en pixels CSS ; `t` en secondes. */
  dessiner(
    ctx: CanvasRenderingContext2D,
    t: number,
    largeur: number,
    hauteur: number,
    couleurs: CouleursHud
  ): void
  /** Vrai si le graphe est visible (panneau déplié, HUD affiché). */
  visible(): boolean
}

interface Inscrit {
  graphe: Graphe
  ctx: CanvasRenderingContext2D
  largeur: number
  hauteur: number
  observateur: ResizeObserver | undefined
}

/** Instant fixe des graphes figés (mouvement réduit) : une image agréable, sans mouvement. */
const T_FIGE_S = 2.5

export interface StatsMoteur {
  /** Coût moyen d'une image du moteur, en ms (mesuré seulement en dev). */
  coutMs: number
  canvasInscrits: number
  canvasAnimes: number
}

export class MoteurGraphes {
  niveau: NiveauQualite = 'moyen'
  mouvementReduit = false
  couleurs: CouleursHud = COULEURS_PAR_DEFAUT
  stats = $state<StatsMoteur>({ coutMs: 0, canvasInscrits: 0, canvasAnimes: 0 })

  readonly #inscrits = new Set<Inscrit>()
  #image: number | undefined
  #dernierMs: number | null = null
  #couts: number[] = []

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => this.reveiller())
    }
  }

  /** Ajoute un graphe ; renvoie la fonction qui le retire. */
  inscrire(graphe: Graphe): () => void {
    const ctx = graphe.canvas.getContext('2d')
    if (!ctx) return () => {}
    const inscrit: Inscrit = {
      graphe,
      ctx,
      largeur: 0,
      hauteur: 0,
      observateur: undefined,
    }
    this.#inscrits.add(inscrit)
    this.stats.canvasInscrits = this.#inscrits.size

    if (typeof ResizeObserver !== 'undefined') {
      inscrit.observateur = new ResizeObserver(() => {
        this.#redimensionner(inscrit)
        this.#dessinerUn(inscrit, this.#temps())
      })
      inscrit.observateur.observe(graphe.canvas)
    }
    this.#redimensionner(inscrit)
    this.reveiller()

    return () => {
      inscrit.observateur?.disconnect()
      this.#inscrits.delete(inscrit)
      this.stats.canvasInscrits = this.#inscrits.size
      if (this.#inscrits.size === 0) this.#arreter()
    }
  }

  /**
   * À appeler quand une condition de pause change (panneau replié, HUD masqué,
   * qualité, mouvement réduit) : redessine ce qui se voit, puis relance la boucle si besoin.
   */
  reveiller(): void {
    const visibles = this.#visibles()
    for (const inscrit of visibles) this.#dessinerUn(inscrit, this.#temps())
    if (this.#aAnimer(visibles) && this.#image === undefined) {
      this.#dernierMs = null
      this.#image = requestAnimationFrame(this.#boucle)
    }
    this.stats.canvasAnimes = this.#aAnimer(visibles)
      ? selectionnerAnimes(
          visibles.map((i) => ({ i, priorite: i.graphe.priorite }))
        ).length
      : 0
  }

  /** Relit les couleurs du thème (changement d'ambiance). */
  lireCouleurs(): void {
    if (typeof document === 'undefined') return
    const style = getComputedStyle(document.documentElement)
    const lire = (nom: string, defaut: string): string =>
      style.getPropertyValue(nom).trim() || defaut
    this.couleurs = {
      ligne: lire('--hud-ligne', COULEURS_PAR_DEFAUT.ligne),
      texte: lire('--hud-texte', COULEURS_PAR_DEFAUT.texte),
      alerte: lire('--hud-alerte', COULEURS_PAR_DEFAUT.alerte),
      accent: lire('--hud-accent', COULEURS_PAR_DEFAUT.accent),
      epaisseur: Number.parseFloat(lire('--hud-epaisseur', '1')) || 1,
      police: lire('--hud-font-chiffres', COULEURS_PAR_DEFAUT.police),
    }
    this.reveiller()
  }

  #temps(): number {
    return this.mouvementReduit ? T_FIGE_S : performance.now() / 1000
  }

  #visibles(): Inscrit[] {
    if (typeof document !== 'undefined' && document.hidden) return []
    return [...this.#inscrits].filter((i) => i.graphe.visible())
  }

  #aAnimer(visibles: readonly Inscrit[]): boolean {
    return !this.mouvementReduit && visibles.length > 0
  }

  #boucle = (maintenant: number): void => {
    this.#image = undefined
    const visibles = this.#visibles()
    if (!this.#aAnimer(visibles)) return // en pause : plus d'image demandée

    const fps = IMAGES_PAR_SECONDE[this.niveau]
    if (imageDue(maintenant, this.#dernierMs, fps)) {
      const animes = selectionnerAnimes(
        visibles.map((inscrit) => ({
          inscrit,
          priorite: inscrit.graphe.priorite,
        }))
      )
      const debut = import.meta.env.DEV ? performance.now() : 0
      for (const { inscrit } of animes)
        this.#dessinerUn(inscrit, maintenant / 1000)
      this.#dernierMs = maintenant
      if (import.meta.env.DEV) {
        this.#couts = moyenneGlissante(this.#couts, performance.now() - debut)
        this.stats.coutMs = moyenne(this.#couts)
        this.stats.canvasAnimes = animes.length
      }
    }
    this.#image = requestAnimationFrame(this.#boucle)
  }

  #redimensionner(inscrit: Inscrit): void {
    const { canvas } = inscrit.graphe
    const largeur = canvas.clientWidth
    const hauteur = canvas.clientHeight
    const ratio = ratioPixelsCanvas(window.devicePixelRatio)
    inscrit.largeur = largeur
    inscrit.hauteur = hauteur
    canvas.width = Math.max(1, Math.round(largeur * ratio))
    canvas.height = Math.max(1, Math.round(hauteur * ratio))
    inscrit.ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  }

  #dessinerUn(inscrit: Inscrit, t: number): void {
    if (inscrit.largeur <= 0 || inscrit.hauteur <= 0) return
    if (!inscrit.graphe.visible()) return
    inscrit.ctx.clearRect(0, 0, inscrit.largeur, inscrit.hauteur)
    inscrit.graphe.dessiner(
      inscrit.ctx,
      t,
      inscrit.largeur,
      inscrit.hauteur,
      this.couleurs
    )
  }

  #arreter(): void {
    if (this.#image !== undefined) cancelAnimationFrame(this.#image)
    this.#image = undefined
  }

  /** Nombre de canvas inscrits (pour les statistiques de développement). */
  get nombreInscrits(): number {
    return this.#inscrits.size
  }
}

export const moteur = new MoteurGraphes()
