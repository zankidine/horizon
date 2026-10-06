import { profilDepuisNiveau, type Niveau } from '../../core/niveaux'
import {
  lirePreferences,
  nettoyerNomCopilote,
  PREFERENCES_PAR_DEFAUT,
  serialiserPreferences,
  type AmbianceCockpit,
} from '../preferences'

/** Profil de texte, dérivé du niveau (1-2 enfant, 3-4 adulte). */
export type Profile = 'enfant' | 'adulte'
export type Ambiance = 'jour' | 'nuit'
export type { AmbianceCockpit, Niveau }

interface AppState {
  niveau: Niveau
  ambiance: Ambiance
  ambianceCockpit: AmbianceCockpit
  copilote: string
  pretAPartir: boolean
}

const CLE_STOCKAGE = 'horizon.preferences'

function lireStockage(): string | null {
  try {
    return localStorage.getItem(CLE_STOCKAGE)
  } catch {
    // Stockage indisponible (navigation privée) : valeurs par défaut.
    return null
  }
}

function ecrireStockage(valeur: string): void {
  try {
    localStorage.setItem(CLE_STOCKAGE, valeur)
  } catch {
    // Sans stockage, les choix valent pour la session seulement.
  }
}

/** Pose l'ambiance sur la racine : tokens.css y réagit. */
function appliquerAmbiance(ambiance: AmbianceCockpit): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.ambiance = ambiance
  }
}

function createAppStore() {
  const enregistrees = lirePreferences(lireStockage())

  let state = $state<AppState>({
    niveau: enregistrees.niveau ?? PREFERENCES_PAR_DEFAUT.niveau,
    ambiance: 'jour',
    ambianceCockpit:
      enregistrees.ambianceCockpit ?? PREFERENCES_PAR_DEFAUT.ambianceCockpit,
    copilote: enregistrees.copilote ?? PREFERENCES_PAR_DEFAUT.copilote,
    pretAPartir: false,
  })

  appliquerAmbiance(state.ambianceCockpit)

  function sauvegarder(): void {
    ecrireStockage(
      serialiserPreferences({
        niveau: state.niveau,
        ambianceCockpit: state.ambianceCockpit,
        copilote: state.copilote,
      })
    )
  }

  return {
    /** Niveau de connaissance : la source de vérité. */
    get niveau() {
      return state.niveau
    },
    set niveau(value: Niveau) {
      state.niveau = value
      sauvegarder()
    },
    /** Profil de texte dérivé du niveau, en lecture seule (comme avant). */
    get profile(): Profile {
      return profilDepuisNiveau(state.niveau)
    },
    get ambiance() {
      return state.ambiance
    },
    set ambiance(value: Ambiance) {
      state.ambiance = value
    },
    get ambianceCockpit() {
      return state.ambianceCockpit
    },
    set ambianceCockpit(value: AmbianceCockpit) {
      state.ambianceCockpit = value
      appliquerAmbiance(value)
      sauvegarder()
    },
    get copilote() {
      return state.copilote
    },
    /** Un nom invalide ou vide est ignoré : l'ancien nom reste. */
    set copilote(value: string) {
      const nom = nettoyerNomCopilote(value)
      if (nom === null) return
      state.copilote = nom
      sauvegarder()
    },
    get pretAPartir() {
      return state.pretAPartir
    },
    /** Passe de l'écran de préparation au poste de commandement. */
    partir() {
      state.pretAPartir = true
    },
    /** Retour à l'écran de préparation (pour changer de niveau). */
    revenir() {
      state.pretAPartir = false
    },
  }
}

export const appStore = createAppStore()
