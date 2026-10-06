/**
 * Fonctions pures du HUD : positions des réticules, animation des valeurs,
 * états des fenêtres, jauges, boussole. Aucune dépendance au DOM.
 */
import { decalageCouche, type Vecteur } from './parallaxe'

// ---------------------------------------------------------------------------
// Couche « tête » : légère inertie et décalage de quelques pixels
// ---------------------------------------------------------------------------

/** Décalage maximal de la couche « tête », en pixels. */
export const DECALAGE_TETE_MAX_PX = 4

/** Durée de l'inertie (transition CSS) de la couche « tête ». */
export const INERTIE_TETE_MS = 380

/** Décalage de la couche « tête » : suit le regard, nul en mouvement réduit. */
export function decalageTete(
  regard: Vecteur,
  mouvementReduit: boolean
): Vecteur {
  return decalageCouche(regard, 1, mouvementReduit, DECALAGE_TETE_MAX_PX)
}

// ---------------------------------------------------------------------------
// Couche « monde » : réticules ancrés à des coordonnées relatives au conteneur
// ---------------------------------------------------------------------------

export interface Boite {
  largeur: number
  hauteur: number
}

/** Ancre en fractions du conteneur : (0, 0) en haut à gauche, (1, 1) en bas à droite. */
export type Ancre = Vecteur

export interface PositionReticule {
  /** Position en pixels dans le conteneur, ramenée dans le cadre si besoin. */
  x: number
  y: number
  /** Vrai si l'ancre est visible ; sinon le réticule reste au bord. */
  dansLeChamp: boolean
  /** Direction du centre vers l'ancre, en degrés (0 = droite, sens horaire). */
  angleDeg: number
  /** Côté où placer l'étiquette pour qu'elle reste dans le conteneur. */
  cote: 'gauche' | 'droite'
}

/** Au-delà de cette fraction de la largeur, l'étiquette passe à gauche. */
const SEUIL_COTE_ETIQUETTE = 0.62

function fini(valeur: number): boolean {
  return Number.isFinite(valeur)
}

function limiter(valeur: number, min: number, max: number): number {
  return Math.min(Math.max(valeur, min), Math.max(min, max))
}

/**
 * Place un réticule. L'ancre est relative au conteneur, jamais en pixels
 * écrits en dur : la vitre peut changer de taille à tout moment.
 */
export function positionReticule(
  ancre: Ancre,
  boite: Boite,
  marge = 0
): PositionReticule {
  const largeur = fini(boite.largeur) ? Math.max(0, boite.largeur) : 0
  const hauteur = fini(boite.hauteur) ? Math.max(0, boite.hauteur) : 0
  const valide = fini(ancre.x) && fini(ancre.y)
  const fx = valide ? ancre.x : 0.5
  const fy = valide ? ancre.y : 0.5
  const dansLeChamp = valide && fx >= 0 && fx <= 1 && fy >= 0 && fy <= 1
  const angle = (Math.atan2(fy - 0.5, fx - 0.5) * 180) / Math.PI
  return {
    x: limiter(fx * largeur, marge, largeur - marge),
    y: limiter(fy * hauteur, marge, hauteur - marge),
    dansLeChamp,
    angleDeg: angle === 0 ? 0 : Math.round(angle * 10) / 10,
    cote: fx > SEUIL_COTE_ETIQUETTE ? 'gauche' : 'droite',
  }
}

export interface TailleFenetre {
  largeur: number
  hauteur: number
}

/**
 * Place une fenêtre : son centre est sur l'ancre (fractions du conteneur),
 * puis elle est ramenée à l'intérieur du cadre, marge comprise.
 */
export function positionFenetre(
  ancre: Ancre,
  boite: Boite,
  taille: TailleFenetre,
  marge = 0
): Vecteur {
  const valide = fini(ancre.x) && fini(ancre.y)
  const cx = (valide ? ancre.x : 0.5) * Math.max(0, boite.largeur)
  const cy = (valide ? ancre.y : 0.5) * Math.max(0, boite.hauteur)
  const x = limiter(
    cx - taille.largeur / 2,
    marge,
    boite.largeur - taille.largeur - marge
  )
  const y = limiter(
    cy - taille.hauteur / 2,
    marge,
    boite.hauteur - taille.hauteur - marge
  )
  return { x: x === 0 ? 0 : x, y: y === 0 ? 0 : y }
}

// ---------------------------------------------------------------------------
// Animation des valeurs (compteur)
// ---------------------------------------------------------------------------

/** Durée du décompte d'une valeur. */
export const DUREE_COMPTEUR_MS = 700

/** Avancement de 0 à 1 ; une durée nulle ou invalide donne 1. */
export function progression(ecoule: number, duree: number): number {
  if (!fini(ecoule) || !fini(duree) || duree <= 0) return 1
  return Math.min(1, Math.max(0, ecoule / duree))
}

/** Ralentit vers la fin (cubique). */
export function facilite(t: number): number {
  const u = 1 - Math.min(1, Math.max(0, t))
  return 1 - u * u * u
}

/** Valeur affichée à un instant du décompte ; directe en mouvement réduit. */
export function valeurAnimee(
  depart: number,
  cible: number,
  ecoule: number,
  duree = DUREE_COMPTEUR_MS,
  mouvementReduit = false
): number {
  if (mouvementReduit || !fini(depart)) return cible
  if (!fini(cible)) return depart
  const t = progression(ecoule, duree)
  return t >= 1 ? cible : depart + (cible - depart) * facilite(t)
}

// ---------------------------------------------------------------------------
// Fenêtres « système » : états et durées
// ---------------------------------------------------------------------------

export type EtatFenetre = 'fermee' | 'ouverture' | 'ouverte' | 'fermeture'
export type EvenementFenetre = 'ouvrir' | 'fermer' | 'fin'

/** Ouverture : le cadre se trace, puis le contenu apparaît (300 à 500 ms). */
export const DUREE_OUVERTURE_MS = 400
/** Fermeture un peu plus vive que l'ouverture. */
export const DUREE_FERMETURE_MS = 260
/** Mouvement réduit : un simple fondu. */
export const DUREE_FONDU_MS = 150

export function dureeOuverture(mouvementReduit: boolean): number {
  return mouvementReduit ? DUREE_FONDU_MS : DUREE_OUVERTURE_MS
}

export function dureeFermeture(mouvementReduit: boolean): number {
  return mouvementReduit ? DUREE_FONDU_MS : DUREE_FERMETURE_MS
}

/** Transition d'état d'une fenêtre ; un événement sans effet laisse l'état. */
export function etatSuivant(
  etat: EtatFenetre,
  evenement: EvenementFenetre
): EtatFenetre {
  switch (evenement) {
    case 'ouvrir':
      return etat === 'fermee' || etat === 'fermeture' ? 'ouverture' : etat
    case 'fermer':
      return etat === 'ouverte' || etat === 'ouverture' ? 'fermeture' : etat
    case 'fin':
      if (etat === 'ouverture') return 'ouverte'
      if (etat === 'fermeture') return 'fermee'
      return etat
  }
}

/** La fenêtre existe dans la page tant qu'elle n'est pas fermée. */
export function fenetreVisible(etat: EtatFenetre): boolean {
  return etat !== 'fermee'
}

// ---------------------------------------------------------------------------
// Séquence d'allumage
// ---------------------------------------------------------------------------

/** Délai entre l'allumage de deux éléments. */
export const PAS_ALLUMAGE_MS = 140

/** Nombre d'éléments allumés après `ecoule` ms ; tous d'un coup en mouvement réduit. */
export function elementsAllumes(
  ecoule: number,
  total: number,
  pas = PAS_ALLUMAGE_MS,
  mouvementReduit = false
): number {
  if (total <= 0) return 0
  if (mouvementReduit || !fini(ecoule) || pas <= 0) return total
  return Math.min(total, Math.max(0, Math.floor(ecoule / pas) + 1))
}

// ---------------------------------------------------------------------------
// Jauges
// ---------------------------------------------------------------------------

/** Fraction de 0 à 1 d'une valeur entre `min` et `max`. */
export function fractionJauge(valeur: number, min = 0, max = 1): number {
  if (!fini(valeur) || !fini(min) || !fini(max) || max <= min) return 0
  return Math.min(1, Math.max(0, (valeur - min) / (max - min)))
}

/** Un seuil bas signale un niveau à surveiller. */
export function niveauJauge(
  fraction: number,
  seuilBas = 0.25
): 'normal' | 'bas' {
  return fraction < seuilBas ? 'bas' : 'normal'
}

export interface ArcJauge {
  /** Longueur de l'arc complet, pour stroke-dasharray. */
  longueur: number
  /** Longueur remplie. */
  rempli: number
  /** Rotation (en degrés) qui place le début de l'arc, ouverture en bas. */
  rotationDeg: number
}

/** Ouverture de l'arc, en degrés (le bas reste ouvert). */
export const OUVERTURE_ARC_DEG = 100

/** Mesures d'un arc de jauge de rayon donné, en unités du dessin. */
export function arcJauge(fraction: number, rayon: number): ArcJauge {
  const f = Math.min(1, Math.max(0, fini(fraction) ? fraction : 0))
  const balayage = 360 - OUVERTURE_ARC_DEG
  const longueur = (balayage / 360) * 2 * Math.PI * Math.max(0, rayon)
  return {
    longueur,
    rempli: longueur * f,
    rotationDeg: 90 + OUVERTURE_ARC_DEG / 2,
  }
}

// ---------------------------------------------------------------------------
// Boussole
// ---------------------------------------------------------------------------

const POINTS_CARDINAUX = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'] as const

/** Ramène un cap dans [0, 360[. */
export function normaliserCap(cap: number): number {
  if (!fini(cap)) return 0
  const reste = ((cap % 360) + 360) % 360
  return reste === 360 ? 0 : reste
}

/** Point cardinal en français (N, NE, E, SE, S, SO, O, NO). */
export function pointCardinal(cap: number): string {
  const index = Math.round(normaliserCap(cap) / 45) % POINTS_CARDINAUX.length
  return POINTS_CARDINAUX[index]
}

export interface Graduation {
  /** Écart avec le cap, en degrés. */
  ecart: number
  /** Position de 0 à 1 sur la bande visible. */
  position: number
  /** Cap de la graduation, de 0 à 359. */
  cap: number
  majeure: boolean
}

/** Graduations visibles de part et d'autre du cap (une majeure tous les 3 pas). */
export function graduationsBoussole(
  cap: number,
  demiChamp = 45,
  pas = 5
): Graduation[] {
  if (demiChamp <= 0 || pas <= 0) return []
  const centre = normaliserCap(cap)
  const premier = Math.ceil((centre - demiChamp) / pas) * pas
  const resultat: Graduation[] = []
  for (let valeur = premier; valeur <= centre + demiChamp; valeur += pas) {
    const ecart = valeur - centre
    resultat.push({
      ecart,
      position: (ecart + demiChamp) / (2 * demiChamp),
      cap: normaliserCap(valeur),
      majeure: Math.round(valeur / pas) % 3 === 0,
    })
  }
  return resultat
}

// ---------------------------------------------------------------------------
// Masquer l'interface (touche H)
// ---------------------------------------------------------------------------

export const TOUCHE_MASQUER = 'h'

interface ToucheEntree {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
  repeat?: boolean
  /** Nom de balise de l'élément visé. */
  cible?: string
}

const CIBLES_SAISIE = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/** La touche H masque le HUD, sauf pendant une saisie ou avec un raccourci. */
export function estToucheMasquer(entree: ToucheEntree): boolean {
  if (entree.key.toLowerCase() !== TOUCHE_MASQUER) return false
  if (entree.ctrlKey || entree.metaKey || entree.altKey || entree.repeat)
    return false
  return !CIBLES_SAISIE.has((entree.cible ?? '').toUpperCase())
}
