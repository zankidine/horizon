/**
 * Constantes physiques, objets de référence et conversions d'unités.
 *
 * C'est le seul fichier où des valeurs numériques sont écrites en dur :
 * tout le reste (distances, durées, comparaisons) est calculé à partir d'ici.
 */

// --- Longueurs -------------------------------------------------------------

/**
 * Mètres dans un kilomètre.
 * Source : préfixe « kilo » = 10³, Système international d'unités (BIPM, brochure SI, 9e éd., 2019).
 */
export const METRES_PAR_KM = 1000

// --- Temps -----------------------------------------------------------------

/**
 * Secondes dans une minute.
 * Source : unités en usage avec le SI, tableau 8 (BIPM, brochure SI, 9e éd., 2019).
 */
export const SECONDES_PAR_MINUTE = 60

/**
 * Minutes dans une heure.
 * Source : unités en usage avec le SI, tableau 8 (BIPM, brochure SI, 9e éd., 2019).
 */
export const MINUTES_PAR_HEURE = 60

/** Secondes dans une heure, déduites des deux constantes précédentes. */
export const SECONDES_PAR_HEURE = SECONDES_PAR_MINUTE * MINUTES_PAR_HEURE

/**
 * Heures dans un jour.
 * Source : unités en usage avec le SI, tableau 8 (BIPM, brochure SI, 9e éd., 2019).
 */
export const HEURES_PAR_JOUR = 24

/**
 * Jours dans une année (année julienne).
 * Source : Union astronomique internationale, année julienne de 365,25 jours
 * utilisée pour définir l'année-lumière (résolution B2, 2012).
 */
export const JOURS_PAR_AN = 365.25

/**
 * Mois dans une année.
 * Source : calendrier grégorien. La durée d'un mois est la moyenne
 * JOURS_PAR_AN / MOIS_PAR_AN, pas un mois réel du calendrier.
 */
export const MOIS_PAR_AN = 12

/** Durée moyenne d'un mois en jours, déduite des deux constantes précédentes. */
export const JOURS_PAR_MOIS = JOURS_PAR_AN / MOIS_PAR_AN

// --- Physique et astronomie ------------------------------------------------

/**
 * Vitesse de la lumière dans le vide, en mètres par seconde (valeur exacte).
 * Source : définition du mètre, 17e CGPM (1983), brochure SI du BIPM.
 */
export const VITESSE_LUMIERE_M_S = 299_792_458

/** Vitesse de la lumière en kilomètres par seconde, déduite de la précédente. */
export const VITESSE_LUMIERE_KM_S = VITESSE_LUMIERE_M_S / METRES_PAR_KM

/**
 * Rayon moyen (volumétrique) de la Terre, en kilomètres.
 * Source : NASA, Earth Fact Sheet (nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html).
 */
export const RAYON_MOYEN_TERRE_KM = 6371.0

/** Diamètre moyen de la Terre en kilomètres, déduit du rayon. */
export const DIAMETRE_TERRE_KM = 2 * RAYON_MOYEN_TERRE_KM

/**
 * Distance moyenne Terre-Lune (demi-grand axe de l'orbite lunaire), en kilomètres.
 * Source : NASA, Moon Fact Sheet (nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html).
 */
export const DISTANCE_TERRE_LUNE_KM = 384_400

// --- Objets de référence ---------------------------------------------------

/**
 * Longueur d'un terrain de football, en mètres.
 * Source : FIFA, Football Stadiums: Technical Recommendations and Requirements
 * (5e éd., 2011), dimensions recommandées 105 m × 68 m.
 */
export const LONGUEUR_TERRAIN_FOOT_M = 105

/**
 * Hauteur de la tour Eiffel avec ses antennes, en mètres.
 * Source : Société d'exploitation de la tour Eiffel, toureiffel.paris
 * (330 m depuis l'ajout d'une antenne en 2022).
 */
export const HAUTEUR_TOUR_EIFFEL_M = 330

/**
 * Vitesse d'une voiture, en kilomètres par heure.
 * Source : valeur ronde choisie pour l'exemple, du même ordre que les limites
 * du Code de la route français (article R413-2 : 80 à 130 km/h hors agglomération).
 */
export const VITESSE_VOITURE_KM_H = 100

/**
 * Vitesse de marche d'un adulte, en kilomètres par heure.
 * Source : R. W. Bohannon, « Comfortable and maximum walking speed of adults
 * aged 20-79 years », Age and Ageing 26 (1997) : environ 1,4 m/s, soit 5 km/h.
 */
export const VITESSE_MARCHE_KM_H = 5

// ===========================================================================
// Navigation (étape 3b)
// ===========================================================================

/** Vitesses de croisière que le joueur peut choisir pour le vaisseau. */
export type VitesseCroisiere = 'lente' | 'normale' | 'rapide'

/**
 * Vitesses de croisière du vaisseau, en kilomètres par heure.
 * Source : valeurs FICTIVES, choisies pour le jeu (aucun engin réel ne
 * voyage à ces vitesses). Elles donnent pour la Lune des trajets d'environ
 * 19 heures, 4 heures et 23 minutes, faciles à comparer entre eux.
 */
export const VITESSES_CROISIERE_KM_H: Readonly<Record<VitesseCroisiere, number>> = {
  lente: 20_000,
  normale: 100_000,
  rapide: 1_000_000,
}

/**
 * Durée du trajet aller d'Apollo 11 vers la Lune, en jours.
 * Source : NASA, Apollo 11 Mission Overview (nasa.gov) : lancement le
 * 16 juillet 1969, mise en orbite lunaire le 19 juillet, soit environ 3 jours.
 */
export const APOLLO_11_DUREE_TRAJET_JOURS = 3

// ===========================================================================
// Vaisseau (étape 3d)
// ===========================================================================

/**
 * Diamètre moyen de la Lune, en kilomètres.
 * Source : NASA, Moon Fact Sheet (nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html),
 * 3 474,8 km ; valeur retenue pour le jeu : 3 474 km.
 */
export const DIAMETRE_LUNE_KM = 3474

/** Rayon de la Lune en kilomètres, déduit du diamètre. */
export const RAYON_LUNE_KM = DIAMETRE_LUNE_KM / 2

/**
 * Vitesse du vaisseau dans la démonstration, en kilomètres par seconde.
 * Source : choix de jeu, du même ordre que la vitesse de la Terre autour du
 * Soleil (29,78 km/s, NASA, Earth Fact Sheet). À cette vitesse la Lune est à
 * environ 3,6 heures de la Terre : trop long pour une démonstration, d'où
 * le facteur d'accélération du temps ci-dessous.
 */
export const VITESSE_DEMO_KM_S = 30

/**
 * Facteur d'accélération du temps pour la démonstration : une seconde réelle
 * fait avancer le vaisseau de ce nombre de secondes de voyage. Source : choix
 * de jeu. Avec 600, les 3,6 heures de trajet vers la Lune durent environ 21
 * secondes à l'écran, et la taille de la Terre change de façon visible.
 * N'agit que sur le déplacement : le virage et les effets restent en temps réel.
 */
export const FACTEUR_ACCELERATION_TEMPS = 600

/**
 * Plus grand pas de temps pris en compte par avancer(), en secondes. Quand
 * l'onglet reste inactif puis revient, dt peut valoir plusieurs minutes : sans
 * borne, le vaisseau ferait un saut énorme. Source : choix de jeu (environ
 * 6 images à 60 i/s).
 */
export const DT_MAX_S = 0.1

/**
 * Vitesse maximale de rotation du cap (lacet et tangage), en degrés par
 * seconde. Source : confort de mouvement pour un enfant de 7 ans (jeu aussi
 * destiné à un enfant) : les virages rapides donnent le mal des transports.
 */
export const VITESSE_ROTATION_CAP_MAX_DEG_S = 4

/**
 * Tangage maximal, en degrés au-dessus ou au-dessous de l'horizon. Source :
 * choix de jeu. Évite le retournement du vaisseau aux pôles.
 */
export const TANGAGE_MAX_DEG = 80

/**
 * Amplitude maximale du roulis de dérive, en degrés. Source : confort de
 * mouvement : un roulis de plus d'un degré est vite ressenti comme un
 * basculement ; on reste sous ce seuil.
 */
export const ROULIS_AMPLITUDE_MAX_DEG = 0.8

/**
 * Bornes de l'échelle visuelle des vitesses, en km/s. En dessous du minimum
 * l'intensité visuelle vaut 0, au-dessus du maximum elle vaut 1, entre les
 * deux elle suit une échelle logarithmique. Source : choix de jeu. Le minimum
 * est de l'ordre d'une manœuvre lente, le maximum dépasse la vitesse de la
 * Terre sur son orbite (29,78 km/s).
 */
export const VITESSE_VISUELLE_MIN_KM_S = 0.1
export const VITESSE_VISUELLE_MAX_KM_S = 100

/**
 * Position de départ du vaisseau en kilomètres (la Terre est à l'origine, la
 * Lune sur l'axe x) et lacet de départ en degrés. Source : choix de jeu :
 * à environ 134 000 km de la Terre, de côté, cap proche de la Terre, pour que
 * la Terre et la Lune se voient bientôt toutes deux dans le champ de vision.
 */
export const DEPART_POSITION_KM = [-60_000, 0, 120_000] as const
export const DEPART_LACET_DEG = -26.6

/**
 * Diamètres angulaires (en degrés) entre lesquels la taille à l'écran d'un
 * astre suit sa taille réelle ; au-delà, elle est bornée. Source : choix de
 * jeu. Un diamètre réel de 0,5° (la Lune vue de la Terre) serait un point
 * de 9 pixels sur un téléphone : on le compresse vers des tailles lisibles.
 */
export const DIAMETRE_REEL_MIN_DEG = 0.4
export const DIAMETRE_REEL_MAX_DEG = 90

/**
 * Diamètres angulaires affichés (en degrés) pour les deux bornes précédentes.
 * Source : choix de jeu (le champ de vision vertical de la caméra est de 50°).
 */
export const DIAMETRE_AFFICHE_MIN_DEG = 2.5
export const DIAMETRE_AFFICHE_MAX_DEG = 70

/**
 * Pilotage automatique de la démonstration : le vaisseau vise un point situé à
 * ce nombre de rayons au-dessus de l'astre (il le frôle sans le traverser).
 * Source : choix de jeu.
 */
export const DEMO_PASSAGE_RAYONS = 3

/**
 * La démonstration passe à l'astre suivant quand le vaisseau est à moins de
 * cette distance du point visé (en km), ou après DEMO_DUREE_MAX_CIBLE_S
 * secondes de temps réel si le virage borné ne l'a pas amené assez près.
 * Source : choix de jeu.
 */
export const DEMO_DISTANCE_CHANGEMENT_KM = 80_000
export const DEMO_DUREE_MAX_CIBLE_S = 45

// ===========================================================================
// Niveaux (étape 4a)
// ===========================================================================

/**
 * Chiffres significatifs affichés à chaque niveau de connaissance (1 Découverte,
 * 2 Explorateur, 3 Navigateur, 4 Expert). Source : choix pédagogique. Les niveaux
 * 1 et 3 gardent les valeurs des anciens profils enfant (2) et adulte (4).
 */
export const CHIFFRES_SIGNIFICATIFS_NIVEAU: Readonly<Record<1 | 2 | 3 | 4, number>> = {
  1: 2,
  2: 3,
  3: 4,
  4: 5,
}

/**
 * Comparaisons imagées (« 30 diamètres de la Terre ») visibles à chaque niveau.
 * Source : choix pédagogique. L'expert lit directement les grandeurs.
 */
export const COMPARAISONS_IMAGEES_NIVEAU: Readonly<Record<1 | 2 | 3 | 4, boolean>> = {
  1: true,
  2: true,
  3: true,
  4: false,
}

/** Formules de calcul visibles à chaque niveau. Source : choix pédagogique. */
export const FORMULES_VISIBLES_NIVEAU: Readonly<Record<1 | 2 | 3 | 4, boolean>> = {
  1: false,
  2: false,
  3: true,
  4: true,
}

/** Notation scientifique (3,844 × 10⁵ km) à chaque niveau. Source : choix pédagogique. */
export const NOTATION_SCIENTIFIQUE_NIVEAU: Readonly<Record<1 | 2 | 3 | 4, boolean>> = {
  1: false,
  2: false,
  3: false,
  4: true,
}

/**
 * Catégories d'information ajoutées à chaque niveau : un niveau voit ses propres
 * catégories et celles de tous les niveaux inférieurs. Source : choix pédagogique,
 * du plus concret (distance, vitesse, temps) au plus abstrait (atmosphère, orbite).
 */
export const CATEGORIES_AJOUTEES_NIVEAU: Readonly<
  Record<1 | 2 | 3 | 4, readonly string[]>
> = {
  1: ['distance', 'vitesse', 'temps'],
  2: ['lumiere', 'radio'],
  3: ['temperature', 'gravite'],
  4: ['atmosphere', 'orbite'],
}

// ===========================================================================
// Astres (étape 4b)
// ===========================================================================

/**
 * Température de 0 °C en kelvins (valeur exacte).
 * Source : définition du kelvin et du degré Celsius, brochure SI du BIPM (9e éd., 2019).
 */
export const KELVIN_ZERO_CELSIUS = 273.15

/**
 * Pascals dans un bar (valeur exacte).
 * Source : définition du bar, 1 bar = 10⁵ Pa, brochure SI du BIPM (9e éd., 2019), tableau 8.
 */
export const PASCAL_PAR_BAR = 100_000

/** Pascals dans un millibar : 1 mbar = 10⁻³ bar, déduit de la constante précédente. */
export const PASCAL_PAR_MILLIBAR = PASCAL_PAR_BAR / 1000

/** Pascals dans un kilopascal. Source : préfixe « kilo » = 10³, brochure SI du BIPM. */
export const PASCAL_PAR_KPA = 1000

/**
 * Facteurs des unités composées des fiches NASA : « 10^24 kg » et « 10^6 km ».
 * Source : écriture des fiches (nssdc.gsfc.nasa.gov/planetary/factsheet).
 */
export const KG_PAR_1E24_KG = 1e24
export const KM_PAR_1E6_KM = 1e6

/**
 * Écart toléré, en kilomètres, entre un diamètre de astres.json et celui de
 * constants.ts : les fiches NASA donnent un rayon au dixième de km, constants.ts
 * un diamètre arrondi au km. Source : choix de jeu.
 */
export const TOLERANCE_CONCORDANCE_DIAMETRE_KM = 1

// ===========================================================================
// Missions (étape 6a)
// ===========================================================================

/**
 * Kilomètres dans un mile international (valeur exacte : 1 mile = 1 609,344 m).
 * Source : accord international sur le yard et la livre (1959), NIST, Handbook 44.
 */
export const MILE_KM = 1.609344

/**
 * Mètres dans un pied (valeur exacte : 0,3048 m).
 * Source : accord international sur le yard et la livre (1959), NIST, Handbook 44.
 */
export const PIED_M = 0.3048

/**
 * Altitude moyenne de la Station spatiale internationale, en miles (« about 250
 * miles »). Sert d'altitude d'orbite basse dans la mission 1.
 * Source : NASA, International Space Station (nasa.gov/international-space-station/),
 * consultée le 2026-10-06 : « Orbiting 250 miles above Earth at 17,500 miles per hour ».
 */
export const ISS_ALTITUDE_MILES = 250

/**
 * Vitesse orbitale de la Station spatiale internationale, en miles par heure.
 * Source : NASA, International Space Station (nasa.gov/international-space-station/),
 * consultée le 2026-10-06 (même phrase que la constante précédente). Recoupement :
 * le dossier de presse d'Apollo 11 donne 25 567 pieds/s en orbite basse, soit
 * 28 056 km/h (nasa.gov/wp-content/uploads/static/apollo50th/pdf/A11_PressKit.pdf).
 */
export const ISS_VITESSE_MPH = 17_500

/**
 * Gain de vitesse de l'injection translunaire d'Apollo 11, en pieds par seconde.
 * Source : NASA, Apollo 11 Press Kit (release 69-83K), tableau des manœuvres,
 * « Translunar injection, Vel. Change 9,965 » ; consulté le 2026-10-06
 * (nasa.gov/wp-content/uploads/static/apollo50th/pdf/A11_PressKit.pdf). Le texte
 * du même dossier (35 533 − 25 567 pieds/s) donne 9 966 : même valeur à 1 près.
 */
export const APOLLO_11_TLI_DELTA_V_PIEDS_S = 9_965

/** Altitude d'orbite basse en kilomètres, déduite de ISS_ALTITUDE_MILES (environ 402 km). */
export const ALTITUDE_ORBITE_KM = ISS_ALTITUDE_MILES * MILE_KM

/** Vitesse orbitale en kilomètres par heure, déduite de ISS_VITESSE_MPH (environ 28 000 km/h). */
export const VITESSE_ORBITALE_KM_H = ISS_VITESSE_MPH * MILE_KM

/** Vitesse orbitale en kilomètres par seconde (environ 7,8 km/s). */
export const VITESSE_ORBITALE_KM_S = VITESSE_ORBITALE_KM_H / SECONDES_PAR_HEURE

/** Gain de vitesse pour partir vers la Lune, en km/s, déduit des pieds par seconde (environ 3 km/s). */
export const GAIN_VITESSE_LUNE_KM_S = (APOLLO_11_TLI_DELTA_V_PIEDS_S * PIED_M) / METRES_PAR_KM

/**
 * Le voyage vers la Lune s'arrête à ce nombre de rayons lunaires du centre de
 * la Lune. Source : choix de jeu (la Lune remplit alors une grande part du hublot).
 */
export const MISSION_ARRIVEE_LUNE_RAYONS = 10

/**
 * Durée visée du voyage vers la Lune, en secondes de jeu. Source : choix de jeu
 * (« environ une minute », pour que l'enfant ne s'ennuie pas). Avec la vitesse
 * orbitale plus le gain pour la Lune (environ 10,9 km/s) et le facteur
 * FACTEUR_ACCELERATION_TEMPS, le trajet dure en effet un peu moins d'une minute.
 */
export const DUREE_VOYAGE_LUNE_VISEE_S = 60

/** Écart relatif toléré entre la durée visée et la durée réelle du voyage (test). Source : choix de jeu. */
export const TOLERANCE_DUREE_VOYAGE = 0.2

/**
 * Poussée chronométrée : secondes entre le début de l'étape et l'ouverture de la
 * fenêtre de tir. Source : choix de jeu.
 */
export const TIMING_OUVERTURE_S = 3

/**
 * Largeur de la fenêtre de tir de la poussée, en secondes, selon le niveau :
 * large aux bas niveaux (poussée assistée), étroite au niveau Expert.
 * Source : choix de jeu.
 */
export const TIMING_FENETRE_S_NIVEAU: Readonly<Record<1 | 2 | 3 | 4, number>> = {
  1: 6,
  2: 4,
  3: 2.5,
  4: 1.5,
}

/**
 * Écart relatif toléré pour une réponse numérique, selon le niveau (0,10 = 10 %).
 * Les niveaux 1 et 2 voient des valeurs arrondies : leur réponse l'est aussi.
 * Source : choix pédagogique.
 */
export const TOLERANCE_CALCUL_NIVEAU: Readonly<Record<1 | 2 | 3 | 4, number>> = {
  1: 0.1,
  2: 0.05,
  3: 0.02,
  4: 0.01,
}

/**
 * Indices donnés avant la solution expliquée, selon le niveau (au plus le nombre
 * d'indices écrits dans la mission). Source : choix pédagogique.
 */
export const INDICES_MAX_NIVEAU: Readonly<Record<1 | 2 | 3 | 4, number>> = {
  1: 3,
  2: 2,
  3: 1,
  4: 1,
}

/**
 * Secondes d'inactivité avant un rappel doux de l'objectif, selon le niveau :
 * plus long au niveau 1 (l'enfant prend son temps). Jamais une pénalité.
 * Source : choix pédagogique.
 */
export const DELAI_RAPPEL_S_NIVEAU: Readonly<Record<1 | 2 | 3 | 4, number>> = {
  1: 25,
  2: 20,
  3: 15,
  4: 12,
}

// ===========================================================================
// Missions : fin de la mission 1 (étape 6c)
// ===========================================================================

/**
 * Licence de jeu : pendant le voyage vers la Lune, la vitesse du vaisseau reste
 * constante. Le vrai vaisseau ralentit en s'éloignant de la Terre, car la
 * gravité de la Terre le retient (physique de base, pas un chiffre NASA).
 * Le débriefing « Dans la vraie vie… » le dit. Le temps de trajet de l'écran
 * de navigation (APOLLO_11_DUREE_TRAJET_JOURS) n'est pas touché.
 */
export const VOYAGE_VITESSE_CONSTANTE = true

/**
 * Début de l'injection translunaire d'Apollo 11, en heures de mission.
 * Source : NASA, Apollo 11 Mission Overview (nasa.gov/history/apollo-11-mission-overview/),
 * dernière mise à jour affichée 2026-07-29, consultée le 2026-10-06 :
 * « Two hours, 44 minutes and one-and-a-half revolutions after launch, the
 * S-IVB stage reignited for a second burn of five minutes, 48 seconds ».
 */
export const APOLLO_11_TLI_DEBUT_H = 2 + 44 / MINUTES_PAR_HEURE

/** Durée de la poussée d'injection translunaire d'Apollo 11, en secondes (même page : 5 min 48 s). */
export const APOLLO_11_TLI_DUREE_S = 5 * SECONDES_PAR_MINUTE + 48

/**
 * Début de la première manœuvre d'insertion en orbite lunaire d'Apollo 11, en
 * heures de mission. Source : NASA, Apollo 11 Mission Overview, consultée le
 * 2026-10-06 : « At about 75 hours, 50 minutes into the flight, a retrograde
 * firing of the SPS for 357.5 seconds placed the spacecraft into an initial,
 * elliptical-lunar orbit ». Le dossier de presse prévoyait 75:54:28 (plan).
 */
export const APOLLO_11_LOI_H = 75 + 50 / MINUTES_PAR_HEURE

/**
 * Durée du trajet Terre-Lune d'Apollo 11 en heures : de la fin de la poussée
 * d'injection au début de l'insertion lunaire. Valeur calculée à partir des
 * trois constantes NASA ci-dessus (environ 73 heures, soit environ 3 jours).
 */
export const APOLLO_11_TRAJET_H = APOLLO_11_LOI_H - APOLLO_11_TLI_DEBUT_H - APOLLO_11_TLI_DUREE_S / SECONDES_PAR_HEURE

/**
 * Vitesse moyenne du trajet d'Apollo 11, en km/h : la distance Terre-Lune
 * (centre à centre) divisée par la durée du trajet. Valeur CALCULÉE, pas
 * une mesure de la NASA : la vitesse réelle diminue en s'éloignant de la Terre.
 */
export const APOLLO_11_VITESSE_MOYENNE_KM_H = DISTANCE_TERRE_LUNE_KM / APOLLO_11_TRAJET_H

/**
 * Orbite lunaire d'Apollo 11 après la seconde manœuvre : 62 par 70,5 miles
 * (altitude basse et haute). Source : NASA, Apollo 11 Mission Overview,
 * consultée le 2026-10-06 : « a lunar orbit of 62 by 70.5 miles ».
 */
export const APOLLO_11_ORBITE_LUNAIRE_BASSE_MILES = 62
export const APOLLO_11_ORBITE_LUNAIRE_HAUTE_MILES = 70.5

/** Altitude basse de l'orbite lunaire d'Apollo 11 en km (environ 100 km). */
export const APOLLO_11_ORBITE_LUNAIRE_BASSE_KM = APOLLO_11_ORBITE_LUNAIRE_BASSE_MILES * MILE_KM

/** Altitude haute de l'orbite lunaire d'Apollo 11 en km (environ 113 km). */
export const APOLLO_11_ORBITE_LUNAIRE_HAUTE_KM = APOLLO_11_ORBITE_LUNAIRE_HAUTE_MILES * MILE_KM

/**
 * Altitude de l'orbite lunaire du jeu, en km. Source : choix de jeu, entre
 * l'altitude basse et l'altitude haute de l'orbite d'Apollo 11 (test).
 */
export const ALTITUDE_ORBITE_LUNAIRE_KM = 110

/**
 * Temps passé sur la Lune par Armstrong et Aldrin, en heures (21 h 36 min).
 * Source : NASA, Apollo 11 Mission Overview, consultée le 2026-10-06 :
 * « Armstrong and Aldrin spent 21 hours, 36 minutes on the moon's surface ».
 */
export const APOLLO_11_SURFACE_H = 21 + 36 / MINUTES_PAR_HEURE

/**
 * Durée de la sortie sur la surface, en heures (« more than two-and-a-half
 * hours », donc au moins 2,5 heures). Source : NASA, Apollo 11 Mission Overview,
 * consultée le 2026-10-06.
 */
export const APOLLO_11_SORTIE_H = 2.5

/**
 * Masse de roches et de sol lunaires rapportés par Apollo 11, en kg.
 * Source : NASA NSSDCA, Apollo 11 Lunar Module / EASEP
 * (nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059C), consultée
 * le 2026-10-06 : « collected 21.55 kg of lunar rock and soil ».
 */
export const APOLLO_11_ECHANTILLONS_KG = 21.55

/**
 * Descente (scène 9) : valeurs de JEU, aucune n'est mesurée. La gravité lunaire,
 * elle, vient de astres.json. Hauteur de départ de la descente, en mètres.
 */
export const DESCENTE_ALTITUDE_DEPART_M = 120

/** Descente : vitesse de toucher minimale de la zone de réussite, en m/s. Valeur de jeu. */
export const DESCENTE_ZONE_VITESSE_MIN_MS = 0.3

/** Descente : vitesse de toucher maximale de la zone de réussite, en m/s. Valeur de jeu. */
export const DESCENTE_ZONE_VITESSE_MAX_MS = 2

/**
 * Descente : le moteur pousse avec cette force, en multiples de la gravité
 * (2,5 : le vaisseau ralentit à 1,5 fois la gravité). Valeur de jeu.
 */
export const DESCENTE_POUSSEE_FACTEUR_G = 2.5

/**
 * Descente assistée : au-delà de cette vitesse (la vitesse maximale de la zone
 * multipliée par ce nombre), le copilote freine à la place du joueur. 1 : la
 * descente reste toujours dans la zone ; plus le nombre est grand, moins l'aide
 * est forte ; null : aucune aide pendant la descente (rattrapage seulement
 * après une erreur). Valeurs de jeu.
 */
export const DESCENTE_MARGE_ASSISTANCE_NIVEAU: Readonly<Record<1 | 2 | 3 | 4, number | null>> = {
  1: 1,
  2: 2,
  3: 4,
  4: null,
}

/** Saut (scène 10) : hauteur d'un saut sur Terre, en cm. EXEMPLE de jeu, pas une mesure. */
export const SAUT_TERRE_EXEMPLE_CM = 40

/** Combinaison (scène 10) : valeurs de SIMULATION, fictives. Oxygène en pourcentage. */
export const COMBINAISON_OXYGENE_POURCENT = 98

/** Combinaison : pression interne en kPa. Valeur de SIMULATION, fictive. */
export const COMBINAISON_PRESSION_KPA = 30

/** Combinaison : charge de la batterie en pourcentage. Valeur de SIMULATION, fictive. */
export const COMBINAISON_BATTERIE_POURCENT = 100

/**
 * Sites d'entraînement fictifs (scène 8) : planéité du terrain en pourcentage
 * (100 = sol parfaitement plat). Valeurs de JEU : ces sites n'existent pas.
 */
export const SITES_PLANEITE_POURCENT: Readonly<Record<'alpha' | 'beta' | 'gamma', number>> = {
  alpha: 95,
  beta: 60,
  gamma: 90,
}

/** Sites d'entraînement fictifs : part du séjour au soleil, en pourcentage. Valeurs de JEU. */
export const SITES_LUMIERE_POURCENT: Readonly<Record<'alpha' | 'beta' | 'gamma', number>> = {
  alpha: 40,
  beta: 95,
  gamma: 85,
}
