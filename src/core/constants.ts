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
