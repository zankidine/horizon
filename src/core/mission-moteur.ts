import { ASTRES } from './astres'
import { CATEGORIES_ASTRE } from './astres-donnees'
import { borneDt, avancer, type EtatVaisseau, type Vec3 } from './vaisseau'
import type {
  Etape,
  EtapeAction,
  EtapeCalcul,
  EtapeObservation,
  EtapeTiming,
  EtapeVoyage,
  Locuteur,
  Mission,
  ModeObservation,
  TypeEtape,
  TypeJalon,
} from './mission-types'
import { evaluer, formaterValeur } from './mission-valeurs'
import { paliers, type CategorieInfo, type Niveau, profilDepuisNiveau } from './niveaux'
import {
  etoilesMax as etoilesMaxDe,
  lireEtatProgression,
  progressionInitiale,
  type EtatProgression,
} from './progression'
import { TIMING_OUVERTURE_S } from './constants'
import { delaiRadioAllerRetourSecondes } from './units'
import type { TexteProfil } from './validation'

/**
 * Moteur de missions : une machine à états en TypeScript pur, indépendante de
 * l'affichage. L'interface lit sa vue (vue()), lui envoie des actions (agir()),
 * lui donne le temps (avancer(dt)) et affiche les événements typés qu'il émet.
 *
 * Principe : aucun échec définitif. Une erreur donne un indice, puis la solution
 * expliquée, et la mission continue. L'aide dépend du niveau (paliers(niveau).aide).
 */

// --- Actions du joueur ---------------------------------------------------------

export type ActionJoueur =
  | { type: 'continuer' }
  | { type: 'choisir'; option: string }
  | { type: 'repondre'; valeur: number }
  | { type: 'basculer'; interrupteur: string }
  | { type: 'pousser' }
  | { type: 'observer'; cible: string; mode: ModeObservation }
  | { type: 'demander-indice' }

// --- Événements émis -----------------------------------------------------------

export type EtatFenetre = 'attente' | 'ouverte'

export type EvenementMission =
  | { type: 'mission-demarree'; mission: string; reprise: boolean }
  | { type: 'scene'; numero: number; total: number; id: string; titre: string }
  | { type: 'etape'; id: string; etape: TypeEtape; scene: string }
  | { type: 'objectif'; texte: string }
  | { type: 'dialogue'; locuteur: Locuteur; texte: string }
  | { type: 'question'; texte: string }
  | { type: 'choix'; option: string }
  | { type: 'reponse'; correcte: boolean; valeur: number }
  | { type: 'interrupteur'; id: string; actif: boolean }
  | { type: 'fenetre'; etat: EtatFenetre }
  | { type: 'indice'; numero: number; texte: string }
  | { type: 'solution'; texte: string }
  | { type: 'effet'; nom: string }
  | { type: 'jalon'; part: number; jalon: TypeJalon; texte: string }
  | { type: 'radio'; texte: string; distanceKm: number; delaiSecondes: number }
  | { type: 'observation'; astre: string; mode: ModeObservation | 'jalon'; categories: readonly CategorieInfo[] }
  | { type: 'journal'; id: string; titre: string; texte: string }
  | { type: 'etoile'; etoiles: number; etoilesMax: number }
  | { type: 'rappel'; texte: string }
  | { type: 'progression'; etat: EtatProgression }
  | { type: 'mission-terminee'; etoiles: number; etoilesMax: number }

// --- Vue pour l'interface (panneau OBJECTIF) ---------------------------------

export interface ActionPossible {
  type: ActionJoueur['type']
  /** Pour « choisir » : les options. */
  options?: { id: string; texte: string }[]
  /** Pour « basculer » : les interrupteurs et leur état. */
  interrupteurs?: { id: string; libelle: string; actif: boolean }[]
}

export interface MissionVue {
  mission: { id: string; titre: string }
  terminee: boolean
  /** Scène en cours : « scène 3 sur 6 ». */
  scene: { numero: number; total: number; id: string; titre: string } | null
  /** Progression de la mission : scenesTerminees sur scenesTotal (ratio de 0 à 1). */
  progression: { scenesTerminees: number; scenesTotal: number; ratio: number }
  etape: { id: string; type: TypeEtape } | null
  /** Objectif courant, dans le texte du niveau. */
  objectif: string
  /** Question ou consigne de l'étape (choix, calcul, poussée), sinon null. */
  question: string | null
  /** Indice : un indice est-il encore disponible, combien, et le dernier donné. */
  indice: { disponible: boolean; restants: number; dernier: string | null }
  actions: ActionPossible[]
  /** Pendant un voyage : avancement et vitesse. */
  voyage: { part: number; distanceRestanteKm: number; vitesseKmS: number } | null
  /** Pendant une poussée chronométrée : la fenêtre est-elle ouverte ? */
  fenetre: { etat: EtatFenetre; restanteS: number } | null
  etoiles: number
  etoilesMax: number
  /** Entrées du journal de bord débloquées. */
  journal: string[]
}

export interface OptionsMoteur {
  niveau: Niveau
  /** Progression enregistrée (valeur brute lue du stockage) ; sinon la mission commence. */
  progression?: unknown
  /** Remplace le marqueur {copilote} dans les textes. */
  nomCopilote?: string
}

export type EcouteurMission = (evenement: EvenementMission) => void

const NOM_COPILOTE_PAR_DEFAUT = 'Copilote'

/** Cap (lacet, tangage) qui regarde dans la direction `d` (vecteur unitaire). */
function capVers(d: Vec3): { lacet: number; tangage: number } {
  return { lacet: Math.atan2(-d[0], -d[2]), tangage: Math.asin(Math.max(-1, Math.min(1, d[1]))) }
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

/** Ce qui vit le temps d'une étape et se remet à zéro à l'étape suivante. */
interface EtatEtape {
  indices: number
  dernierIndice: string | null
  solution: boolean
  inactiviteS: number
  interrupteurs: Record<string, boolean>
  /** Poussée chronométrée : secondes depuis le début de la tentative. */
  temps: number
  fenetre: EtatFenetre
  /** Voyage. */
  voyage?: { total: number; part: number; arriveeKm: number; facteur: number; prochainJalon: number }
}

function etatEtapeVide(): EtatEtape {
  return { indices: 0, dernierIndice: null, solution: false, inactiviteS: 0, interrupteurs: {}, temps: 0, fenetre: 'attente' }
}

export class MoteurMission {
  readonly #mission: Mission
  readonly #etapes: Map<string, Etape>
  readonly #ordreScenes: string[]
  readonly #nomCopilote: string
  #niveau: Niveau
  #etat: EtatProgression
  #courante: Etape | null = null
  #e: EtatEtape = etatEtapeVide()
  #vaisseau: EtatVaisseau | null = null
  #sceneCourante: string | null = null
  #file: EvenementMission[] = []
  readonly #ecouteurs = new Set<EcouteurMission>()

  constructor(mission: Mission, options: OptionsMoteur) {
    this.#mission = mission
    this.#etapes = new Map(mission.etapes.map((e) => [e.id, e]))
    this.#ordreScenes = mission.scenes.map((s) => s.id)
    this.#niveau = options.niveau
    this.#nomCopilote = options.nomCopilote ?? NOM_COPILOTE_PAR_DEFAUT
    const enregistree = options.progression === undefined ? null : lireEtatProgression(options.progression, mission)
    this.#etat = enregistree ?? progressionInitiale(mission)
    this.#emettre({ type: 'mission-demarree', mission: mission.id, reprise: enregistree !== null })
    if (this.#etat.terminee || this.#etat.etape === null) {
      this.#etat.terminee = true
      this.#etat.etape = null
      this.#emettre({ type: 'mission-terminee', etoiles: this.#etat.etoiles, etoilesMax: etoilesMaxDe(mission) })
    } else {
      this.#entrer(this.#etat.etape)
    }
  }

  // --- Lecture ---------------------------------------------------------------

  get niveau(): Niveau {
    return this.#niveau
  }

  /** Change de niveau en cours de mission : textes, tolérance et aide suivent. */
  definirNiveau(niveau: Niveau): void {
    this.#niveau = niveau
  }

  /** Copie de l'état de progression (sérialisable). */
  etat(): EtatProgression {
    return structuredClone(this.#etat)
  }

  /** Vaisseau du voyage en cours ou terminé (null avant le premier voyage). */
  vaisseau(): EtatVaisseau | null {
    return this.#vaisseau
  }

  /** S'abonne aux événements ; renvoie la fonction qui désabonne. */
  ecouter(ecouteur: EcouteurMission): () => void {
    this.#ecouteurs.add(ecouteur)
    return () => this.#ecouteurs.delete(ecouteur)
  }

  /** Retire et renvoie les événements émis depuis le dernier appel. */
  retirerEvenements(): EvenementMission[] {
    const evenements = this.#file
    this.#file = []
    return evenements
  }

  vue(): MissionVue {
    const etape = this.#courante
    const etoilesMax = etoilesMaxDe(this.#mission)
    const indexScene = etape ? this.#ordreScenes.indexOf(etape.scene) : this.#ordreScenes.length
    const total = this.#ordreScenes.length
    const scene = etape ? this.#mission.scenes[indexScene] : undefined
    const maxIndices = etape ? this.#indicesMax(etape) : 0
    return {
      mission: { id: this.#mission.id, titre: this.#texte(this.#mission.titre) },
      terminee: this.#etat.terminee,
      scene: scene ? { numero: indexScene + 1, total, id: scene.id, titre: this.#texte(scene.titre) } : null,
      progression: {
        scenesTerminees: indexScene,
        scenesTotal: total,
        ratio: total === 0 ? 1 : indexScene / total,
      },
      etape: etape ? { id: etape.id, type: etape.type } : null,
      objectif: etape ? this.#texte(etape.objectif) : '',
      question: etape ? this.#question(etape) : null,
      indice: {
        disponible: etape !== null && this.#e.indices < maxIndices,
        restants: Math.max(0, maxIndices - this.#e.indices),
        dernier: this.#e.dernierIndice,
      },
      actions: etape ? this.#actionsPossibles(etape) : [],
      voyage: this.#vueVoyage(etape),
      fenetre: etape?.type === 'timing' ? { etat: this.#e.fenetre, restanteS: this.#restanteFenetre(etape) } : null,
      etoiles: this.#etat.etoiles,
      etoilesMax,
      journal: [...this.#etat.journal],
    }
  }

  // --- Actions et temps --------------------------------------------------------

  /** Le joueur agit. Une action qui n'a pas de sens à cette étape est ignorée. */
  agir(action: ActionJoueur): void {
    const etape = this.#courante
    if (!etape) return
    this.#e.inactiviteS = 0
    if (action.type === 'demander-indice') {
      this.#donnerIndice(etape)
      return
    }
    switch (etape.type) {
      case 'dialogue':
        if (action.type === 'continuer') this.#terminer(etape, etape.suivant)
        break
      case 'choix':
        if (action.type === 'choisir') {
          const option = etape.options.find((o) => o.id === action.option)
          if (option) {
            this.#emettre({ type: 'choix', option: option.id })
            this.#terminer(etape, option.suivant)
          }
        }
        break
      case 'calcul':
        if (action.type === 'repondre') this.#repondre(etape, action.valeur)
        break
      case 'action':
        if (action.type === 'basculer') this.#basculer(etape, action.interrupteur)
        break
      case 'timing':
        if (action.type === 'pousser') this.#pousser(etape)
        break
      case 'observation':
        if (action.type === 'observer') this.#observer(etape, action.cible, action.mode)
        break
      case 'voyage':
        break
    }
  }

  /**
   * Fait passer le temps (secondes réelles). Borné comme avancer() : au retour
   * d'un onglet resté inactif, pas de saut. Anime le voyage, les fenêtres de
   * poussée et les rappels doux.
   */
  avancer(dt: number): void {
    const etape = this.#courante
    const pas = borneDt(dt)
    if (!etape || pas === 0) return
    if (etape.type === 'voyage') {
      this.#avancerVoyage(etape, pas)
      return
    }
    if (etape.type === 'timing') this.#avancerTiming(etape, pas)
    if (this.#courante !== etape) return
    this.#e.inactiviteS += pas
    if (this.#e.inactiviteS >= paliers(this.#niveau).aide.delaiRappelS) {
      this.#e.inactiviteS = 0
      this.#emettre({ type: 'rappel', texte: this.#texte(etape.rappel ?? etape.objectif) })
    }
  }

  // --- Textes ----------------------------------------------------------------

  /** Texte du niveau avec ses {marqueurs} remplacés. */
  #texte(texte: TexteProfil, supplementaires: Readonly<Record<string, string>> = {}): string {
    const modele = texte[profilDepuisNiveau(this.#niveau)]
    return modele.replace(/\{(\w+)\}/g, (marqueur, nom: string) => {
      if (nom in supplementaires) return supplementaires[nom]
      if (nom === 'copilote') return this.#nomCopilote
      const def = this.#mission.valeurs[nom]
      return def ? formaterValeur(evaluer(def.expr), def, this.#niveau) : marqueur
    })
  }

  #reponseAttendue(etape: EtapeCalcul): number {
    return evaluer(etape.reponse)
  }

  #supplementairesAide(etape: Etape): Record<string, string> {
    if (etape.type !== 'calcul') return {}
    return {
      reponse: formaterValeur(this.#reponseAttendue(etape), { format: etape.formatReponse, approximatif: true }, this.#niveau),
    }
  }

  #question(etape: Etape): string | null {
    switch (etape.type) {
      case 'choix':
      case 'calcul':
        return this.#texte(etape.question)
      case 'timing':
        return this.#texte(etape.consigne)
      default:
        return null
    }
  }

  // --- Événements -------------------------------------------------------------

  #emettre(evenement: EvenementMission): void {
    this.#file.push(evenement)
    for (const ecouteur of this.#ecouteurs) ecouteur(evenement)
  }

  #emettreProgression(): void {
    this.#emettre({ type: 'progression', etat: this.etat() })
  }

  // --- Étapes -----------------------------------------------------------------

  #entrer(id: string): void {
    const etape = this.#etapes.get(id)
    if (!etape) return
    this.#courante = etape
    this.#e = etatEtapeVide()
    this.#etat.etape = id
    if (etape.scene !== this.#sceneCourante) {
      this.#sceneCourante = etape.scene
      const index = this.#ordreScenes.indexOf(etape.scene)
      this.#emettre({
        type: 'scene',
        numero: index + 1,
        total: this.#ordreScenes.length,
        id: etape.scene,
        titre: this.#texte(this.#mission.scenes[index].titre),
      })
    }
    this.#emettre({ type: 'etape', id: etape.id, etape: etape.type, scene: etape.scene })
    this.#emettre({ type: 'objectif', texte: this.#texte(etape.objectif) })
    for (const nom of etape.effetsEntree ?? []) this.#emettre({ type: 'effet', nom })
    switch (etape.type) {
      case 'dialogue':
        this.#emettre({ type: 'dialogue', locuteur: etape.locuteur, texte: this.#texte(etape.texte) })
        break
      case 'choix':
      case 'calcul':
        this.#emettre({ type: 'question', texte: this.#texte(etape.question) })
        break
      case 'timing':
        this.#emettre({ type: 'question', texte: this.#texte(etape.consigne) })
        this.#emettre({ type: 'fenetre', etat: 'attente' })
        break
      case 'voyage':
        this.#demarrerVoyage(etape)
        break
      case 'action':
        for (const i of etape.interrupteurs) this.#e.interrupteurs[i.id] = false
        break
      case 'observation':
        break
    }
    this.#emettreProgression()
  }

  /** Termine l'étape (réussie, avec ou sans la solution) et passe à la suivante. */
  #terminer(etape: Etape, suivant: string | undefined): void {
    for (const nom of etape.effetsSortie ?? []) this.#emettre({ type: 'effet', nom })
    if (etape.journal) this.#debloquerJournal(etape.journal)
    if (etape.etoile === true && !this.#e.solution && !this.#etat.etapesEtoilees.includes(etape.id)) {
      this.#etat.etapesEtoilees.push(etape.id)
      this.#etat.etoiles = this.#etat.etapesEtoilees.length
      this.#emettre({ type: 'etoile', etoiles: this.#etat.etoiles, etoilesMax: etoilesMaxDe(this.#mission) })
    }
    if (etape.fin === true || suivant === undefined) {
      this.#courante = null
      this.#etat.etape = null
      this.#etat.terminee = true
      this.#emettreProgression()
      this.#emettre({ type: 'mission-terminee', etoiles: this.#etat.etoiles, etoilesMax: etoilesMaxDe(this.#mission) })
      return
    }
    this.#entrer(suivant)
  }

  #debloquerJournal(id: string): void {
    if (this.#etat.journal.includes(id)) return
    const entree = this.#mission.journal.find((e) => e.id === id)
    if (!entree) return
    this.#etat.journal.push(id)
    const extra = this.#supplementairesJalon()
    this.#emettre({ type: 'journal', id, titre: this.#texte(entree.titre), texte: this.#texte(entree.texte, extra) })
  }

  /** {distance} et {delai} pour les textes de jalon et de journal (pendant ou après un voyage). */
  #supplementairesJalon(): Record<string, string> {
    if (!this.#vaisseau) return {}
    const distanceKm = distance(this.#vaisseau.position, ASTRES.terre.position)
    return {
      distance: formaterValeur(distanceKm, { format: 'km', approximatif: true }, this.#niveau),
      delai: formaterValeur(delaiRadioAllerRetourSecondes(distanceKm), { format: 'secondes', approximatif: true }, this.#niveau),
    }
  }

  // --- Aide : indices puis solution, jamais d'échec ------------------------------

  #aide(etape: Etape): Pick<EtapeCalcul, 'indices' | 'solution'> | null {
    return etape.type === 'calcul' || etape.type === 'action' || etape.type === 'timing' || etape.type === 'observation'
      ? etape
      : null
  }

  #indicesMax(etape: Etape): number {
    const aide = this.#aide(etape)
    return aide ? Math.min(paliers(this.#niveau).aide.indicesMax, aide.indices.length) : 0
  }

  #donnerIndice(etape: Etape): boolean {
    const aide = this.#aide(etape)
    if (!aide || this.#e.indices >= this.#indicesMax(etape)) return false
    const texte = this.#texte(aide.indices[this.#e.indices], this.#supplementairesAide(etape))
    this.#e.indices += 1
    this.#e.dernierIndice = texte
    this.#emettre({ type: 'indice', numero: this.#e.indices, texte })
    return true
  }

  /**
   * Une erreur : compte la tentative, donne l'indice suivant, ou la solution
   * expliquée quand il n'y a plus d'indice. Renvoie true si la solution a été
   * donnée (l'appelant fait alors réussir l'étape à la place du joueur).
   */
  #erreur(etape: Etape): boolean {
    this.#etat.tentatives[etape.id] = (this.#etat.tentatives[etape.id] ?? 0) + 1
    if (this.#donnerIndice(etape)) return false
    const aide = this.#aide(etape)
    if (aide) {
      this.#e.solution = true
      this.#emettre({ type: 'solution', texte: this.#texte(aide.solution, this.#supplementairesAide(etape)) })
    }
    return aide !== null
  }

  // --- Types d'étapes ---------------------------------------------------------

  #repondre(etape: EtapeCalcul, valeur: number): void {
    if (!Number.isFinite(valeur)) return
    const attendu = this.#reponseAttendue(etape)
    const correcte = Math.abs(valeur - attendu) <= paliers(this.#niveau).aide.tolerance * Math.abs(attendu)
    this.#emettre({ type: 'reponse', correcte, valeur })
    if (correcte) this.#terminer(etape, etape.suivant)
    else if (this.#erreur(etape)) this.#terminer(etape, etape.suivant)
  }

  #basculer(etape: EtapeAction, id: string): void {
    const ordre = etape.interrupteurs.map((i) => i.id)
    if (!ordre.includes(id) || this.#e.interrupteurs[id]) return
    if (etape.ordre === 'impose' && ordre.find((i) => !this.#e.interrupteurs[i]) !== id) {
      if (this.#erreur(etape)) {
        for (const i of ordre) this.#allumer(i)
        this.#terminer(etape, etape.suivant)
      }
      return
    }
    this.#allumer(id)
    if (ordre.every((i) => this.#e.interrupteurs[i])) this.#terminer(etape, etape.suivant)
  }

  #allumer(id: string): void {
    if (this.#e.interrupteurs[id]) return
    this.#e.interrupteurs[id] = true
    this.#emettre({ type: 'interrupteur', id, actif: true })
  }

  #observer(etape: EtapeObservation, cible: string, mode: ModeObservation): void {
    if (cible === etape.cible && mode === etape.mode) {
      this.#emettreObservation(etape)
      this.#terminer(etape, etape.suivant)
    } else if (this.#erreur(etape)) {
      this.#emettreObservation(etape)
      this.#terminer(etape, etape.suivant)
    }
  }

  #emettreObservation(etape: EtapeObservation): void {
    // Un scan lit les catégories d'information de l'astre visibles à ce niveau.
    const categories =
      etape.mode === 'scanner'
        ? paliers(this.#niveau).categories.filter((c) => (CATEGORIES_ASTRE as readonly string[]).includes(c))
        : []
    this.#emettre({ type: 'observation', astre: etape.cible, mode: etape.mode, categories })
  }

  // --- Poussée chronométrée ---------------------------------------------------

  #largeurFenetre(): number {
    return paliers(this.#niveau).aide.fenetreTimingS
  }

  #restanteFenetre(_etape: EtapeTiming): number {
    const ouverture = TIMING_OUVERTURE_S
    return this.#e.fenetre === 'attente'
      ? Math.max(0, ouverture - this.#e.temps)
      : Math.max(0, ouverture + this.#largeurFenetre() - this.#e.temps)
  }

  #avancerTiming(etape: EtapeTiming, pas: number): void {
    this.#e.temps += pas
    if (this.#e.fenetre === 'attente' && this.#e.temps >= TIMING_OUVERTURE_S) {
      this.#e.fenetre = 'ouverte'
      this.#emettre({ type: 'fenetre', etat: 'ouverte' })
    }
    if (this.#e.fenetre === 'ouverte' && this.#e.temps >= TIMING_OUVERTURE_S + this.#largeurFenetre()) {
      // La fenêtre s'est refermée sans appui : une tentative manquée, on recommence.
      this.#manquer(etape)
    }
  }

  #pousser(etape: EtapeTiming): void {
    if (this.#e.fenetre === 'ouverte') this.#terminer(etape, etape.suivant)
    else this.#manquer(etape) // trop tôt
  }

  #manquer(etape: EtapeTiming): void {
    if (this.#erreur(etape)) {
      this.#terminer(etape, etape.suivant)
      return
    }
    this.#e.temps = 0
    this.#e.fenetre = 'attente'
    this.#emettre({ type: 'fenetre', etat: 'attente' })
  }

  // --- Voyage -----------------------------------------------------------------

  #demarrerVoyage(etape: EtapeVoyage): void {
    const depart = ASTRES[etape.depart.astre as keyof typeof ASTRES]
    const cible = ASTRES[etape.cible as keyof typeof ASTRES]
    const axe = distance(cible.position, depart.position)
    const direction: Vec3 = [
      (cible.position[0] - depart.position[0]) / axe,
      (cible.position[1] - depart.position[1]) / axe,
      (cible.position[2] - depart.position[2]) / axe,
    ]
    const rayonOrbite = depart.rayonKm + evaluer(etape.depart.altitude)
    const position: Vec3 = [
      depart.position[0] + direction[0] * rayonOrbite,
      depart.position[1] + direction[1] * rayonOrbite,
      depart.position[2] + direction[2] * rayonOrbite,
    ]
    const arriveeKm = evaluer(etape.arrivee)
    this.#vaisseau = { position, ...capVers(direction), vitesseKmS: evaluer(etape.vitesse), poussee: false }
    this.#e.voyage = {
      total: Math.max(0, distance(position, cible.position) - arriveeKm),
      part: 0,
      arriveeKm,
      facteur: evaluer(etape.facteurTemps),
      prochainJalon: 0,
    }
  }

  #avancerVoyage(etape: EtapeVoyage, pas: number): void {
    const voyage = this.#e.voyage
    if (!voyage || !this.#vaisseau) return
    this.#vaisseau = avancer(this.#vaisseau, pas, {
      facteurTemps: voyage.facteur,
      consigne: { lacet: this.#vaisseau.lacet, tangage: this.#vaisseau.tangage },
    })
    const cible = ASTRES[etape.cible as keyof typeof ASTRES]
    const restante = Math.max(0, distance(this.#vaisseau.position, cible.position) - voyage.arriveeKm)
    voyage.part = voyage.total === 0 ? 1 : Math.min(1, 1 - restante / voyage.total)
    const arrive = restante === 0 || voyage.part >= 1
    while (voyage.prochainJalon < etape.jalons.length && (arrive || etape.jalons[voyage.prochainJalon].part <= voyage.part)) {
      this.#declencherJalon(etape, voyage.prochainJalon)
      voyage.prochainJalon += 1
    }
    if (arrive) this.#terminer(etape, etape.suivant)
  }

  #declencherJalon(etape: EtapeVoyage, index: number): void {
    const jalon = etape.jalons[index]
    const extra = this.#supplementairesJalon()
    const texte = this.#texte(jalon.texte, extra)
    this.#emettre({ type: 'jalon', part: jalon.part, jalon: jalon.type, texte })
    if (jalon.type === 'radio' && this.#vaisseau) {
      const distanceKm = distance(this.#vaisseau.position, ASTRES.terre.position)
      this.#emettre({ type: 'radio', texte, distanceKm, delaiSecondes: delaiRadioAllerRetourSecondes(distanceKm) })
    } else if (jalon.type === 'observation' && jalon.astre) {
      this.#emettre({ type: 'observation', astre: jalon.astre, mode: 'jalon', categories: [] })
    }
    if (jalon.journal) this.#debloquerJournal(jalon.journal)
  }

  #vueVoyage(etape: Etape | null): MissionVue['voyage'] {
    const voyage = this.#e.voyage
    if (etape?.type !== 'voyage' || !voyage || !this.#vaisseau) return null
    return {
      part: voyage.part,
      distanceRestanteKm: voyage.total * (1 - voyage.part),
      vitesseKmS: this.#vaisseau.vitesseKmS,
    }
  }

  // --- Actions possibles --------------------------------------------------------

  #actionsPossibles(etape: Etape): ActionPossible[] {
    const actions: ActionPossible[] = []
    switch (etape.type) {
      case 'dialogue':
        actions.push({ type: 'continuer' })
        break
      case 'choix':
        actions.push({ type: 'choisir', options: etape.options.map((o) => ({ id: o.id, texte: this.#texte(o.texte) })) })
        break
      case 'calcul':
        actions.push({ type: 'repondre' })
        break
      case 'action':
        actions.push({
          type: 'basculer',
          interrupteurs: etape.interrupteurs.map((i) => ({
            id: i.id,
            libelle: this.#texte(i.libelle),
            actif: this.#e.interrupteurs[i.id] === true,
          })),
        })
        break
      case 'timing':
        actions.push({ type: 'pousser' })
        break
      case 'observation':
        actions.push({ type: 'observer' })
        break
      case 'voyage':
        break
    }
    if (this.#indicesMax(etape) > this.#e.indices) actions.push({ type: 'demander-indice' })
    return actions
  }
}

/** Crée le moteur d'une mission (validée par validerMission). */
export function creerMoteur(mission: Mission, options: OptionsMoteur): MoteurMission {
  return new MoteurMission(mission, options)
}
