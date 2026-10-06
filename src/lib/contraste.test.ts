import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  analyserCouleur,
  composer,
  contrasteMinimal,
  lireJetons,
  luminance,
  rapportContraste,
  SEUIL_AA_GRAPHIQUE,
  SEUIL_AA_TEXTE,
} from './contraste'

const jetonsCss = readFileSync(
  new URL('../ui/theme/tokens.css', import.meta.url),
  'utf8'
)
const blanc = analyserCouleur('#fff')
const noir = analyserCouleur('#000')

describe('analyserCouleur', () => {
  it('lit les écritures hexadécimales et rgb()', () => {
    expect(analyserCouleur('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 })
    expect(analyserCouleur('#7be8ff')).toEqual({ r: 123, g: 232, b: 255, a: 1 })
    expect(analyserCouleur('rgb(4 16 36 / 0.74)')).toEqual({
      r: 4,
      g: 16,
      b: 36,
      a: 0.74,
    })
    expect(analyserCouleur('rgba(4, 16, 36, 50%)').a).toBe(0.5)
  })

  it('refuse une couleur illisible', () => {
    expect(() => analyserCouleur('bleu')).toThrow(RangeError)
    expect(() => analyserCouleur('rgb(a b c)')).toThrow(RangeError)
  })
})

describe('rapportContraste', () => {
  it('vaut 21 entre noir et blanc, 1 entre deux couleurs identiques', () => {
    expect(rapportContraste(noir, blanc)).toBeCloseTo(21, 5)
    expect(rapportContraste(blanc, blanc)).toBe(1)
  })

  it('correspond à la valeur WCAG connue du gris #767676 sur blanc (4,54)', () => {
    expect(rapportContraste(analyserCouleur('#767676'), blanc)).toBeCloseTo(
      4.54,
      1
    )
  })

  it('est symétrique', () => {
    const a = analyserCouleur('#7be8ff')
    const b = analyserCouleur('#04101f')
    expect(rapportContraste(a, b)).toBeCloseTo(rapportContraste(b, a), 10)
  })

  it('luminance : blanc 1, noir 0', () => {
    expect(luminance(blanc)).toBeCloseTo(1, 10)
    expect(luminance(noir)).toBe(0)
  })
})

describe('contrasteMinimal', () => {
  it('compose le fond translucide sur blanc : un fond sombre à 50 % éclaircit le fond', () => {
    const fond = analyserCouleur('rgb(0 0 0 / 0.5)')
    const sur = composer(fond, blanc)
    expect(sur.r).toBeCloseTo(127.5, 5)
  })

  it('prend le pire des deux arrière-plans (blanc ou noir)', () => {
    const texte = analyserCouleur('#ffffff')
    const fond = analyserCouleur('rgb(0 0 0 / 0.5)')
    // Sur blanc : fond gris moyen, contraste plus faible que sur noir.
    expect(contrasteMinimal(texte, fond)).toBeLessThan(
      rapportContraste(texte, noir)
    )
  })

  it('détecte un texte illisible sur fond clair', () => {
    expect(
      contrasteMinimal(analyserCouleur('#ffffff'), analyserCouleur('#fff'))
    ).toBeCloseTo(1, 5)
  })
})

describe('jetons de design (tokens.css)', () => {
  for (const ambiance of ['aventure', 'cinema'] as const) {
    describe(`ambiance « ${ambiance} »`, () => {
      const jetons = lireJetons(jetonsCss, ambiance)
      const couleur = (nom: string) => {
        expect(jetons[nom], `jeton ${nom} manquant`).toBeDefined()
        return analyserCouleur(jetons[nom])
      }

      // Textes : 4,5:1 (AA) contre le pire fond, à l'opacité réelle du panneau.
      const textes: readonly [string, string][] = [
        ['--hud-texte', '--hud-fond'],
        ['--hud-texte-doux', '--hud-fond'],
        ['--role-info', '--hud-fond'],
        ['--role-valide', '--hud-fond'],
        ['--hud-ligne', '--hud-fond'],
        ['--hud-texte', '--hud-fond-actif'],
        ['--hud-ligne', '--hud-fond-actif'],
        ['--hud-texte', '--hud-fond-alerte'],
      ]
      for (const [texte, fond] of textes) {
        it(`${texte} sur ${fond} : au moins ${SEUIL_AA_TEXTE}:1, même sur fond blanc`, () => {
          const rapport = contrasteMinimal(couleur(texte), couleur(fond))
          expect(rapport).toBeGreaterThanOrEqual(SEUIL_AA_TEXTE)
        })
      }

      // Graphiques (traits, jauges, pastilles) : 3:1.
      const graphiques = ['--role-deco', '--role-avert', '--role-alerte']
      for (const nom of graphiques) {
        it(`${nom} sur --hud-fond : au moins ${SEUIL_AA_GRAPHIQUE}:1 (non textuel)`, () => {
          const rapport = contrasteMinimal(couleur(nom), couleur('--hud-fond'))
          expect(rapport).toBeGreaterThanOrEqual(SEUIL_AA_GRAPHIQUE)
        })
      }

      it('limite les accents à trois couleurs', () => {
        const accents = new Set(
          ['--role-info', '--role-valide', '--role-avert', '--role-alerte'].map(
            (nom) => jetons[nom].toLowerCase()
          )
        )
        expect(accents.size).toBeLessThanOrEqual(3)
      })

      it('prend un texte de 14 px au minimum pour les tailles de texte', () => {
        for (const nom of ['--txt-s', '--txt-m', '--txt-l', '--txt-xl']) {
          expect(jetons[nom], nom).toMatch(/^max\(14px,/)
        }
      })
    })
  }

  it('échoue quand une couleur passe sous le seuil (contrôle du test lui-même)', () => {
    const fond = analyserCouleur('rgb(4 16 36 / 0.74)')
    const pale = analyserCouleur('#6a7a8a')
    expect(contrasteMinimal(pale, fond)).toBeLessThan(SEUIL_AA_TEXTE)
  })
})
