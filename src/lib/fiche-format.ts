/**
 * Mise en forme française des valeurs de la fiche : espace insécable entre le
 * nombre et l'unité, durées dans l'unité la plus lisible.
 */
import type { UniteFiche } from './fiche'
import { formaterDuree, formaterNombre } from './format-fr'

const ESPACE_INSECABLE = '\u00a0'

export function formaterValeurFiche(valeur: {
  nombre: number
  unite: UniteFiche
}): string {
  const { nombre, unite } = valeur
  if (!Number.isFinite(nombre)) return ''
  switch (unite) {
    case 'km':
      return `${formaterNombre(Math.round(nombre))}${ESPACE_INSECABLE}km`
    case 'km/h':
      return `${formaterNombre(Math.round(nombre))}${ESPACE_INSECABLE}km/h`
    case 'deg':
      return `${formaterNombre(Math.round(nombre * 100) / 100)}${ESPACE_INSECABLE}°`
    case 's':
      return formaterDuree(nombre)
  }
}
