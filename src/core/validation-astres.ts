import { ErreurValidation, estObjet } from './validation'

/** Unités des données astronomiques, telles qu'elles sont écrites dans la source. */
export const UNITES_ASTRES = [
  'km',
  '1e6 km',
  '1e24 kg',
  'm/s2',
  'K',
  'mb',
  'bar',
  'h',
  'j',
  'nombre',
  '%',
  'cm-3',
] as const
export type UniteAstre = (typeof UNITES_ASTRES)[number]

export const PRECISIONS = ['donnee', 'environ', 'estimation'] as const
export type Precision = (typeof PRECISIONS)[number]

export const SENS_TEMPERATURE = ['moyenne', 'plage_diurne', 'jour', 'nuit', 'minimum', 'maximum'] as const
export type SensTemperature = (typeof SENS_TEMPERATURE)[number]

export const SENS_PRESSION = ['surface', 'variation_saisonniere', 'jour', 'nuit'] as const
export type SensPression = (typeof SENS_PRESSION)[number]

export const TYPES_ASTRE = ['planete', 'satellite'] as const
export type TypeAstre = (typeof TYPES_ASTRE)[number]

/** D'où vient une valeur : page exacte, ligne de la page, unité d'origine, date de lecture. */
export interface SourceDonnee {
  nom: string
  url: string
  /** Ligne de la page où la valeur a été lue (en anglais, telle qu'écrite). */
  libelle: string
  /** Absente quand la donnée est indisponible. */
  unite_origine?: UniteAstre
  /** AAAA-MM-JJ. */
  date_consultation: string
  /** « Last Updated » de la page, si elle en a un. */
  mise_a_jour_page?: string
}

interface Commun {
  sens?: string
  /** Précision de lecture : où, quand, dans quel cas la valeur vaut. */
  contexte?: string
}

export interface MesureSimple extends Commun {
  valeur: number
  unite: UniteAstre
  precision: Precision
  source: SourceDonnee
}

export interface MesurePlage extends Commun {
  min: number
  max: number
  unite: UniteAstre
  precision: Precision
  source: SourceDonnee
}

/** Un trou explicite : l'affichage doit montrer « donnée indisponible », jamais zéro. */
export interface MesureIndisponible extends Commun {
  indisponible: true
  raison: string
  source: SourceDonnee
}

export type Mesure = MesureSimple | MesurePlage | MesureIndisponible

export interface Constituant {
  nom: string
  formule: string
  valeur: number
  unite: UniteAstre
}

export interface Composition {
  sens: string
  precision: Precision
  constituants: Constituant[]
  source: SourceDonnee
}

export interface Astre {
  id: string
  nom: string
  type: TypeAstre
  rayonEquatorial: Mesure
  /** Rayon moyen volumétrique : le même sens que le diamètre moyen de constants.ts. */
  rayonMoyen: Mesure
  masse: Mesure
  graviteSurface: Mesure
  temperatures: Array<Mesure & { sens: SensTemperature }>
  atmosphere: {
    pression: Array<Mesure & { sens: SensPression }>
    composition: Composition
  }
  dureeJour: Mesure
  rotationSiderale: Mesure
  periodeOrbitale: Mesure
  distanceSoleil: Mesure
  nombreLunes: Mesure
}

const FORMAT_ID = /^[a-z0-9-]+$/
const FORMAT_DATE = /^\d{4}-\d{2}-\d{2}$/

function estDans<T extends string>(valeurs: readonly T[], valeur: unknown): valeur is T {
  return typeof valeur === 'string' && (valeurs as readonly string[]).includes(valeur)
}

function texteNonVide(valeur: unknown): valeur is string {
  return typeof valeur === 'string' && valeur.trim() !== ''
}

function nombreFini(valeur: unknown): valeur is number {
  return typeof valeur === 'number' && Number.isFinite(valeur)
}

function dateValide(texte: string): boolean {
  if (!FORMAT_DATE.test(texte)) return false
  const date = new Date(`${texte}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(texte)
}

function urlValide(texte: string): boolean {
  try {
    const url = new URL(texte)
    return url.protocol === 'https:' && url.hostname !== ''
  } catch {
    return false
  }
}

/** Vérifie la source : nom, URL https, ligne lue, date ; l'unité d'origine si la donnée existe. */
function verifierSource(brut: unknown, chemin: string, problemes: string[], unite?: unknown) {
  if (!estObjet(brut)) {
    problemes.push(`${chemin} : source { nom, url, libelle, date_consultation } obligatoire`)
    return
  }
  if (!texteNonVide(brut.nom)) problemes.push(`${chemin}.nom : texte non vide attendu`)
  if (!texteNonVide(brut.url) || !urlValide(brut.url)) {
    problemes.push(`${chemin}.url : adresse https valide attendue`)
  }
  if (!texteNonVide(brut.libelle)) problemes.push(`${chemin}.libelle : ligne de la page attendue`)
  if (!texteNonVide(brut.date_consultation) || !dateValide(brut.date_consultation)) {
    problemes.push(`${chemin}.date_consultation : date AAAA-MM-JJ valide attendue`)
  }
  if (brut.mise_a_jour_page !== undefined && !texteNonVide(brut.mise_a_jour_page)) {
    problemes.push(`${chemin}.mise_a_jour_page : texte non vide attendu s'il est présent`)
  }
  if (unite !== undefined && brut.unite_origine !== unite) {
    problemes.push(`${chemin}.unite_origine : doit valoir l'unité de la valeur (« ${String(unite)} »)`)
  }
}

interface ReglesMesure {
  unites: readonly UniteAstre[]
  /** Sens autorisés (et obligatoires) pour cette mesure. */
  sens?: readonly string[]
  plageAutorisee?: boolean
}

function verifierMesure(brut: unknown, chemin: string, problemes: string[], regles: ReglesMesure) {
  if (!estObjet(brut)) {
    problemes.push(`${chemin} : objet { valeur, unite, source } attendu`)
    return
  }
  if (regles.sens) {
    if (!estDans(regles.sens, brut.sens)) {
      problemes.push(`${chemin}.sens : l'une de ces valeurs attendue : ${regles.sens.join(', ')}`)
    }
  } else if (brut.sens !== undefined && !texteNonVide(brut.sens)) {
    problemes.push(`${chemin}.sens : texte non vide attendu s'il est présent`)
  }
  if (brut.contexte !== undefined && !texteNonVide(brut.contexte)) {
    problemes.push(`${chemin}.contexte : texte non vide attendu s'il est présent`)
  }

  if (brut.indisponible !== undefined) {
    if (brut.indisponible !== true) problemes.push(`${chemin}.indisponible : vaut true ou est absent`)
    if (!texteNonVide(brut.raison)) {
      problemes.push(`${chemin}.raison : une donnée indisponible doit dire pourquoi`)
    }
    for (const interdit of ['valeur', 'min', 'max', 'unite']) {
      if (brut[interdit] !== undefined) {
        problemes.push(`${chemin}.${interdit} : interdit pour une donnée indisponible (jamais de zéro à la place)`)
      }
    }
    verifierSource(brut.source, `${chemin}.source`, problemes)
    return
  }

  if (!estDans(UNITES_ASTRES, brut.unite)) {
    problemes.push(`${chemin}.unite : unité attendue (${UNITES_ASTRES.join(', ')})`)
  } else if (!regles.unites.includes(brut.unite)) {
    problemes.push(`${chemin}.unite : « ${brut.unite} » n'est pas permise ici (${regles.unites.join(', ')})`)
  }
  if (!estDans(PRECISIONS, brut.precision)) {
    problemes.push(`${chemin}.precision : l'une de ces valeurs attendue : ${PRECISIONS.join(', ')}`)
  }

  const estPlage = brut.min !== undefined || brut.max !== undefined
  if (estPlage) {
    if (regles.plageAutorisee === false) problemes.push(`${chemin} : une plage n'est pas permise ici`)
    if (brut.valeur !== undefined) problemes.push(`${chemin} : « valeur » et « min/max » ensemble`)
    if (!nombreFini(brut.min) || !nombreFini(brut.max)) {
      problemes.push(`${chemin} : min et max doivent être des nombres`)
    } else if (brut.min > brut.max) {
      problemes.push(`${chemin} : min (${brut.min}) est supérieur à max (${brut.max})`)
    }
  } else if (!nombreFini(brut.valeur)) {
    problemes.push(`${chemin}.valeur : nombre attendu`)
  }
  verifierSource(brut.source, `${chemin}.source`, problemes, brut.unite)
}

function verifierListe(
  brut: unknown,
  chemin: string,
  problemes: string[],
  regles: ReglesMesure
) {
  if (!Array.isArray(brut) || brut.length === 0) {
    problemes.push(`${chemin} : tableau non vide attendu`)
    return
  }
  brut.forEach((m: unknown, i) => verifierMesure(m, `${chemin}[${i}]`, problemes, regles))
}

function verifierComposition(brut: unknown, chemin: string, problemes: string[]) {
  if (!estObjet(brut)) {
    problemes.push(`${chemin} : objet { sens, precision, constituants, source } attendu`)
    return
  }
  if (!texteNonVide(brut.sens)) problemes.push(`${chemin}.sens : texte non vide attendu`)
  if (!estDans(PRECISIONS, brut.precision)) {
    problemes.push(`${chemin}.precision : l'une de ces valeurs attendue : ${PRECISIONS.join(', ')}`)
  }
  if (!Array.isArray(brut.constituants) || brut.constituants.length === 0) {
    problemes.push(`${chemin}.constituants : tableau non vide attendu`)
  } else {
    brut.constituants.forEach((c: unknown, i) => {
      const ch = `${chemin}.constituants[${i}]`
      if (!estObjet(c)) {
        problemes.push(`${ch} : objet attendu`)
        return
      }
      if (!texteNonVide(c.nom)) problemes.push(`${ch}.nom : texte non vide attendu`)
      if (!texteNonVide(c.formule)) problemes.push(`${ch}.formule : texte non vide attendu`)
      if (!nombreFini(c.valeur) || c.valeur < 0) problemes.push(`${ch}.valeur : nombre positif attendu`)
      if (c.unite !== '%' && c.unite !== 'cm-3') problemes.push(`${ch}.unite : « % » ou « cm-3 » attendu`)
    })
  }
  verifierSource(brut.source, `${chemin}.source`, problemes)
}

const UNITES_PRESSION: readonly UniteAstre[] = ['mb', 'bar']

/** Valide les données JSON des astres ; lève ErreurValidation avec tous les problèmes. */
export function validerAstres(donnees: unknown): Astre[] {
  const liste = estObjet(donnees) ? donnees.astres : undefined
  if (!Array.isArray(liste) || liste.length === 0) {
    throw new ErreurValidation('astres', ['« astres » : tableau non vide attendu'])
  }
  const problemes: string[] = []
  const ids = new Set<string>()

  liste.forEach((brut: unknown, i) => {
    const chemin = `astres[${i}]`
    if (!estObjet(brut)) {
      problemes.push(`${chemin} : objet attendu`)
      return
    }
    if (typeof brut.id !== 'string' || !FORMAT_ID.test(brut.id)) {
      problemes.push(`${chemin}.id : identifiant en minuscules, chiffres et tirets attendu`)
    } else if (ids.has(brut.id)) {
      problemes.push(`${chemin}.id : « ${brut.id} » est en double`)
    } else {
      ids.add(brut.id)
    }
    if (!texteNonVide(brut.nom)) problemes.push(`${chemin}.nom : texte non vide attendu`)
    if (!estDans(TYPES_ASTRE, brut.type)) {
      problemes.push(`${chemin}.type : l'une de ces valeurs attendue : ${TYPES_ASTRE.join(', ')}`)
    }

    const simple = (cle: string, unites: readonly UniteAstre[]) =>
      verifierMesure(brut[cle], `${chemin}.${cle}`, problemes, { unites, plageAutorisee: false })
    simple('rayonEquatorial', ['km'])
    simple('rayonMoyen', ['km'])
    simple('masse', ['1e24 kg'])
    simple('graviteSurface', ['m/s2'])
    simple('dureeJour', ['h'])
    simple('rotationSiderale', ['h'])
    simple('periodeOrbitale', ['j'])
    simple('distanceSoleil', ['1e6 km'])
    simple('nombreLunes', ['nombre'])

    verifierListe(brut.temperatures, `${chemin}.temperatures`, problemes, {
      unites: ['K'],
      sens: SENS_TEMPERATURE,
    })
    if (!estObjet(brut.atmosphere)) {
      problemes.push(`${chemin}.atmosphere : objet { pression, composition } attendu`)
    } else {
      verifierListe(brut.atmosphere.pression, `${chemin}.atmosphere.pression`, problemes, {
        unites: UNITES_PRESSION,
        sens: SENS_PRESSION,
      })
      verifierComposition(brut.atmosphere.composition, `${chemin}.atmosphere.composition`, problemes)
    }
  })

  if (problemes.length > 0) throw new ErreurValidation('astres', problemes)
  return liste as Astre[]
}
