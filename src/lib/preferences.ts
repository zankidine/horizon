/**
 * Préférences du joueur : sérialisation et lecture tolérante.
 * Fonctions pures : le stockage lui-même est géré par le store.
 */

import { estNiveau, NIVEAU_PAR_DEFAUT, type Niveau } from '../core/niveaux'

/** Anciens profils (version 1 des préférences), gardés pour la migration. */
export const PROFILS = ['enfant', 'adulte'] as const
export type Profil = (typeof PROFILS)[number]

/** Niveau de départ d'un ancien profil : enfant → 1 (Découverte), adulte → 3 (Navigateur). */
export const NIVEAU_DEPUIS_PROFIL: Readonly<Record<Profil, Niveau>> = {
  enfant: 1,
  adulte: 3,
}

export const AMBIANCES_COCKPIT = ['aventure', 'cinema'] as const
export type AmbianceCockpit = (typeof AMBIANCES_COCKPIT)[number]

export const LONGUEUR_MAX_COPILOTE = 20
export const VERSION_PREFERENCES = 2

export interface Preferences {
  niveau: Niveau
  ambianceCockpit: AmbianceCockpit
  copilote: string
}

export const PREFERENCES_PAR_DEFAUT: Readonly<Preferences> = {
  niveau: NIVEAU_PAR_DEFAUT,
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
 * La version 1 est migrée (enfant → niveau 1, adulte → niveau 3).
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
  // Version 1 : un profil enfant/adulte à la place du niveau. Version inconnue : ignorée.
  if (objet.version !== VERSION_PREFERENCES && objet.version !== 1) return {}

  const resultat: Partial<Preferences> = {}
  if (objet.version === 1) {
    if (estDans(PROFILS, objet.profil)) resultat.niveau = NIVEAU_DEPUIS_PROFIL[objet.profil]
  } else if (estNiveau(objet.niveau)) {
    resultat.niveau = objet.niveau
  }
  if (estDans(AMBIANCES_COCKPIT, objet.ambianceCockpit)) {
    resultat.ambianceCockpit = objet.ambianceCockpit
  }
  const copilote = nettoyerNomCopilote(objet.copilote)
  if (copilote !== null) resultat.copilote = copilote
  return resultat
}
