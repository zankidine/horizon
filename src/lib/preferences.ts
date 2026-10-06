/**
 * Préférences du joueur : sérialisation et lecture tolérante.
 * Fonctions pures : le stockage lui-même est géré par le store.
 */

export const PROFILS = ['enfant', 'adulte'] as const
export type Profil = (typeof PROFILS)[number]

export const AMBIANCES_COCKPIT = ['aventure', 'cinema'] as const
export type AmbianceCockpit = (typeof AMBIANCES_COCKPIT)[number]

export const LONGUEUR_MAX_COPILOTE = 20
export const VERSION_PREFERENCES = 1

export interface Preferences {
  profil: Profil
  ambianceCockpit: AmbianceCockpit
  copilote: string
}

export const PREFERENCES_PAR_DEFAUT: Readonly<Preferences> = {
  profil: 'enfant',
  ambianceCockpit: 'aventure',
  copilote: '',
}

/**
 * Nettoie un nom de copilote : espaces normalisés, caractères de contrôle
 * retirés, longueur limitée. Renvoie null s'il ne reste rien d'utilisable.
 */
export function nettoyerNomCopilote(nom: unknown): string | null {
  if (typeof nom !== 'string') return null
  const propre = [
    ...nom
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  ]
    .slice(0, LONGUEUR_MAX_COPILOTE)
    .join('')
    .trim()
  return propre.length > 0 ? propre : null
}

function estDans<T extends string>(
  valeurs: readonly T[],
  valeur: unknown
): valeur is T {
  return (
    typeof valeur === 'string' &&
    (valeurs as readonly string[]).includes(valeur)
  )
}

export function serialiserPreferences(preferences: Preferences): string {
  return JSON.stringify({ version: VERSION_PREFERENCES, ...preferences })
}

/**
 * Lit des préférences enregistrées. Chaque valeur invalide est ignorée
 * séparément : les autres restent utilisées. Un contenu illisible donne {}.
 */
export function lirePreferences(
  brut: string | null | undefined
): Partial<Preferences> {
  if (typeof brut !== 'string') return {}
  let donnees: unknown
  try {
    donnees = JSON.parse(brut)
  } catch {
    return {}
  }
  if (
    typeof donnees !== 'object' ||
    donnees === null ||
    Array.isArray(donnees)
  ) {
    return {}
  }
  const objet = donnees as Record<string, unknown>
  if (objet.version !== VERSION_PREFERENCES) return {}

  const resultat: Partial<Preferences> = {}
  if (estDans(PROFILS, objet.profil)) resultat.profil = objet.profil
  if (estDans(AMBIANCES_COCKPIT, objet.ambianceCockpit)) {
    resultat.ambianceCockpit = objet.ambianceCockpit
  }
  const copilote = nettoyerNomCopilote(objet.copilote)
  if (copilote !== null) resultat.copilote = copilote
  return resultat
}
