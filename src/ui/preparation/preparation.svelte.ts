/**
 * Logique de l'écran « Préparation de mission » : ambiance et nom du
 * copilote (le niveau se choisit dans le sélecteur de niveau). Le store garde les choix et les sauvegarde.
 */
import {
  appStore,
  type AmbianceCockpit,
  type Profile,
} from '../../lib/stores/app.svelte'
import {
  LONGUEUR_MAX_COPILOTE,
  nettoyerNomCopilote,
} from '../../lib/preferences'
import { suggestions } from '../../data/copilotes.json'
import { initialiser } from '../../lib/audio'

/**
 * Ancien choix enfant/adulte. Plus utilisé par la préparation ; gardé exporté
 * jusqu'à la réécriture du poste de commandement (poste.svelte.ts l'importe).
 */
export const CHOIX_PROFIL: readonly {
  valeur: Profile
  titre: string
  detail: string
}[] = [
  {
    valeur: 'enfant',
    titre: 'Enfant',
    detail: 'Des mots simples et des images',
  },
  { valeur: 'adulte', titre: 'Adulte', detail: 'Les chiffres et les formules' },
]

export const CHOIX_AMBIANCE: readonly {
  valeur: AmbianceCockpit
  titre: string
  detail: string
}[] = [
  {
    valeur: 'aventure',
    titre: 'Aventure',
    detail: 'Chaude, colorée, arrondie',
  },
  { valeur: 'cinema', titre: 'Cinéma', detail: 'Sombre, ambre et cyan' },
]

export const NOMS_SUGGERES: readonly string[] = suggestions
export { LONGUEUR_MAX_COPILOTE }

export class EtatPreparation {
  nom = $state(appStore.copilote)

  get ambiance(): AmbianceCockpit {
    return appStore.ambianceCockpit
  }

  /** Un nom est prêt quand il reste du texte utilisable après nettoyage. */
  readonly nomValide = $derived(nettoyerNomCopilote(this.nom) !== null)

  choisirAmbiance(ambiance: AmbianceCockpit): void {
    appStore.ambianceCockpit = ambiance
  }

  suggerer(nom: string): void {
    this.nom = nom
  }

  /** Enregistre le nom puis ouvre le poste de commandement. */
  decoller(): void {
    if (!this.nomValide) return
    appStore.copilote = this.nom
    // Premier geste du joueur : l'audio ne peut démarrer qu'ici (voix du copilote, « Lire »).
    initialiser()
    appStore.partir()
  }
}
