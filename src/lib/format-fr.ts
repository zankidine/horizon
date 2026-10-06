import {
  CHIFFRES_SIGNIFICATIFS,
  dureeArrondie,
  type Comparaison,
  type Formule,
  type Grandeur,
  type TypeComparaison,
  type UniteComparaison,
} from '../core/comparisons'

/** Espace insécable : colle un nombre à son unité. */
const ESPACE_INSECABLE = ' '

/** Décimales gardées à l'affichage (au-delà, ce serait du bruit de calcul). */
const DECIMALES_MAX = 6

const formatNombre = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: DECIMALES_MAX })
const reglesPluriel = new Intl.PluralRules('fr')

/** Formate un nombre à la française : milliers séparés, virgule décimale. */
export function formaterNombre(valeur: number): string {
  return formatNombre.format(valeur)
}

/**
 * Accorde un nom avec un nombre. En français, 0, 1 et 1,5 sont au singulier,
 * à partir de 2 c'est le pluriel (règle fournie par Intl.PluralRules).
 * L'accord se fait sur la valeur telle qu'elle est affichée.
 */
export function accorder(valeur: number, singulier: string, pluriel: string): string {
  const affichee = Number(valeur.toFixed(DECIMALES_MAX))
  return reglesPluriel.select(affichee) === 'one' ? singulier : pluriel
}

/** Noms [singulier, pluriel] de chaque unité de comparaison. */
const NOMS: Readonly<Record<UniteComparaison, readonly [string, string]>> = {
  'distance-terre-lune': ['distance Terre-Lune', 'distances Terre-Lune'],
  'diametre-terre': ['diamètre de la Terre', 'diamètres de la Terre'],
  'tour-eiffel': ['tour Eiffel', 'tours Eiffel'],
  'terrain-foot': ['terrain de foot', 'terrains de foot'],
  seconde: ['seconde', 'secondes'],
  minute: ['minute', 'minutes'],
  heure: ['heure', 'heures'],
  jour: ['jour', 'jours'],
  mois: ['mois', 'mois'],
  an: ['an', 'ans'],
}

/** Met une quantité en français : « 1,5 an », « 30 diamètres de la Terre ». */
export function formaterQuantite(valeur: number, unite: UniteComparaison): string {
  const [singulier, pluriel] = NOMS[unite]
  return `${formaterNombre(valeur)} ${accorder(valeur, singulier, pluriel)}`
}

/** Met une grandeur avec son unité de formule : « 384 400 km ». */
export function formaterGrandeur({ valeur, unite }: Grandeur): string {
  const nombre = formaterNombre(valeur)
  return unite ? `${nombre}${ESPACE_INSECABLE}${unite}` : nombre
}

/** Écrit la formule d'un calcul : « 384 400 km ÷ 12 742 km ≈ 30,17 ». */
export function formaterFormule(formule: Formule): string {
  const signe = formule.resultatExact ? '=' : '≈'
  return [
    formaterGrandeur(formule.dividende),
    '÷',
    formaterGrandeur(formule.diviseur),
    signe,
    formaterGrandeur(formule.resultat),
  ].join(' ')
}

const PHRASES: Readonly<Record<TypeComparaison, (quantite: string) => string>> = {
  'distance-terre-lune': (q) => `Cela représente ${q}.`,
  'diametre-terre': (q) => `Cela représente ${q}.`,
  'tour-eiffel': (q) => `Cela représente ${q} bout à bout.`,
  'terrain-foot': (q) => `Cela représente ${q} bout à bout.`,
  'temps-lumiere': (q) => `La lumière met ${q} pour faire ce trajet.`,
  'trajet-marche': (q) => `À pied, sans s'arrêter, il faut ${q}.`,
  'trajet-voiture': (q) => `En voiture, sans s'arrêter, il faut ${q}.`,
}

export interface ComparaisonFr {
  phrase: string
  /** Présente seulement pour le profil adulte. */
  formule?: string
}

/** Met une comparaison en français : une phrase, et la formule si elle existe. */
export function formaterComparaison(comparaison: Comparaison): ComparaisonFr {
  const quantite = formaterQuantite(comparaison.valeur, comparaison.unite)
  const avecEnviron = comparaison.approximatif ? `environ ${quantite}` : quantite
  const resultat: ComparaisonFr = { phrase: PHRASES[comparaison.type](avecEnviron) }
  if (comparaison.formule) resultat.formule = formaterFormule(comparaison.formule)
  return resultat
}

export function formaterComparaisons(comparaisons: readonly Comparaison[]): ComparaisonFr[] {
  return comparaisons.map(formaterComparaison)
}

/**
 * Met une durée en secondes en français (« 3 jours », « 1,3 seconde »), dans
 * l'unité la plus lisible. Réutilise l'arrondi de comparer(), y compris le
 * passage à l'unité suivante (59,6 secondes donnent « 1 minute »).
 */
export function formaterDuree(
  secondes: number,
  chiffres: number = CHIFFRES_SIGNIFICATIFS.enfant
): string {
  const { valeur, unite } = dureeArrondie(secondes, chiffres)
  return formaterQuantite(valeur, unite)
}

/** Remplace les {marqueurs} d'un modèle de texte (venant des données JSON) par des valeurs. */
export function remplir(modele: string, valeurs: Readonly<Record<string, string>>): string {
  return modele.replace(/\{(\w+)\}/g, (marqueur, cle: string) => valeurs[cle] ?? marqueur)
}
