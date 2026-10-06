/** Aides communes aux validateurs de données JSON (écrits à la main, sans dépendance). */

export const PROFILS = ['enfant', 'adulte'] as const

/** Un texte existe en version enfant et en version adulte. */
export type TexteProfil = Record<(typeof PROFILS)[number], string>

/** Erreur de validation : liste tous les problèmes trouvés, pas seulement le premier. */
export class ErreurValidation extends Error {
  readonly problemes: readonly string[]

  constructor(source: string, problemes: readonly string[]) {
    super(`${source} invalide :\n- ${problemes.join('\n- ')}`)
    this.name = 'ErreurValidation'
    this.problemes = problemes
  }
}

export function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)
}

/** Vérifie qu'une valeur est un texte non vide en version enfant et adulte. */
export function verifierTexteProfil(
  valeur: unknown,
  chemin: string,
  problemes: string[]
): valeur is TexteProfil {
  if (!estObjet(valeur)) {
    problemes.push(`${chemin} : objet { enfant, adulte } attendu`)
    return false
  }
  let valide = true
  for (const profil of PROFILS) {
    const texte = valeur[profil]
    if (typeof texte !== 'string' || texte.trim() === '') {
      problemes.push(`${chemin}.${profil} : texte non vide attendu`)
      valide = false
    }
  }
  return valide
}
