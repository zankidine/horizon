/**
 * Logique de l'écran de navigation : choix de la destination et de la vitesse,
 * calcul du trajet, textes mis en français. Le composant .svelte ne fait
 * qu'afficher ce qui est préparé ici. Le niveau est lu dans appStore, jamais modifié :
 * les paliers (chiffres, formules) viennent de paliers(niveau), et les textes de
 * navigation.json suivent le profil dérivé (niveaux 1-2 : textes « enfant »,
 * niveaux 3-4 : textes « adulte »).
 */
import { comparer } from '../../core/comparisons'
import { VITESSES_CROISIERE_KM_H, type VitesseCroisiere } from '../../core/constants'
import { validerDestinations, type Destination } from '../../core/destinations'
import { VITESSES, APOLLO_11_DUREE_TRAJET_SECONDES, calculerTrajet, type Trajet } from '../../core/navigation'
import { paliers } from '../../core/niveaux'
import { validerTextesNavigation } from '../../core/textes-navigation'
import { arrondirSignificatif } from '../../core/units'
import {
  formaterComparaisons,
  formaterDuree,
  formaterGrandeur,
  formaterNombre,
  remplir,
  type ComparaisonFr,
} from '../../lib/format-fr'
import { appStore } from '../../lib/stores/app.svelte'
import donneesDestinations from '../../data/destinations.json'
import donneesTextes from '../../data/navigation.json'

const DESTINATIONS = validerDestinations(donneesDestinations)
const TEXTES = validerTextesNavigation(donneesTextes)

/** Le cap confirmé par le joueur, transmis à onConfirmer. */
export interface Cap {
  destination: Destination
  vitesse: VitesseCroisiere
  trajet: Trajet
}

/** Fonction appelée quand le joueur confirme le cap. */
export type SurConfirmer = (cap: Cap) => void

export interface LigneDestination {
  id: string
  nom: string
  description: string
  active: boolean
  choisie: boolean
  /** Étiquette « Bientôt » pour une destination désactivée. */
  etiquette?: string
}

export interface LigneVitesse {
  id: VitesseCroisiere
  libelle: string
  detail: string
  choisie: boolean
}

export interface VueNavigation {
  titre: string
  choixDestination: string
  choixVitesse: string
  resultats: string
  comparaisonsTitre: string
  confirmer: string
  destinations: LigneDestination[]
  vitesses: LigneVitesse[]
  lignesResultat: string[]
  comparaisons: ComparaisonFr[]
  vraieVie: { titre: string; apollo: string; fictives: string }
}

export class EtatNavigation {
  readonly #onConfirmer: SurConfirmer

  destinationId = $state(DESTINATIONS.find((d) => d.active)?.id ?? '')
  vitesse = $state<VitesseCroisiere>('normale')

  destination = $derived(DESTINATIONS.find((d) => d.id === this.destinationId))
  trajet = $derived(
    this.destination?.active ? calculerTrajet(this.destination, this.vitesse) : undefined
  )

  vue = $derived.by<VueNavigation>(() => {
    const profil = appStore.profile
    const { chiffresSignificatifs: chiffres, formules } = paliers(appStore.niveau)
    const environ = profil === 'enfant' ? 'environ ' : ''
    const duree = (secondes: number) => environ + formaterDuree(secondes, chiffres)
    const trajet = this.trajet

    const vitesses: LigneVitesse[] = VITESSES.map((id) => {
      const trajetVitesse = this.destination?.active ? calculerTrajet(this.destination, id) : undefined
      const detail =
        formules
          ? formaterGrandeur({ valeur: VITESSES_CROISIERE_KM_H[id], unite: 'km/h' })
          : trajetVitesse
            ? duree(trajetVitesse.dureeSecondes)
            : ''
      return { id, libelle: TEXTES.vitesses[id][profil], detail, choisie: id === this.vitesse }
    })

    return {
      titre: TEXTES.titre[profil],
      choixDestination: TEXTES.choixDestination[profil],
      choixVitesse: TEXTES.choixVitesse[profil],
      resultats: TEXTES.resultats[profil],
      comparaisonsTitre: TEXTES.comparaisons[profil],
      confirmer: TEXTES.confirmer[profil],
      destinations: DESTINATIONS.map((d) => ({
        id: d.id,
        nom: d.nom[profil],
        description: d.description[profil],
        active: d.active,
        choisie: d.id === this.destinationId,
        etiquette: d.active ? undefined : TEXTES.bientot[profil],
      })),
      vitesses,
      lignesResultat: trajet
        ? [
            remplir(TEXTES.distance[profil], {
              valeur: formaterGrandeur({ valeur: trajet.distanceKm, unite: 'km' }),
            }),
            remplir(TEXTES.duree[profil], { valeur: duree(trajet.dureeSecondes) }),
            remplir(TEXTES.lumiere[profil], { valeur: duree(trajet.tempsLumiereSecondes) }),
            remplir(TEXTES.radio[profil], { valeur: duree(trajet.delaiRadioSecondes) }),
          ]
        : [],
      // Le temps de lumière a déjà sa ligne dans les résultats : pas de doublon ici.
      comparaisons: trajet
        ? formaterComparaisons(
            comparer(trajet.distanceKm, profil, chiffres).filter((c) => c.type !== 'temps-lumiere')
          )
        : [],
      vraieVie: {
        titre: TEXTES.vraieVie.titre[profil],
        apollo: trajet
          ? remplir(TEXTES.vraieVie.apollo[profil], {
              duree: formaterDuree(APOLLO_11_DUREE_TRAJET_SECONDES, chiffres),
              fois: formaterNombre(arrondirSignificatif(trajet.foisPlusRapideQueApollo, chiffres)),
            })
          : '',
        fictives: TEXTES.vraieVie.fictives[profil],
      },
    }
  })

  constructor(onConfirmer: SurConfirmer) {
    this.#onConfirmer = onConfirmer
  }

  choisirDestination(id: string): void {
    if (DESTINATIONS.some((d) => d.id === id && d.active)) this.destinationId = id
  }

  choisirVitesse(vitesse: VitesseCroisiere): void {
    if (VITESSES.includes(vitesse)) this.vitesse = vitesse
  }

  confirmer(): void {
    const { destination, trajet } = this
    if (!destination || !trajet) return
    this.#onConfirmer({ destination, vitesse: this.vitesse, trajet })
  }
}
