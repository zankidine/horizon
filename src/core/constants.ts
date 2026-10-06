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
