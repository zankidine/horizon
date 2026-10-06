/**
 * État d'affichage du panneau de mission. Il crée la session (moteur de
 * missions, progression enregistrée), lui donne le temps, transmet les actions
 * du joueur et prépare les textes et les valeurs que les composants affichent.
 * Les composants .svelte ne font que montrer ces valeurs.
 */
import donneesMission from '../../data/missions/mission1.json'
import donneesTextes from '../../data/mission-ui.json'
import { TIMING_OUVERTURE_S } from '../../core/constants'
import { ASTRES } from '../../core/astres'
import { formaterValeur } from '../../core/mission-valeurs'
import type { ModeObservation } from '../../core/mission-types'
import { profilDepuisNiveau, paliers, type Niveau } from '../../core/niveaux'
import { validerMission } from '../../core/validation-mission'
import { diagnostic, executer, parler } from '../../lib/audio'
import { lireNombreFr } from '../../lib/lecture-nombre'
import { jaugeFenetre, jaugeVitesse, pourcent } from '../../lib/mission-jauges'
import { reponsesPossibles, uniteSaisie } from '../../lib/mission-reponses'
import { SessionMission, type Instantane } from '../../lib/mission-session'
import { texteMission, validerTextesMission, type CleTexteMission } from '../../lib/textes-mission'
import { appStore } from '../../lib/stores/app.svelte'
import { textes as textesHud } from '../../data/hud.json'
import type { Locuteur } from '../../core/mission-types'

const MISSION = validerMission(donneesMission)
const TEXTES = validerTextesMission(donneesTextes)

/** Période du temps de jeu : assez fine pour les jauges, légère pour la batterie. */
export const PERIODE_JEU_MS = 50

export type Volet = 'mission' | 'journal' | 'appris'

function stockageNavigateur(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export interface RetourVu {
  id: number
  genre: string
  titre: string
  texte: string
}

export class EtatMission {
  etat = $state.raw<Instantane>(undefined as unknown as Instantane)
  volet = $state<Volet>('mission')
  saisie = $state('')
  saisieInvalide = $state(false)
  voixAbsente = $state(false)
  /** Vrai quand l'onglet est caché : le jeu est en pause. */
  enPause = $state(false)

  readonly niveau: Niveau
  readonly profil: 'enfant' | 'adulte'
  readonly #session: SessionMission
  #minuteur: ReturnType<typeof setInterval> | undefined
  #dernierMs = 0
  #desabonner: (() => void) | undefined

  constructor(options: { surChangerNiveau?: () => void } = {}) {
    this.niveau = appStore.niveau
    this.profil = profilDepuisNiveau(this.niveau)
    this.#surChangerNiveau = options.surChangerNiveau ?? (() => appStore.revenir())
    this.#session = new SessionMission({
      mission: MISSION,
      niveau: this.niveau,
      nomCopilote: appStore.copilote,
      stockage: stockageNavigateur(),
      texteAssistance: this.t('assistance'),
    })
    this.etat = this.#session.instantane()
  }

  readonly #surChangerNiveau: (() => void) | undefined

  // --- Cycle de vie ----------------------------------------------------------------

  demarrer(): void {
    this.#desabonner = this.#session.abonner(() => {
      this.etat = this.#session.instantane()
    })
    this.#dernierMs = performance.now()
    this.#minuteur = setInterval(() => this.#tic(), PERIODE_JEU_MS)
    document.addEventListener('visibilitychange', this.#surVisibilite)
    this.#surVisibilite()
  }

  arreter(): void {
    clearInterval(this.#minuteur)
    this.#desabonner?.()
    document.removeEventListener('visibilitychange', this.#surVisibilite)
    this.#arreterLecture()
  }

  /** Le jeu s'arrête quand l'onglet est caché ou l'écran verrouillé, et reprend sans saut de temps. */
  readonly #surVisibilite = (): void => {
    this.enPause = document.hidden
    this.#dernierMs = performance.now()
    if (this.enPause) this.#arreterLecture()
  }

  #tic(): void {
    const maintenant = performance.now()
    const dt = (maintenant - this.#dernierMs) / 1000
    this.#dernierMs = maintenant
    if (this.enPause || document.hidden) return
    this.#session.avancer(dt)
  }

  // --- Textes ----------------------------------------------------------------------

  t(cle: CleTexteMission, valeurs: Readonly<Record<string, string>> = {}): string {
    return texteMission(TEXTES, cle, this.profil, valeurs)
  }

  get copilote(): string {
    return this.#session.nomCopilote
  }

  // --- Lecture de la vue ------------------------------------------------------------

  get vue() {
    return this.etat.vue
  }

  get typeEtape() {
    return this.etat.vue.etape?.type ?? null
  }

  /** Étapes où le joueur agit en direct : leur commande passe avant les retours. */
  get commandeEnDirect(): boolean {
    return this.typeEtape === 'descente' || this.typeEtape === 'timing'
  }

  get titreScene(): string {
    const scene = this.vue.scene
    return scene ? `${this.t('scene', { numero: String(scene.numero), total: String(scene.total) })} · ${scene.titre}` : this.vue.mission.titre
  }

  get etoilesTexte(): string {
    return this.t('etoiles', { etoiles: String(this.vue.etoiles), max: String(this.vue.etoilesMax) })
  }

  get repriseTexte(): string {
    const scene = this.vue.scene
    return this.t('repriseTitre', { numero: String(scene?.numero ?? 1), total: String(scene?.total ?? this.vue.progression.scenesTotal) })
  }

  /** Qui parle : le nom du copilote, le contrôle ou le récit. */
  libelleLocuteur(locuteur: Locuteur): string {
    return locuteur === 'copilote' ? this.copilote : this.t(locuteur === 'controle' ? 'locuteurControle' : 'locuteurNarrateur')
  }

  get retours(): RetourVu[] {
    const titres = { indice: 'retourIndice', solution: 'retourSolution', assistance: 'retourAssistance', rappel: 'retourRappel' } as const
    return this.etat.retours.map((r) => ({ id: r.id, genre: r.genre, titre: this.t(titres[r.genre]), texte: r.texte }))
  }

  /** Texte que « Lire » dit : la réplique, le dernier message du voyage, sinon la question ou l'objectif. */
  get texteALire(): string {
    if (this.typeEtape === 'dialogue' && this.etat.replique) return this.etat.replique.texte
    if (this.typeEtape === 'voyage') return this.etat.jalons[this.etat.jalons.length - 1]?.texte ?? this.t('voyageExplication')
    return this.vue.question ?? this.vue.objectif
  }

  get peutSuivant(): boolean {
    return this.typeEtape === 'dialogue'
  }

  get indiceDisponible(): boolean {
    return this.vue.indice.disponible
  }

  // --- Étapes : valeurs préparées ------------------------------------------------------

  get options(): { id: string; texte: string }[] {
    return this.vue.actions.find((a) => a.type === 'choisir')?.options ?? []
  }

  /** Aux niveaux 1 et 2, un calcul se répond en choisissant parmi trois valeurs. */
  readonly reponsesAChoisir = $derived.by(() => {
    const { details, vue, niveau } = this.etat
    if (niveau > 2 || vue.etape?.type !== 'calcul' || details.reponseAttendue === undefined || details.formatReponse === undefined) return []
    return reponsesPossibles(details.reponseAttendue, details.formatReponse, niveau, vue.etape.id)
  })

  get uniteSaisie(): string {
    return this.etat.details.formatReponse ? uniteSaisie(this.etat.details.formatReponse) : ''
  }

  get interrupteurs(): { id: string; libelle: string; actif: boolean; numero: number | null }[] {
    const liste = this.vue.actions.find((a) => a.type === 'basculer')?.interrupteurs ?? []
    const numerote = this.etat.details.ordre === 'impose'
    return liste.map((i, index) => ({ ...i, numero: numerote ? index + 1 : null }))
  }

  get consigneAction(): string {
    return `${this.t('actionConsigne')} ${this.t(this.etat.details.ordre === 'impose' ? 'ordreImpose' : 'ordreLibre')}`
  }

  /** Observer : chaque astre, repéré ou scanné. */
  get observations(): { cible: string; mode: ModeObservation; libelle: string }[] {
    const resultat: { cible: string; mode: ModeObservation; libelle: string }[] = []
    for (const cible of Object.keys(ASTRES)) {
      const nom = (textesHud.cibles as Record<string, Record<'enfant' | 'adulte', string>>)[cible]?.[this.profil] ?? cible
      for (const mode of ['reperer', 'scanner'] as const) {
        resultat.push({
          cible,
          mode,
          libelle: this.t('observationBouton', { mode: this.t(mode === 'reperer' ? 'modeReperer' : 'modeScanner'), astre: nom }),
        })
      }
    }
    return resultat
  }

  get fenetre() {
    const f = this.vue.fenetre
    if (!f) return null
    const largeur = paliers(this.niveau).aide.fenetreTimingS
    const jauge = jaugeFenetre(f.etat === 'ouverte' ? 'ouverte' : 'attente', f.restanteS, TIMING_OUVERTURE_S, largeur)
    return {
      ouverte: f.etat === 'ouverte',
      fraction: jauge.fraction,
      message: this.t(f.etat === 'ouverte' ? 'timingOuvert' : 'timingAttente'),
      restante: f.etat === 'ouverte' ? this.t('timingFenetreRestante', { secondes: `${Math.ceil(f.restanteS)} s` }) : '',
    }
  }

  get voyage() {
    const v = this.vue.voyage
    if (!v) return null
    const categories = paliers(this.niveau).categories
    return {
      part: v.part,
      pourcent: pourcent(v.part),
      progression: this.t('voyageProgression', { pourcent: `${pourcent(v.part)} %` }),
      distance: categories.includes('distance')
        ? this.t('voyageDistanceRestante', { distance: formaterValeur(v.distanceRestanteKm, { format: 'km' }, this.niveau) })
        : null,
      vitesse: categories.includes('vitesse')
        ? this.t('voyageVitesse', { vitesse: formaterValeur(v.vitesseKmS, { format: 'km/s' }, this.niveau) })
        : null,
      jalons: this.etat.jalons,
    }
  }

  get descente() {
    const d = this.vue.descente
    if (!d) return null
    const jauge = jaugeVitesse(d.vitesseMs, d.zone)
    return {
      moteur: d.moteur,
      dansLaZone: d.statut === 'dans-la-zone',
      jauge,
      altitude: this.t('descenteAltitude', { altitude: formaterValeur(d.altitudeM, { format: 'm' }, this.niveau) }),
      vitesse: this.t('descenteVitesse', { vitesse: formaterValeur(d.vitesseMs, { format: 'm/s' }, this.niveau) }),
      zone: this.t('descenteZone', { max: formaterValeur(d.zone.max, { format: 'm/s' }, this.niveau) }),
      statut: this.t(d.statut === 'dans-la-zone' ? 'descenteDansZone' : 'descenteTropRapide'),
    }
  }

  get bilanTexte(): string {
    return this.t('finBilan', { etoiles: String(this.vue.etoiles), max: String(this.vue.etoilesMax) })
  }

  // --- Actions du joueur -------------------------------------------------------------------

  suivant(): void {
    this.#arreterLecture()
    this.#session.agir({ type: 'continuer' })
  }

  choisir(option: string): void {
    this.#arreterLecture()
    this.#session.agir({ type: 'choisir', option })
  }

  repondre(valeur: number): void {
    this.#session.agir({ type: 'repondre', valeur })
  }

  /** Saisie libre (niveaux 3 et 4) : lue à la française ; un texte illisible demande de recommencer. */
  validerSaisie(): void {
    const valeur = lireNombreFr(this.saisie)
    if (valeur === null) {
      this.saisieInvalide = true
      return
    }
    this.saisieInvalide = false
    this.#session.agir({ type: 'repondre', valeur })
    if (this.etat.vue.etape?.type !== 'calcul' || this.etat.erreurs === 0) this.saisie = ''
  }

  basculer(interrupteur: string): void {
    this.#session.agir({ type: 'basculer', interrupteur })
  }

  pousser(): void {
    this.#session.agir({ type: 'pousser' })
  }

  observer(cible: string, mode: ModeObservation): void {
    this.#session.agir({ type: 'observer', cible, mode })
  }

  basculerMoteur(): void {
    this.#session.agir({ type: 'moteur', actif: !(this.vue.descente?.moteur ?? false) })
  }

  demanderIndice(): void {
    this.#session.agir({ type: 'demander-indice' })
  }

  fermerRetour(id: number): void {
    this.#session.fermerRetour(id)
  }

  ouvrirVolet(volet: Volet): void {
    this.volet = this.volet === volet ? 'mission' : volet
  }

  continuerReprise(): void {
    this.#session.continuerReprise()
  }

  recommencer(): void {
    this.#arreterLecture()
    this.saisie = ''
    this.saisieInvalide = false
    this.volet = 'mission'
    this.#session.recommencer()
  }

  /** Efface la progression, puis revient à la préparation pour choisir un autre niveau. */
  changerNiveau(): void {
    this.recommencer()
    this.#surChangerNiveau?.()
  }

  // --- Voix --------------------------------------------------------------------------------

  /** « Lire » : la voix locale dit le texte ; il reste toujours affiché. */
  lire(texte: string = this.texteALire): void {
    parler(texte)
    this.voixAbsente = !diagnostic().voixDisponible
  }

  #arreterLecture(): void {
    executer({ type: 'arreter-voix' })
  }
}
