import { dbEnGain } from './db'

/**
 * Réglages du son. Toutes ces valeurs sont des choix de jeu (prudents pour un
 * enfant de 7 ans) ; aucune n'a pu être mesurée sur un vrai haut-parleur.
 */

/** Nombre maximal de sons simultanés (les continus comptent). Le suivant est ignoré. */
export const POLYPHONIE_MAX = 8

/** Clé localStorage des réglages audio (distincte des préférences de la Préparation). */
export const CLE_AUDIO = 'horizon.audio'
export const VERSION_AUDIO = 1

/** Plafond du signal final après limiteur, en dBFS (environ 0,5 en gain linéaire). */
export const PLAFOND_SORTIE_DB = -6
export const PLAFOND_SORTIE = dbEnGain(PLAFOND_SORTIE_DB)

/** Gain fixe du bus principal, en dB, avant le compresseur. */
export const GAIN_MAITRE_DB = -3

/** Compresseur-limiteur : seuil bas, rapport élevé, attaque très courte. */
export const COMPRESSEUR = { seuilDb: -20, genouDb: 12, rapport: 12, attaqueS: 0.003, relachementS: 0.25 } as const

/** Filtre passe-bas final : rien au-dessus, donc aucun son aigu fort. */
export const FILTRE_SORTIE_HZ = 3000

/** Fréquence maximale d'un son tonal du catalogue (test). */
export const FREQUENCE_TONALE_MAX_HZ = 1200

/** Volumes par défaut des canaux (0 à 1) : modérés. */
export const VOLUMES_PAR_DEFAUT = { ambiance: 0.5, effets: 0.6, voix: 0.7 } as const

/**
 * Crête supposée de la voix de synthèse (échelle des sons du catalogue). Valeur
 * indicative, non mesurée : speechSynthesis ne passe pas par notre bus. Sert à
 * garder l'alerte et la fanfare plus basses que la voix (test).
 */
export const CRETE_VOIX_REFERENCE = 0.3

/** Durée du fondu à l'arrêt d'un son continu, en secondes. */
export const FONDU_ARRET_S = 0.25

/** Durée du fondu à l'entrée d'une ambiance, en secondes. */
export const FONDU_ENTREE_S = 1.5

/** Constante de temps du lissage d'un réglage continu (poussée), en secondes. */
export const LISSAGE_S = 0.15
