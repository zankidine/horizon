import { VITESSES } from './navigation'
import { ErreurValidation, estObjet, verifierTexteProfil, type TexteProfil } from './validation'
import type { VitesseCroisiere } from './constants'

export interface TextesNavigation {
  titre: TexteProfil
  choixDestination: TexteProfil
  bientot: TexteProfil
  choixVitesse: TexteProfil
  vitesses: Record<VitesseCroisiere, TexteProfil>
  resultats: TexteProfil
  distance: TexteProfil
  duree: TexteProfil
  lumiere: TexteProfil
  radio: TexteProfil
  comparaisons: TexteProfil
  vraieVie: { titre: TexteProfil; apollo: TexteProfil; fictives: TexteProfil }
  confirmer: TexteProfil
}

/** Textes simples (sans marqueur). */
const SIMPLES = ['titre', 'choixDestination', 'bientot', 'choixVitesse', 'resultats', 'comparaisons', 'confirmer'] as const

/** Modèles de texte et marqueurs {…} que chacun doit contenir. */
const MODELES: Readonly<Record<string, readonly string[]>> = {
  distance: ['valeur'],
  duree: ['valeur'],
  lumiere: ['valeur'],
  radio: ['valeur'],
  'vraieVie.apollo': ['duree', 'fois'],
}

function lire(donnees: Record<string, unknown>, chemin: string): unknown {
  return chemin.split('.').reduce<unknown>((courant, cle) => (estObjet(courant) ? courant[cle] : undefined), donnees)
}

/** Valide les textes de l'écran de navigation ; lève ErreurValidation avec tous les problèmes. */
export function validerTextesNavigation(donnees: unknown): TextesNavigation {
  if (!estObjet(donnees)) throw new ErreurValidation('textes de navigation', ['objet attendu'])
  const problemes: string[] = []

  for (const cle of SIMPLES) verifierTexteProfil(donnees[cle], cle, problemes)
  verifierTexteProfil(lire(donnees, 'vraieVie.titre'), 'vraieVie.titre', problemes)
  verifierTexteProfil(lire(donnees, 'vraieVie.fictives'), 'vraieVie.fictives', problemes)

  const vitesses = donnees.vitesses
  if (!estObjet(vitesses)) {
    problemes.push('vitesses : objet attendu')
  } else {
    for (const vitesse of VITESSES) verifierTexteProfil(vitesses[vitesse], `vitesses.${vitesse}`, problemes)
    for (const cle of Object.keys(vitesses)) {
      if (!(VITESSES as readonly string[]).includes(cle)) {
        problemes.push(`vitesses.${cle} : vitesse inconnue (attendu : ${VITESSES.join(', ')})`)
      }
    }
  }

  for (const [chemin, marqueurs] of Object.entries(MODELES)) {
    const texte = lire(donnees, chemin)
    if (!verifierTexteProfil(texte, chemin, problemes)) continue
    for (const profil of ['enfant', 'adulte'] as const) {
      for (const marqueur of marqueurs) {
        if (!texte[profil].includes(`{${marqueur}}`)) {
          problemes.push(`${chemin}.${profil} : le marqueur {${marqueur}} manque`)
        }
      }
    }
  }

  if (problemes.length > 0) throw new ErreurValidation('textes de navigation', problemes)
  return donnees as unknown as TextesNavigation
}
