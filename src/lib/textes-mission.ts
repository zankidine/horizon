/**
 * Textes du panneau de mission (src/data/mission-ui.json) : libellés des
 * boutons, consignes et messages de l'interface. Chaque texte existe en
 * version enfant et adulte ; un modèle garde ses {marqueurs}. Validé à la main.
 */
import { ErreurValidation, estObjet, verifierTexteProfil, type TexteProfil } from '../core/validation'
import { remplir } from './format-fr'
import type { Profil } from '../core/comparisons'

export const CLES_TEXTES_MISSION = [
  'suivant',
  'indice',
  'lire',
  'lireAria',
  'fermer',
  'valider',
  'continuer',
  'recommencer',
  'changerNiveau',
  'journal',
  'appris',
  'retourMission',
  'scene',
  'etoiles',
  'objectif',
  'locuteurControle',
  'locuteurNarrateur',
  'retourIndice',
  'retourSolution',
  'retourAssistance',
  'retourRappel',
  'assistance',
  'saisieEtiquette',
  'saisieInvalide',
  'choisirReponse',
  'actionConsigne',
  'ordreImpose',
  'ordreLibre',
  'interrupteurAllume',
  'interrupteurEteint',
  'observationConsigne',
  'modeReperer',
  'modeScanner',
  'observationBouton',
  'timingPousser',
  'timingAttente',
  'timingOuvert',
  'timingFenetreRestante',
  'voyageExplication',
  'voyageProgression',
  'voyageDistanceRestante',
  'voyageVitesse',
  'voyageJalons',
  'voyageAucunJalon',
  'descenteConsigne',
  'descenteAltitude',
  'descenteVitesse',
  'descenteZone',
  'descenteDansZone',
  'descenteTropRapide',
  'moteurAllume',
  'moteurEteint',
  'repriseTitre',
  'finTitre',
  'finBilan',
  'finAppris',
  'finJournal',
  'journalTitre',
  'journalVide',
  'apprisTitre',
  'apprisVide',
  'voixAbsente',
  'panneauMission',
] as const
export type CleTexteMission = (typeof CLES_TEXTES_MISSION)[number]
export type TextesMission = Record<CleTexteMission, TexteProfil>

/** Marqueurs attendus dans les modèles qui en ont (les deux versions doivent les garder). */
export const MARQUEURS_TEXTES_MISSION: Readonly<Partial<Record<CleTexteMission, readonly string[]>>> = {
  scene: ['numero', 'total'],
  etoiles: ['etoiles', 'max'],
  observationBouton: ['mode', 'astre'],
  timingFenetreRestante: ['secondes'],
  voyageProgression: ['pourcent'],
  voyageDistanceRestante: ['distance'],
  voyageVitesse: ['vitesse'],
  descenteAltitude: ['altitude'],
  descenteVitesse: ['vitesse'],
  descenteZone: ['max'],
  repriseTitre: ['numero', 'total'],
  finBilan: ['etoiles', 'max'],
}

export function validerTextesMission(donnees: unknown): TextesMission {
  const problemes: string[] = []
  if (!estObjet(donnees)) throw new ErreurValidation('mission-ui.json', ['objet attendu'])
  const resultat: Partial<TextesMission> = {}
  for (const cle of CLES_TEXTES_MISSION) {
    const valeur = donnees[cle]
    if (!verifierTexteProfil(valeur, cle, problemes)) continue
    for (const marqueur of MARQUEURS_TEXTES_MISSION[cle] ?? []) {
      for (const profil of ['enfant', 'adulte'] as const) {
        if (!valeur[profil].includes(`{${marqueur}}`)) problemes.push(`${cle}.${profil} : marqueur {${marqueur}} absent`)
      }
    }
    resultat[cle] = valeur
  }
  for (const cle of Object.keys(donnees)) {
    if (!(CLES_TEXTES_MISSION as readonly string[]).includes(cle)) problemes.push(`${cle} : clé inconnue`)
  }
  if (problemes.length > 0) throw new ErreurValidation('mission-ui.json', problemes)
  return resultat as TextesMission
}

/** Texte d'un profil, avec ses marqueurs remplacés. */
export function texteMission(
  textes: TextesMission,
  cle: CleTexteMission,
  profil: Profil,
  valeurs: Readonly<Record<string, string>> = {}
): string {
  return remplir(textes[cle][profil], valeurs)
}
