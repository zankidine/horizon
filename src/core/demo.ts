import { ASTRES } from './astres'
import {
  DEMO_DISTANCE_CHANGEMENT_KM,
  DEMO_DUREE_MAX_CIBLE_S,
  DEMO_PASSAGE_RAYONS,
} from './constants'
import { borneDt, type ConsigneCap, type EtatVaisseau, type Vec3 } from './vaisseau'

/**
 * Pilotage automatique de la démonstration : le vaisseau vise tour à tour la
 * Lune et la Terre, pour que la scène ne soit jamais figée. Le virage est
 * borné par avancer() (confort de mouvement) : la consigne peut être loin du
 * cap, le vaisseau tourne lentement vers elle.
 */

export type CibleDemo = 'lune' | 'terre'

export interface EtatDemo {
  readonly cible: CibleDemo
  /** Secondes de temps réel passées sur la cible actuelle. */
  readonly secondesSurCible: number
}

export function creerDemo(cible: CibleDemo = 'lune'): EtatDemo {
  return { cible, secondesSurCible: 0 }
}

export function autreCible(cible: CibleDemo): CibleDemo {
  return cible === 'lune' ? 'terre' : 'lune'
}

/** Point visé : au-dessus de l'astre, pour le frôler sans le traverser. */
export function pointVise(cible: CibleDemo): Vec3 {
  const astre = ASTRES[cible]
  return [
    astre.position[0],
    astre.position[1] + DEMO_PASSAGE_RAYONS * astre.rayonKm,
    astre.position[2],
  ]
}

/** Cap (lacet, tangage) qui mène de `position` à `point`. Garde le cap actuel si on y est déjà. */
export function capVers(position: Vec3, point: Vec3, capActuel: ConsigneCap): ConsigneCap {
  const dx = point[0] - position[0]
  const dy = point[1] - position[1]
  const dz = point[2] - position[2]
  const distance = Math.hypot(dx, dy, dz)
  if (!(distance > 0)) return capActuel
  return { lacet: Math.atan2(-dx, -dz), tangage: Math.asin(dy / distance) }
}

/**
 * Un pas de pilotage : renvoie la consigne de cap à donner à avancer() et
 * l'état de la démonstration (qui change de cible quand il le faut).
 */
export function pilotageDemo(
  vaisseau: EtatVaisseau,
  demo: EtatDemo,
  dt: number
): { consigne: ConsigneCap; demo: EtatDemo } {
  let { cible, secondesSurCible } = demo
  secondesSurCible += borneDt(dt)

  const [px, py, pz] = pointVise(cible)
  const distance = Math.hypot(
    px - vaisseau.position[0],
    py - vaisseau.position[1],
    pz - vaisseau.position[2]
  )
  if (distance < DEMO_DISTANCE_CHANGEMENT_KM || secondesSurCible > DEMO_DUREE_MAX_CIBLE_S) {
    cible = autreCible(cible)
    secondesSurCible = 0
  }

  const consigne = capVers(vaisseau.position, pointVise(cible), {
    lacet: vaisseau.lacet,
    tangage: vaisseau.tangage,
  })
  return { consigne, demo: { cible, secondesSurCible } }
}
