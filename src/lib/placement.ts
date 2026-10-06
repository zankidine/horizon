/**
 * Place un petit panneau (outil de développement) dans un endroit libre de
 * l'écran : jamais sur un élément cliquable. Fonction pure : le code
 * d'interface lui passe les rectangles des éléments cliquables.
 */
export interface Rect {
  left: number
  top: number
  right: number
  bottom: number
}

export interface Taille {
  largeur: number
  hauteur: number
}

export function intersecte(a: Rect, b: Rect, marge = 0): boolean {
  return (
    a.left < b.right + marge &&
    a.right > b.left - marge &&
    a.top < b.bottom + marge &&
    a.bottom > b.top - marge
  )
}

/**
 * Premier emplacement libre pour un panneau de cette taille : d'abord les
 * quatre coins (bas gauche en premier), puis une grille balayée du bas vers le
 * haut. Renvoie null si l'écran n'a aucune place libre.
 */
export function trouverPlace(
  taille: Taille,
  viewport: Taille,
  obstacles: readonly Rect[],
  marge = 8,
  pas = 16
): { x: number; y: number } | null {
  const l = Math.max(0, viewport.largeur - taille.largeur - marge)
  const h = Math.max(0, viewport.hauteur - taille.hauteur - marge)
  if (viewport.largeur < taille.largeur || viewport.hauteur < taille.hauteur) {
    return null
  }
  const candidats: { x: number; y: number }[] = [
    { x: marge, y: h },
    { x: l, y: h },
    { x: l, y: marge },
    { x: marge, y: marge },
  ]
  for (let y = h; y >= marge; y -= pas) {
    for (let x = marge; x <= l; x += pas) candidats.push({ x, y })
  }
  return (
    candidats.find(({ x, y }) => {
      const rect = {
        left: x,
        top: y,
        right: x + taille.largeur,
        bottom: y + taille.hauteur,
      }
      return !obstacles.some((o) => intersecte(rect, o, 4))
    }) ?? null
  )
}
