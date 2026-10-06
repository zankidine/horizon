/**
 * Textes et données de démonstration du HUD (src/data/hud.json), validés
 * à la main comme les autres données : un texte existe en version enfant
 * et adulte, un modèle contient ses marqueurs.
 */
import {
  ErreurValidation,
  estObjet,
  verifierTexteProfil,
  type TexteProfil,
} from '../core/validation'

export interface TextesHud {
  hud: { groupe: TexteProfil; masquer: TexteProfil; afficher: TexteProfil }
  cap: { titre: TexteProfil }
  statut: {
    titre: TexteProfil
    energie: TexteProfil
    bouclier: TexteProfil
    propulsion: TexteProfil
    reacteur: TexteProfil
    signal: TexteProfil
  }
  cible: { titre: TexteProfil; distance: TexteProfil; reticule: TexteProfil }
  copilote: { titre: TexteProfil; prefixe: TexteProfil; message: TexteProfil }
  alerte: { message: TexteProfil }
  systeme: { entete: TexteProfil; fermer: TexteProfil; vide: TexteProfil }
  icones: {
    navigation: TexteProfil
    scan: TexteProfil
    communications: TexteProfil
  }
  veille: TexteProfil
  ecran: Record<CleEcran, TexteProfil>
  fiche: Record<CleFiche, TexteProfil>
  cibles: Record<'lune' | 'terre', TexteProfil>
}

const CLES_ECRAN = [
  'simulation',
  'scanEnCours',
  'indisponible',
  'source',
  'sourceNasa',
  'horloge',
  'tiroirSystemes',
  'tiroirCible',
  'tiroirTrajet',
  'fermerTiroir',
  'radar',
  'legendeRadar',
  'vitesse',
  'arrivee',
  'arriveeInconnue',
  'restant',
  'progression',
  'nouvelleCible',
] as const
export type CleEcran = (typeof CLES_ECRAN)[number]

const CLES_FICHE = [
  'distance',
  'diametre',
  'taille',
  'vitesse',
  'duree',
  'lumiere',
  'radio',
  'temperature',
  'gravite',
  'atmosphere',
  'orbite',
] as const
export type CleFiche = (typeof CLES_FICHE)[number]

/** Données factices en attendant le vrai état du vaisseau. */
export interface DemoHud {
  energie: number
  bouclier: number
  propulsion: number
}

export interface DonneesHud {
  textes: TextesHud
  demo: DemoHud
}

/** Chemins de textes attendus, avec les marqueurs que chaque version doit contenir. */
const TEXTES: Readonly<Record<string, readonly string[]>> = {
  'hud.groupe': [],
  'hud.masquer': [],
  'hud.afficher': [],
  'cap.titre': [],
  'statut.titre': [],
  'statut.energie': [],
  'statut.bouclier': [],
  'statut.propulsion': [],
  'statut.reacteur': [],
  'statut.signal': [],
  'cible.titre': [],
  'cible.distance': ['valeur'],
  'cible.reticule': ['nom'],
  'copilote.titre': [],
  'copilote.prefixe': [],
  'copilote.message': [],
  'alerte.message': [],
  'systeme.entete': [],
  'systeme.fermer': [],
  'systeme.vide': [],
  'icones.navigation': [],
  'icones.scan': [],
  'icones.communications': [],
  veille: [],
  ...Object.fromEntries(
    CLES_ECRAN.map((cle) => [
      `ecran.${cle}`,
      cle === 'source'
        ? ['source']
        : cle === 'arrivee' || cle === 'restant'
          ? ['valeur']
          : cle === 'nouvelleCible'
            ? ['nom']
            : [],
    ])
  ),
  ...Object.fromEntries(CLES_FICHE.map((cle) => [`fiche.${cle}`, []])),
  'cibles.lune': [],
  'cibles.terre': [],
}

const CHAMPS_FRACTION = ['energie', 'bouclier', 'propulsion'] as const

function lire(donnees: unknown, chemin: string): unknown {
  return chemin
    .split('.')
    .reduce<unknown>(
      (courant, cle) => (estObjet(courant) ? courant[cle] : undefined),
      donnees
    )
}

function fraction(valeur: unknown): valeur is number {
  return typeof valeur === 'number' && valeur >= 0 && valeur <= 1
}

/** Valide hud.json ; lève ErreurValidation avec tous les problèmes. */
export function validerDonneesHud(donnees: unknown): DonneesHud {
  const problemes: string[] = []
  if (!estObjet(donnees)) {
    throw new ErreurValidation('données du HUD', ['objet attendu'])
  }

  for (const [chemin, marqueurs] of Object.entries(TEXTES)) {
    const texte = lire(donnees.textes, chemin)
    if (!verifierTexteProfil(texte, `textes.${chemin}`, problemes)) continue
    for (const profil of ['enfant', 'adulte'] as const) {
      for (const marqueur of marqueurs) {
        if (!texte[profil].includes(`{${marqueur}}`)) {
          problemes.push(
            `textes.${chemin}.${profil} : marqueur {${marqueur}} manquant`
          )
        }
      }
    }
  }

  const demo = donnees.demo
  if (!estObjet(demo)) {
    problemes.push('demo : objet attendu')
  } else {
    for (const champ of CHAMPS_FRACTION) {
      if (!fraction(demo[champ])) {
        problemes.push(`demo.${champ} : nombre entre 0 et 1 attendu`)
      }
    }
  }

  if (problemes.length > 0)
    throw new ErreurValidation('données du HUD', problemes)
  return donnees as unknown as DonneesHud
}
