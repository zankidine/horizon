/**
 * Contraste des couleurs (WCAG 2.x) : fonctions pures, sans DOM. Sert au test
 * qui lit les jetons de design (tokens.css) et échoue si une couleur de texte
 * passe sous 4,5:1 (AA) contre le pire fond possible.
 */
export interface Couleur {
  r: number
  g: number
  b: number
  /** Opacité de 0 à 1. */
  a: number
}

export const SEUIL_AA_TEXTE = 4.5
export const SEUIL_AA_GRAPHIQUE = 3

const BLANC: Couleur = { r: 255, g: 255, b: 255, a: 1 }
const NOIR: Couleur = { r: 0, g: 0, b: 0, a: 1 }

const limiter = (n: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, n))

/**
 * Lit `#rgb`, `#rrggbb`, `rgb(r g b)`, `rgb(r, g, b)`, `rgba(...)` et la
 * notation `rgb(r g b / a)` (a en nombre ou en pourcentage).
 */
export function analyserCouleur(texte: string): Couleur {
  const valeur = texte.trim().toLowerCase()
  const hexa = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(valeur)
  if (hexa) {
    const h =
      hexa[1].length === 3 ? [...hexa[1]].map((c) => c + c).join('') : hexa[1]
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: 1,
    }
  }
  const fonction = /^rgba?\(([^)]+)\)$/.exec(valeur)
  if (fonction) {
    const morceaux = fonction[1].split(/[\s,/]+/).filter(Boolean)
    if (morceaux.length === 3 || morceaux.length === 4) {
      const [r, g, b] = morceaux.slice(0, 3).map(Number)
      const brut = morceaux[3]
      const a =
        brut === undefined
          ? 1
          : brut.endsWith('%')
            ? Number(brut.slice(0, -1)) / 100
            : Number(brut)
      if ([r, g, b, a].every(Number.isFinite)) {
        return {
          r: limiter(r, 0, 255),
          g: limiter(g, 0, 255),
          b: limiter(b, 0, 255),
          a: limiter(a, 0, 1),
        }
      }
    }
  }
  throw new RangeError(`Couleur illisible : « ${texte} »`)
}

/** Pose `dessus` sur un `dessous` opaque (composition alpha). */
export function composer(dessus: Couleur, dessous: Couleur): Couleur {
  const a = dessus.a
  return {
    r: dessus.r * a + dessous.r * (1 - a),
    g: dessus.g * a + dessous.g * (1 - a),
    b: dessus.b * a + dessous.b * (1 - a),
    a: 1,
  }
}

function lineaire(canal: number): number {
  const c = canal / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** Luminance relative WCAG (0 noir, 1 blanc). */
export function luminance(c: Couleur): number {
  return (
    0.2126 * lineaire(c.r) + 0.7152 * lineaire(c.g) + 0.0722 * lineaire(c.b)
  )
}

/** Rapport de contraste WCAG entre deux couleurs opaques (de 1 à 21). */
export function rapportContraste(a: Couleur, b: Couleur): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/**
 * Contraste d'un texte contre le pire fond possible : le fond du panneau,
 * à son opacité réelle, posé sur un arrière-plan blanc (la Terre éclairée)
 * ou noir (l'espace). Le texte est composé sur le fond ainsi obtenu.
 */
export function contrasteMinimal(texte: Couleur, fond: Couleur): number {
  return Math.min(
    ...[BLANC, NOIR].map((arriere) => {
      const fondOpaque = composer(fond, arriere)
      return rapportContraste(composer(texte, fondOpaque), fondOpaque)
    })
  )
}

/** Jetons d'une ambiance : propriétés personnalisées lues dans le CSS, `var()` résolus. */
export function lireJetons(
  css: string,
  ambiance: 'aventure' | 'cinema'
): Record<string, string> {
  const sansCommentaires = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const jetons: Record<string, string> = {}
  const blocs = /([^{}]+)\{([^{}]*)\}/g
  let bloc: RegExpExecArray | null
  while ((bloc = blocs.exec(sansCommentaires))) {
    const parties = bloc[1].split(',').map((p) => p.trim())
    // Chaque sélecteur vise soit toutes les ambiances, soit une seule.
    const vise = (partie: string): string | null =>
      /data-ambiance='(\w+)'/.exec(partie)?.[1] ?? null
    const concerne = parties.some((partie) => {
      if (partie === ':root' || partie === '[data-ambiance]') {
        // « :root » seul vaut pour l'ambiance par défaut quand aucun sélecteur n'en nomme une autre.
        return (
          partie === '[data-ambiance]' ||
          parties.every((p) => vise(p) === null || vise(p) === ambiance)
        )
      }
      return vise(partie) === ambiance
    })
    if (!concerne) continue
    for (const decl of bloc[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      jetons[decl[1]] = decl[2].trim()
    }
  }
  // Résolution des var(--autre) simples, jusqu'à stabilité.
  for (let tour = 0; tour < 5; tour++) {
    for (const [nom, valeur] of Object.entries(jetons)) {
      jetons[nom] = valeur.replace(/var\((--[\w-]+)\)/g, (m, ref: string) =>
        ref in jetons ? jetons[ref] : m
      )
    }
  }
  return jetons
}
