/**
 * Profondeur par décalage des couches du poste, selon le pointeur (bureau)
 * ou l'orientation de l'appareil (mobile). Fonctions pures.
 */

export interface Vecteur {
  x: number
  y: number
}

/** Décalage maximal de la couche la plus proche, en pixels. */
export const DECALAGE_MAX_PX = 6

/** Inclinaison (en degrés) qui donne le décalage maximal. */
export const ANGLE_MAX_DEG = 20
/** Angle d'un téléphone tenu confortablement, face à soi (neutre). */
export const ANGLE_NEUTRE_DEG = 50

export const AUCUN_DECALAGE: Readonly<Vecteur> = { x: 0, y: 0 }

function limiter(valeur: number): number {
  if (!Number.isFinite(valeur)) return 0
  return Math.max(-1, Math.min(1, valeur))
}

/** Évite -0 et le bruit d'arrondi : 0,1 px suffit pour un décalage. */
function arrondir(valeur: number): number {
  const arrondi = Math.round(valeur * 10) / 10
  return arrondi === 0 ? 0 : arrondi
}

/** Position du pointeur dans la zone, de -1 (bord) à 1 (bord), 0 au centre. */
export function normaliserPointeur(
  x: number,
  y: number,
  largeur: number,
  hauteur: number
): Vecteur {
  if (!(largeur > 0) || !(hauteur > 0)) return { ...AUCUN_DECALAGE }
  return {
    x: limiter((x / largeur) * 2 - 1),
    y: limiter((y / hauteur) * 2 - 1),
  }
}

/**
 * Orientation de l'appareil : gamma (gauche-droite) et beta (avant-arrière),
 * en degrés, comme l'événement deviceorientation. Valeurs manquantes : 0.
 */
export function normaliserOrientation(
  gamma: number | null | undefined,
  beta: number | null | undefined
): Vecteur {
  const g = typeof gamma === 'number' ? gamma : 0
  const b = typeof beta === 'number' ? beta : ANGLE_NEUTRE_DEG
  return {
    x: limiter(g / ANGLE_MAX_DEG),
    y: limiter((b - ANGLE_NEUTRE_DEG) / ANGLE_MAX_DEG),
  }
}

/**
 * Décalage d'une couche. `profondeur` va de 0 (fond, ne bouge pas) à 1
 * (premier plan, bouge le plus). Les couches proches vont à l'opposé du
 * regard, ce qui donne l'effet de relief. Aucun décalage en mouvement réduit.
 */
export function decalageCouche(
  entree: Vecteur,
  profondeur: number,
  mouvementReduit = false,
  maxPx = DECALAGE_MAX_PX
): Vecteur {
  if (mouvementReduit) return { ...AUCUN_DECALAGE }
  const p = limiter(profondeur < 0 ? 0 : profondeur)
  return {
    x: arrondir(-limiter(entree.x) * p * maxPx),
    y: arrondir(-limiter(entree.y) * p * maxPx),
  }
}
