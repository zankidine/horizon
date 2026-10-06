/**
 * Caractères que les polices du HUD (Rajdhani, Share Tech Mono) doivent
 * afficher. Les fichiers woff2 sont réduits à ces plages : latin avec
 * accents français et quelques signes. La page polices-demo.html vérifie
 * à l'écran que chaque caractère existe vraiment dans chaque police.
 */

/** Plages Unicode gardées dans les fichiers woff2 (bornes incluses). */
export const PLAGES_UNICODE: readonly (readonly [number, number])[] = [
  [0x0020, 0x007e], // ASCII imprimable
  [0x00a0, 0x00ff], // Latin-1 : é è ê à ç « » ° × ÷ …
  [0x0152, 0x0153], // Œ œ
  [0x0178, 0x0178], // Ÿ
  [0x2013, 0x2014], // – —
  [0x2018, 0x2019], // ‘ ’
  [0x201c, 0x201d], // “ ”
  [0x2026, 0x2026], // …
  [0x20ac, 0x20ac], // €
  [0x2212, 0x2212], // −
  [0x2248, 0x2248], // ≈
]

/** Caractères demandés, avec ceux de la langue et des unités du HUD. */
export const CARACTERES_REQUIS = 'éèêëàâçîïôùûüœÉÈÊÀÇŒ«»…°×÷≈’“”–−€%'

export function dansPlages(point: number): boolean {
  return PLAGES_UNICODE.some(([min, max]) => point >= min && point <= max)
}

/** Caractères qui ne sont pas dans les plages gardées. */
export function horsPlages(caracteres: string): string[] {
  return [...caracteres].filter((c) => !dansPlages(c.codePointAt(0) ?? 0))
}

/**
 * Détecte les caractères absents d'une police. `largeur(famille, texte)`
 * mesure un texte ; on compare deux replis de largeurs différentes : si
 * le caractère existe dans la police, le repli ne change rien.
 */
export function caracteresAbsents(
  caracteres: string,
  largeur: (famille: 'repli-a' | 'repli-b', caractere: string) => number
): string[] {
  return [...caracteres].filter(
    (c) => largeur('repli-a', c) !== largeur('repli-b', c)
  )
}
