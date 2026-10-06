/**
 * Logique de l'écran « Préparation de mission » : profil, ambiance et
 * nom du copilote. Le store garde les choix et les sauvegarde.
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

  get profil(): Profile {
    return appStore.profile
  }

  get ambiance(): AmbianceCockpit {
    return appStore.ambianceCockpit
  }

  /** Un nom est prêt quand il reste du texte utilisable après nettoyage. */
  readonly nomValide = $derived(nettoyerNomCopilote(this.nom) !== null)

  choisirProfil(profil: Profile): void {
    appStore.profile = profil
  }

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
    appStore.partir()
  }
}
