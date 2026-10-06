/**
 * Catégories d'information du HUD. Le niveau de connaissance (1 à 4) donnera
 * une liste de catégories visibles ; chaque panneau accepte `categoriesVisibles`
 * (tout est visible si la prop est absente).
 */
export const CATEGORIES = [
  'distance',
  'vitesse',
  'temps',
  'lumiere',
  'radio',
  'temperature',
  'gravite',
  'atmosphere',
  'orbite',
] as const

export type Categorie = (typeof CATEGORIES)[number]

export function estVisible(
  categoriesVisibles: readonly Categorie[] | undefined,
  categorie: Categorie
): boolean {
  return (
    categoriesVisibles === undefined || categoriesVisibles.includes(categorie)
  )
}
