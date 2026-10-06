/** Fractions (0 à 1) des jauges du panneau de mission. Fonctions pures. */

const borner = (x: number): number => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0)

export interface JaugeFenetre {
  phase: 'attente' | 'ouverte'
  /** Attente : le voyant se charge de 0 à 1. Ouverte : le temps restant descend de 1 à 0. */
  fraction: number
}

/** Jauge de la poussée chronométrée : `ouvertureS` avant l'ouverture, `largeurS` ensuite. */
export function jaugeFenetre(etat: 'attente' | 'ouverte', restanteS: number, ouvertureS: number, largeurS: number): JaugeFenetre {
  return etat === 'ouverte'
    ? { phase: 'ouverte', fraction: largeurS > 0 ? borner(restanteS / largeurS) : 0 }
    : { phase: 'attente', fraction: ouvertureS > 0 ? borner(1 - restanteS / ouvertureS) : 1 }
}

export interface JaugeVitesse {
  /** Position de la vitesse actuelle. */
  vitesse: number
  /** Début et fin de la zone de réussite. */
  zoneDebut: number
  zoneFin: number
}

/** Jauge de vitesse de la descente : l'échelle s'élargit si la vitesse dépasse la zone. */
export function jaugeVitesse(vitesseMs: number, zone: { min: number; max: number }): JaugeVitesse {
  const echelle = Math.max(zone.max * 2.5, vitesseMs * 1.1, 1e-9)
  return { vitesse: borner(vitesseMs / echelle), zoneDebut: borner(zone.min / echelle), zoneFin: borner(zone.max / echelle) }
}

/** Pourcentage entier d'une part (0 à 1). */
export function pourcent(part: number): number {
  return Math.round(borner(part) * 100)
}
