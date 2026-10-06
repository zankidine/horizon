/**
 * Lecture d'un nombre tapé par le joueur, à la française. Fonction pure.
 *
 * Accepté : « 384 400 », « 384400 », « 384,4 », « 384 400 km », « 39 % ».
 *  - les espaces (normales, insécables, fines) entre les chiffres sont ignorées ;
 *  - la virgule est la marque décimale (le point aussi, par tolérance) ;
 *  - une unité facultative peut suivre le nombre (lettres, %, /, ², °) ;
 *  - un point seul n'est jamais un séparateur de milliers : « 384.400 » vaut 384,4.
 * Refusé (null) : texte vide, lettres seules, caractères au milieu du nombre.
 */

const ESPACES = '\\s\\u00a0\\u202f\\u2009'
/** Signe facultatif, chiffres (avec espaces de groupement), partie décimale facultative. */
const MOTIF = new RegExp(`^\\s*([+-]?)((?:\\d[${ESPACES}]*)*\\d|)(?:[.,](\\d+))?(.*)$`, 's')
/** Unité : des lettres, %, °, /, ², ³, µ, avec espaces, jamais de chiffre. */
const UNITE = /^[\s\u00a0\u202f\u2009]*[A-Za-zÀ-ÿ%°µ/²³][A-Za-zÀ-ÿ%°µ/²³.\s\u00a0\u202f\u2009-]*$/

export function lireNombreFr(texte: string): number | null {
  const m = MOTIF.exec(texte)
  if (!m) return null
  const [, signe, entier, decimales, reste] = m
  if (entier === '' && decimales === undefined) return null
  if (reste.trim() !== '' && !UNITE.test(reste)) return null
  const chiffres = entier.replace(new RegExp(`[${ESPACES}]`, 'g'), '')
  const valeur = Number(`${chiffres === '' ? '0' : chiffres}${decimales === undefined ? '' : `.${decimales}`}`)
  if (!Number.isFinite(valeur)) return null
  return signe === '-' ? -valeur : valeur
}
