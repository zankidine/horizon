/**
 * Session de mission : fait le lien entre le moteur de missions (non modifié) et
 * l'écran. Elle crée le moteur (avec la progression enregistrée), lui donne le
 * temps, lui transmet les actions du joueur et range ses événements en un état
 * simple à afficher (instantané). Sans Svelte, sans DOM : testée avec Vitest.
 *
 * Règles d'affichage :
 *  - jamais d'avance automatique d'un dialogue : seul « Suivant » continue ;
 *  - les retours (indice, solution, coup de pouce) restent affichés tant que le
 *    joueur ne les ferme pas. Un indice ne survit pas à son étape (il ne parle
 *    plus de rien) ; une solution, si : l'étape s'est terminée toute seule ;
 *  - les doubles appuis sur la poussée sont ignorés.
 */
import type { Locuteur, Mission, OrdreAction, TypeJalon, FormatValeur } from '../core/mission-types'
import {
  creerMoteur,
  type ActionJoueur,
  type EvenementMission,
  type MissionVue,
  type MoteurMission,
} from '../core/mission-moteur'
import { evaluer } from '../core/mission-valeurs'
import { profilDepuisNiveau, type Niveau } from '../core/niveaux'
import {
  chargerProgression,
  progressionInitiale,
  sauvegarderProgression,
  type EtatProgression,
  type Stockage,
} from '../core/progression'

export const CLE_JOURNAL = 'horizon.journal'
export const VERSION_JOURNAL = 1
/** Deux appuis sur la poussée plus proches que cela : le second est ignoré (double appui). */
export const DELAI_DOUBLE_APPUI_MS = 350
export const GENRES_RETOUR = ['indice', 'solution', 'assistance', 'rappel'] as const
export type GenreRetour = (typeof GENRES_RETOUR)[number]

export interface Retour {
  id: number
  genre: GenreRetour
  texte: string
}

export interface Replique {
  locuteur: Locuteur
  texte: string
}

export interface JalonVu {
  part: number
  type: TypeJalon
  texte: string
}

export interface EntreeJournalVue {
  id: string
  titre: string
  texte: string
}

/** Ce que l'étape courante demande en plus de MissionVue (lu dans les données de la mission). */
export interface DetailsEtape {
  ordre?: OrdreAction
  formatReponse?: FormatValeur
  /** Valeur attendue d'un calcul : sert seulement à fabriquer les réponses à choisir. */
  reponseAttendue?: number
}

export interface Instantane {
  vue: MissionVue
  niveau: Niveau
  /** Réplique de l'étape courante (dialogue), sinon null. */
  replique: Replique | null
  retours: readonly Retour[]
  /** Messages reçus pendant le voyage en cours. */
  jalons: readonly JalonVu[]
  journal: readonly EntreeJournalVue[]
  details: DetailsEtape
  /** Une mission commencée attend que le joueur choisisse : continuer ou recommencer. */
  reprise: boolean
  /** Nombre de mauvaises réponses données à l'étape (lecteur d'écran, secousse). */
  erreurs: number
}

export interface OptionsSession {
  mission: Mission
  niveau: Niveau
  nomCopilote: string
  /** localStorage, ou null (navigation privée) : la progression ne se sauvegarde alors pas. */
  stockage: Stockage | null
  /** Texte du coup de pouce de la descente (le moteur n'envoie que l'objectif). */
  texteAssistance?: string
  /** Horloge en millisecondes (injectée pour les tests). */
  maintenant?: () => number
}

type Ecouteur = () => void

const TYPES_ANIMES = new Set(['voyage', 'timing', 'descente'])

export class SessionMission {
  readonly #mission: Mission
  readonly #options: OptionsSession
  readonly #maintenant: () => number
  readonly #ecouteurs = new Set<Ecouteur>()
  #moteur: MoteurMission
  #replique: Replique | null = null
  #retours: Retour[] = []
  #jalons: JalonVu[] = []
  #journalTextes = new Map<string, { titre: string; texte: string }>()
  #suivantId = 1
  #reprise = false
  #erreurs = 0
  #dernierAppui = -Infinity
  #instantane!: Instantane

  constructor(options: OptionsSession) {
    this.#mission = options.mission
    this.#options = options
    this.#maintenant = options.maintenant ?? (() => Date.now())
    const enregistree = options.stockage ? chargerProgression(options.stockage, options.mission) : progressionInitiale(options.mission)
    this.#journalTextes = this.#lireJournal()
    this.#moteur = this.#creerMoteur(enregistree)
    this.#reprise = this.#estCommencee(enregistree)
    this.#vider()
    this.#instantane = this.#construire()
  }

  // --- Lecture ---------------------------------------------------------------

  instantane(): Instantane {
    return this.#instantane
  }

  /** S'abonne aux changements d'affichage ; renvoie la fonction qui désabonne. */
  abonner(ecouteur: Ecouteur): () => void {
    this.#ecouteurs.add(ecouteur)
    return () => this.#ecouteurs.delete(ecouteur)
  }

  get nomCopilote(): string {
    return this.#options.nomCopilote
  }

  /** Copie de la progression du moteur. */
  progression(): EtatProgression {
    return this.#moteur.etat()
  }

  // --- Actions du joueur ------------------------------------------------------

  agir(action: ActionJoueur): void {
    if (this.#reprise) return
    if (action.type === 'pousser') {
      const maintenant = this.#maintenant()
      if (maintenant - this.#dernierAppui < DELAI_DOUBLE_APPUI_MS) return
      this.#dernierAppui = maintenant
    }
    // Le joueur agit : un petit rappel n'a plus de raison d'être affiché.
    this.#retours = this.#retours.filter((r) => r.genre !== 'rappel')
    this.#moteur.agir(action)
    this.#vider()
    this.#notifier()
  }

  /** Fait passer le temps (secondes réelles). N'avance pas pendant le choix de reprise. */
  avancer(dt: number): void {
    if (this.#reprise) return
    this.#moteur.avancer(dt)
    const evenements = this.#vider()
    const anime = this.#instantane.vue.etape !== null && TYPES_ANIMES.has(this.#instantane.vue.etape.type)
    if (evenements > 0 || anime) this.#notifier()
  }

  fermerRetour(id: number): void {
    const avant = this.#retours.length
    this.#retours = this.#retours.filter((r) => r.id !== id)
    if (this.#retours.length !== avant) this.#notifier()
  }

  /** Le joueur reprend sa mission là où elle en était. */
  continuerReprise(): void {
    if (!this.#reprise) return
    this.#reprise = false
    this.#notifier()
  }

  /** Efface la progression et repart de la première scène (même niveau). */
  recommencer(): void {
    const initiale = progressionInitiale(this.#mission)
    if (this.#options.stockage) sauvegarderProgression(this.#options.stockage, initiale)
    this.#journalTextes = new Map()
    this.#ecrireJournal()
    this.#replique = null
    this.#retours = []
    this.#jalons = []
    this.#erreurs = 0
    this.#reprise = false
    this.#dernierAppui = -Infinity
    this.#moteur = this.#creerMoteur(initiale)
    this.#vider()
    this.#notifier()
  }

  // --- Moteur et événements --------------------------------------------------

  #creerMoteur(progression: EtatProgression): MoteurMission {
    return creerMoteur(this.#mission, {
      niveau: this.#options.niveau,
      nomCopilote: this.#options.nomCopilote,
      progression,
    })
  }

  /** Une mission commencée : au-delà de la première étape, ou déjà des étoiles ou des erreurs. */
  #estCommencee(etat: EtatProgression): boolean {
    if (etat.terminee) return false
    return etat.etape !== this.#mission.debut || etat.etoiles > 0 || Object.keys(etat.tentatives).length > 0
  }

  /** Range les événements émis depuis le dernier appel. Renvoie leur nombre. */
  #vider(): number {
    const evenements = this.#moteur.retirerEvenements()
    for (const evenement of evenements) this.#traiter(evenement)
    return evenements.length
  }

  #ajouterRetour(genre: GenreRetour, texte: string): void {
    // Un seul retour par genre : le plus récent remplace le précédent.
    this.#retours = [...this.#retours.filter((r) => r.genre !== genre), { id: this.#suivantId++, genre, texte }]
  }

  #traiter(evenement: EvenementMission): void {
    switch (evenement.type) {
      case 'etape':
        this.#replique = null
        this.#jalons = []
        this.#erreurs = 0
        this.#retours = this.#retours.filter((r) => r.genre === 'solution')
        break
      case 'dialogue':
        this.#replique = { locuteur: evenement.locuteur, texte: evenement.texte }
        break
      case 'indice':
        this.#ajouterRetour('indice', evenement.texte)
        break
      case 'solution':
        this.#ajouterRetour('solution', evenement.texte)
        break
      case 'rappel':
        this.#ajouterRetour('rappel', evenement.texte)
        break
      case 'assistance':
        this.#ajouterRetour('assistance', this.#options.texteAssistance ?? evenement.texte)
        break
      case 'reponse':
        if (!evenement.correcte) this.#erreurs += 1
        break
      case 'jalon':
        this.#jalons = [...this.#jalons, { part: evenement.part, type: evenement.jalon, texte: evenement.texte }]
        break
      case 'journal':
        this.#journalTextes.set(evenement.id, { titre: evenement.titre, texte: evenement.texte })
        this.#ecrireJournal()
        break
      case 'progression':
        if (this.#options.stockage) sauvegarderProgression(this.#options.stockage, evenement.etat)
        break
      default:
        break
    }
  }

  // --- Journal : les textes déjà résolus sont gardés pour la reprise ----------

  #lireJournal(): Map<string, { titre: string; texte: string }> {
    const resultat = new Map<string, { titre: string; texte: string }>()
    try {
      const brut = this.#options.stockage?.getItem(CLE_JOURNAL)
      if (typeof brut !== 'string') return resultat
      const donnees: unknown = JSON.parse(brut)
      if (typeof donnees !== 'object' || donnees === null) return resultat
      const d = donnees as { version?: unknown; mission?: unknown; entrees?: unknown }
      if (d.version !== VERSION_JOURNAL || d.mission !== this.#mission.id || typeof d.entrees !== 'object' || d.entrees === null) return resultat
      const connues = new Set(this.#mission.journal.map((e) => e.id))
      for (const [id, entree] of Object.entries(d.entrees)) {
        const e = entree as { titre?: unknown; texte?: unknown } | null
        if (connues.has(id) && e && typeof e.titre === 'string' && typeof e.texte === 'string') {
          resultat.set(id, { titre: e.titre, texte: e.texte })
        }
      }
    } catch {
      // Contenu illisible : le journal reprend avec les titres seulement.
    }
    return resultat
  }

  #ecrireJournal(): void {
    try {
      this.#options.stockage?.setItem(
        CLE_JOURNAL,
        JSON.stringify({ version: VERSION_JOURNAL, mission: this.#mission.id, entrees: Object.fromEntries(this.#journalTextes) })
      )
    } catch {
      // Sans stockage, le journal ne survit pas au rechargement.
    }
  }

  // --- Instantané ----------------------------------------------------------------

  #journal(vue: MissionVue): EntreeJournalVue[] {
    const profil = profilDepuisNiveau(this.#options.niveau)
    return vue.journal.map((id) => {
      const connue = this.#journalTextes.get(id)
      if (connue) return { id, ...connue }
      const donnee = this.#mission.journal.find((e) => e.id === id)
      return { id, titre: donnee ? donnee.titre[profil] : id, texte: '' }
    })
  }

  #details(vue: MissionVue): DetailsEtape {
    const etape = vue.etape ? this.#mission.etapes.find((e) => e.id === vue.etape?.id) : undefined
    if (etape?.type === 'action') return { ordre: etape.ordre }
    if (etape?.type === 'calcul') {
      try {
        return { formatReponse: etape.formatReponse, reponseAttendue: evaluer(etape.reponse) }
      } catch {
        return { formatReponse: etape.formatReponse }
      }
    }
    return {}
  }

  #construire(): Instantane {
    const vue = this.#moteur.vue()
    return {
      vue,
      niveau: this.#options.niveau,
      replique: this.#replique,
      retours: this.#retours,
      jalons: this.#jalons,
      journal: this.#journal(vue),
      details: this.#details(vue),
      reprise: this.#reprise,
      erreurs: this.#erreurs,
    }
  }

  #notifier(): void {
    this.#instantane = this.#construire()
    for (const ecouteur of this.#ecouteurs) ecouteur()
  }
}
