import { describe, expect, it } from 'vitest'
import { intersecte, trouverPlace, type Rect } from './placement'

const viewport = { largeur: 400, hauteur: 300 }
const taille = { largeur: 100, hauteur: 40 }

function libre(place: { x: number; y: number } | null, obstacles: Rect[]) {
  expect(place).not.toBeNull()
  const rect = {
    left: place!.x,
    top: place!.y,
    right: place!.x + taille.largeur,
    bottom: place!.y + taille.hauteur,
  }
  expect(obstacles.some((o) => intersecte(rect, o))).toBe(false)
}

describe('intersecte', () => {
  it('détecte le recouvrement et la marge', () => {
    const a = { left: 0, top: 0, right: 10, bottom: 10 }
    expect(intersecte(a, { left: 5, top: 5, right: 15, bottom: 15 })).toBe(true)
    expect(intersecte(a, { left: 12, top: 0, right: 20, bottom: 10 })).toBe(
      false
    )
    expect(intersecte(a, { left: 12, top: 0, right: 20, bottom: 10 }, 3)).toBe(
      true
    )
  })
})

describe('trouverPlace', () => {
  it('choisit le coin bas gauche quand tout est libre', () => {
    expect(trouverPlace(taille, viewport, [])).toEqual({ x: 8, y: 252 })
  })

  it('évite un bouton dans le coin bas gauche', () => {
    const obstacles = [{ left: 0, top: 250, right: 150, bottom: 300 }]
    const place = trouverPlace(taille, viewport, obstacles)
    libre(place, obstacles)
    expect(place).toEqual({ x: 292, y: 252 })
  })

  it('trouve une place au milieu quand les bords sont pris', () => {
    const obstacles = [
      { left: 0, top: 240, right: 400, bottom: 300 },
      { left: 0, top: 0, right: 400, bottom: 60 },
    ]
    const place = trouverPlace(taille, viewport, obstacles)
    libre(place, obstacles)
  })

  it('renvoie null plutôt que de recouvrir', () => {
    const obstacles = [{ left: 0, top: 0, right: 400, bottom: 300 }]
    expect(trouverPlace(taille, viewport, obstacles)).toBeNull()
  })

  it('renvoie null si le panneau ne tient pas dans l’écran', () => {
    expect(trouverPlace({ largeur: 500, hauteur: 40 }, viewport, [])).toBeNull()
  })
})
