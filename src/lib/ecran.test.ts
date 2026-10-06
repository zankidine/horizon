import { describe, it, expect } from 'vitest'
import { bruit1D, bruit2D, bruitFractal, hash } from './bruit'
import { deriveDouce, onde, oscilloscope, spectre } from './courbes'
import { projeterSurEcran } from './projection'
import {
  angleBalayage,
  azimut,
  intensiteBlip,
  pointsDecoratifs,
  rayonRadar,
} from './radar'
import { choisirMiseEnPage, HAUTEUR_COMPACTE_PX } from './miseEnPage'
import {
  doitAnimer,
  doitDessiner,
  IMAGES_PAR_SECONDE,
  imageDue,
  MAX_CANVAS_ANIMES,
  moyenne,
  moyenneGlissante,
  ratioPixelsCanvas,
  selectionnerAnimes,
} from './budget'
import { CATEGORIES, estVisible } from './categories'
import { formaterHorloge } from './horloge'
import { formaterValeurFiche } from './fiche-format'
import { formaterNombre } from './format-fr'
import { COTE_GRAIN, genererGrain } from './grain'
import { ligneJournal, lignesJournal } from './journal'
import { construireFiche, phaseScan } from './fiche'
import {
  calculerVol,
  capBoussoleDeg,
  choisirCible,
  progression,
  cadrerTrajet,
} from './vol'
import { creerVaisseau } from '../core/vaisseau'
import { DISTANCE_TERRE_LUNE_KM, DIAMETRE_LUNE_KM } from '../core/constants'
import { ASTRES } from '../core/astres'

describe('bruit', () => {
  it('est déterministe et dans [0, 1]', () => {
    expect(hash(42, 3)).toBe(hash(42, 3))
    expect(hash(42, 3)).not.toBe(hash(42, 4))
    for (let i = -50; i < 50; i += 0.37) {
      for (const v of [
        bruit1D(i, 2),
        bruitFractal(i, 2, 4),
        bruit2D(i, i * 0.7, 2),
      ]) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      }
    }
  })

  it('est continu : deux abscisses voisines donnent des valeurs voisines', () => {
    for (let x = 0; x < 20; x += 0.5) {
      expect(Math.abs(bruit1D(x + 0.001, 1) - bruit1D(x, 1))).toBeLessThan(0.01)
      expect(
        Math.abs(bruit2D(x + 0.001, 2.5, 1) - bruit2D(x, 2.5, 1))
      ).toBeLessThan(0.01)
    }
  })

  it('passe par les valeurs des nœuds', () => {
    expect(bruit1D(3, 5)).toBeCloseTo(hash(3, 5), 10)
  })

  it('supporte une entrée invalide', () => {
    expect(bruit1D(Number.NaN)).toBe(0.5)
    expect(bruit2D(Number.POSITIVE_INFINITY, 0)).toBe(0.5)
  })
})

describe('courbes', () => {
  it('oscilloscope : bonne longueur, valeurs dans [-1, 1], varie avec le temps', () => {
    const a = oscilloscope(64, 0, 1)
    expect(a).toHaveLength(64)
    expect(a.every((v) => v >= -1 && v <= 1)).toBe(true)
    expect(oscilloscope(64, 1.3, 1)).not.toEqual(a)
    expect(oscilloscope(64, 0, 1)).toEqual(a)
    expect(oscilloscope(0, 0)).toEqual([])
  })

  it("oscilloscope : l'amplitude réduit la courbe", () => {
    const fort = Math.max(...oscilloscope(80, 2, 1, 1).map(Math.abs))
    const faible = Math.max(...oscilloscope(80, 2, 1, 0.3).map(Math.abs))
    expect(faible).toBeLessThan(fort)
  })

  it('spectre : barres dans [0, 1], plus hautes dans les graves en moyenne', () => {
    const barres = spectre(24, 3, 2)
    expect(barres).toHaveLength(24)
    expect(barres.every((v) => v >= 0 && v <= 1)).toBe(true)
    let graves = 0
    let aigus = 0
    for (let t = 0; t < 30; t += 1) {
      const b = spectre(24, t, 2)
      graves += b.slice(0, 6).reduce((x, y) => x + y, 0)
      aigus += b.slice(18).reduce((x, y) => x + y, 0)
    }
    expect(graves).toBeGreaterThan(aigus)
  })

  it('onde : plus ample quand le copilote parle, nulle aux extrémités', () => {
    const amplitude = (v: number[]): number => Math.max(...v.map(Math.abs))
    let parle = 0
    let tait = 0
    for (let t = 0; t < 10; t += 0.5) {
      parle = Math.max(parle, amplitude(onde(60, t, true, 1)))
      tait = Math.max(tait, amplitude(onde(60, t, false, 1)))
    }
    expect(parle).toBeGreaterThan(tait * 2)
    const o = onde(40, 1, true, 1)
    expect(Math.abs(o[0])).toBeLessThan(0.01)
    expect(Math.abs(o[o.length - 1])).toBeLessThan(0.01)
  })

  it('deriveDouce reste près de la base et dans [0, 1]', () => {
    for (let t = 0; t < 100; t += 3) {
      const v = deriveDouce(0.8, t, 4, 0.05)
      expect(Math.abs(v - 0.8)).toBeLessThanOrEqual(0.05 + 1e-9)
    }
    expect(deriveDouce(0.99, 1, 1, 0.5)).toBeLessThanOrEqual(1)
  })
})

describe('projeterSurEcran', () => {
  it('place une direction dans l’axe au centre', () => {
    expect(projeterSurEcran([0, 0, -1], 50, 16 / 9)).toEqual({
      x: 0.5,
      y: 0.5,
      devant: true,
    })
  })

  it('met à droite ce qui est à droite et en haut ce qui est en haut', () => {
    const p = projeterSurEcran([0.2, 0.1, -1], 50, 2)
    expect(p.x).toBeGreaterThan(0.5)
    expect(p.y).toBeLessThan(0.5)
  })

  it('place au bord du champ une direction à la moitié du champ vertical', () => {
    const demi = (50 * Math.PI) / 360
    const p = projeterSurEcran([0, Math.sin(demi), -Math.cos(demi)], 50, 1)
    expect(p.y).toBeCloseTo(0, 6)
  })

  it('envoie une direction derrière loin hors écran, du bon côté', () => {
    const p = projeterSurEcran([1, 0, 1], 50, 1)
    expect(p.devant).toBe(false)
    expect(p.x).toBeGreaterThan(1)
    const gauche = projeterSurEcran([-1, 0, 1], 50, 1)
    expect(gauche.x).toBeLessThan(0)
  })

  it('supporte des paramètres invalides', () => {
    expect(projeterSurEcran([0, 0, -1], 0, 1).devant).toBe(false)
    expect(projeterSurEcran([Number.NaN, 0, -1], 50, 1).devant).toBe(false)
  })
})

describe('radar', () => {
  it('le balayage fait un tour par période', () => {
    expect(angleBalayage(0)).toBe(0)
    expect(angleBalayage(2, 4)).toBeCloseTo(Math.PI)
    expect(angleBalayage(4, 4)).toBeCloseTo(0)
    expect(angleBalayage(-1, 4)).toBeCloseTo(1.5 * Math.PI)
    expect(angleBalayage(Number.NaN)).toBe(0)
  })

  it('azimut : 0 devant, positif à droite, π derrière', () => {
    expect(azimut([0, 0, -1])).toBe(0)
    expect(azimut([1, 0, 0])).toBeCloseTo(Math.PI / 2)
    expect(azimut([-1, 0, 0])).toBeCloseTo(-Math.PI / 2)
    expect(Math.abs(azimut([0, 0, 1]))).toBeCloseTo(Math.PI)
  })

  it('rayonRadar : échelle log de 0 à 1', () => {
    expect(rayonRadar(0, 1000)).toBe(0)
    expect(rayonRadar(1000, 1000)).toBe(1)
    expect(rayonRadar(5000, 1000)).toBe(1)
    expect(rayonRadar(10, 1000)).toBeGreaterThan(0.3)
    expect(rayonRadar(10, 1000)).toBeLessThan(rayonRadar(100, 1000))
  })

  it('intensiteBlip : 1 au passage du balayage, puis décroît', () => {
    expect(intensiteBlip(1, 1)).toBe(1)
    expect(intensiteBlip(1, 1 + Math.PI)).toBeCloseTo(0.5)
    expect(intensiteBlip(1, 0.999)).toBeLessThan(0.01)
  })

  it('points décoratifs : déterministes, dans le disque', () => {
    const p = pointsDecoratifs(7, 5, 3)
    expect(p).toHaveLength(7)
    expect(pointsDecoratifs(7, 5, 3)).toEqual(p)
    expect(p.every((q) => q.rayon >= 0.2 && q.rayon <= 0.9)).toBe(true)
  })
})

describe('mise en page', () => {
  it('portrait quand la hauteur dépasse la largeur', () => {
    expect(choisirMiseEnPage(390, 844)).toBe('portrait')
  })

  it('compact pour un téléphone en paysage', () => {
    expect(choisirMiseEnPage(844, 390)).toBe('compact')
    expect(choisirMiseEnPage(932, 430)).toBe('compact')
  })

  it('paysage quand la hauteur le permet', () => {
    expect(choisirMiseEnPage(1440, 900)).toBe('paysage')
    expect(choisirMiseEnPage(1920, 1080)).toBe('paysage')
    expect(choisirMiseEnPage(2600, HAUTEUR_COMPACTE_PX)).toBe('paysage')
    expect(choisirMiseEnPage(2600, HAUTEUR_COMPACTE_PX - 1)).toBe('compact')
  })

  it('compact pour une tablette en paysage trop petite pour les colonnes', () => {
    expect(choisirMiseEnPage(1024, 768)).toBe('compact')
    expect(choisirMiseEnPage(1280, 800)).toBe('compact')
  })

  it('retombe sur portrait si la taille est inconnue', () => {
    expect(choisirMiseEnPage(0, 0)).toBe('portrait')
  })
})

describe('budget des graphes', () => {
  it('fréquence selon la qualité', () => {
    expect(IMAGES_PAR_SECONDE).toEqual({ haut: 30, moyen: 20, bas: 10 })
  })

  it('plafonne le ratio de pixels à 1,5', () => {
    expect(ratioPixelsCanvas(3)).toBe(1.5)
    expect(ratioPixelsCanvas(1)).toBe(1)
    expect(ratioPixelsCanvas(undefined)).toBe(1)
    expect(ratioPixelsCanvas(Number.NaN)).toBe(1)
  })

  it('imageDue respecte la cadence', () => {
    expect(imageDue(1000, null, 30)).toBe(true)
    expect(imageDue(1010, 1000, 30)).toBe(false)
    expect(imageDue(1034, 1000, 30)).toBe(true)
    expect(imageDue(1050, 1000, 10)).toBe(false)
    expect(imageDue(1100, 1000, 10)).toBe(true)
  })

  it('pause : onglet caché, HUD masqué, panneau replié', () => {
    const ok = {
      ongletVisible: true,
      hudMasque: false,
      panneauReplie: false,
      mouvementReduit: false,
    }
    expect(doitAnimer(ok)).toBe(true)
    expect(doitAnimer({ ...ok, ongletVisible: false })).toBe(false)
    expect(doitAnimer({ ...ok, hudMasque: true })).toBe(false)
    expect(doitAnimer({ ...ok, panneauReplie: true })).toBe(false)
  })

  it("mouvement réduit : les graphes se dessinent mais ne s'animent pas", () => {
    const reduit = {
      ongletVisible: true,
      hudMasque: false,
      panneauReplie: false,
      mouvementReduit: true,
    }
    expect(doitAnimer(reduit)).toBe(false)
    expect(doitDessiner(reduit)).toBe(true)
    expect(doitDessiner({ ...reduit, hudMasque: true })).toBe(false)
  })

  it('garde au plus 6 canvas animés, par priorité', () => {
    const actifs = Array.from({ length: 9 }, (_, i) => ({
      id: i,
      priorite: 9 - i,
    }))
    const gardes = selectionnerAnimes(actifs)
    expect(gardes).toHaveLength(MAX_CANVAS_ANIMES)
    expect(gardes[0].priorite).toBe(1)
    expect(selectionnerAnimes(actifs, 2)).toHaveLength(2)
    expect(selectionnerAnimes([], 6)).toEqual([])
  })

  it('moyenne glissante', () => {
    expect(moyenneGlissante([1, 2, 3], 4, 3)).toEqual([2, 3, 4])
    expect(moyenne([2, 4])).toBe(3)
    expect(moyenne([])).toBe(0)
  })
})

describe('catégories', () => {
  it('liste les neuf catégories du niveau de connaissance', () => {
    expect([...CATEGORIES]).toEqual([
      'distance',
      'vitesse',
      'temps',
      'lumiere',
      'radio',
      'temperature',
      'gravite',
      'atmosphere',
      'orbite',
    ])
  })

  it('tout est visible par défaut', () => {
    for (const c of CATEGORIES) expect(estVisible(undefined, c)).toBe(true)
  })

  it('filtre selon la liste', () => {
    expect(estVisible(['distance'], 'distance')).toBe(true)
    expect(estVisible(['distance'], 'radio')).toBe(false)
    expect(estVisible([], 'distance')).toBe(false)
  })
})

describe('horloge, grain, journal', () => {
  it('formate l’horloge de mission', () => {
    expect(formaterHorloge(0)).toBe('T+ 00:00:00')
    expect(formaterHorloge(3 * 3600 + 7 * 60 + 42.9)).toBe('T+ 03:07:42')
    expect(formaterHorloge(100 * 3600)).toBe('T+ 100:00:00')
    expect(formaterHorloge(-5)).toBe('T+ 00:00:00')
    expect(formaterHorloge(Number.NaN)).toBe('T+ 00:00:00')
  })

  it('génère une tuile de grain déterministe', () => {
    const g = genererGrain()
    expect(g).toHaveLength(COTE_GRAIN * COTE_GRAIN * 4)
    expect(genererGrain()).toEqual(g)
    expect(genererGrain(COTE_GRAIN, 2)).not.toEqual(g)
    const opacites = new Set(Array.from(g).filter((_, i) => i % 4 === 3))
    expect(opacites.size).toBeGreaterThan(50)
  })

  it('génère des lignes de journal stables', () => {
    expect(ligneJournal(5, 1)).toBe(ligneJournal(5, 1))
    expect(ligneJournal(5, 1)).toMatch(
      /^[0-9A-F]{4} · [A-Z]+ · [A-Z ]+ · \d{2} %$/
    )
    const lignes = lignesJournal(10, 4, 1)
    expect(lignes).toHaveLength(4)
    expect(lignes[3]).toBe(ligneJournal(10, 1))
    expect(lignes[0]).toBe(ligneJournal(7, 1))
  })
})

describe('données de vol', () => {
  const depart = creerVaisseau()

  it('cap de boussole : 0 au départ du lacet, croît vers la droite', () => {
    expect(capBoussoleDeg(0)).toBe(0)
    expect(capBoussoleDeg(-Math.PI / 2)).toBeCloseTo(90)
    expect(capBoussoleDeg(Math.PI / 2)).toBeCloseTo(270)
    expect(capBoussoleDeg(Number.NaN)).toBe(0)
  })

  it('la distance à la Lune vient des constantes', () => {
    const sur = { ...depart, position: [0, 0, 0] as const }
    const vol = calculerVol(sur, 'lune')
    expect(vol.distanceCibleKm).toBeCloseTo(DISTANCE_TERRE_LUNE_KM)
    expect(vol.distanceSurfaceKm).toBeCloseTo(
      DISTANCE_TERRE_LUNE_KM - ASTRES.lune.rayonKm
    )
    expect(vol.diametreCibleKm).toBe(DIAMETRE_LUNE_KM)
    expect(vol.lumiereCibleS).toBeCloseTo(
      DISTANCE_TERRE_LUNE_KM / 299_792.458,
      6
    )
  })

  it('la durée restante est la distance sur la vitesse, si on fonce vers la cible', () => {
    const etat = {
      ...depart,
      position: [DISTANCE_TERRE_LUNE_KM - 10_000, 0, 0] as const,
      lacet: -Math.PI / 2,
      tangage: 0,
      vitesseKmS: 10,
    }
    const vol = calculerVol(etat, 'lune')
    expect(vol.dureeRestanteS).not.toBeNull()
    expect(vol.dureeRestanteS!).toBeCloseTo(
      (10_000 - ASTRES.lune.rayonKm) / 10,
      3
    )
    expect(vol.vitesseKmH).toBe(36_000)
  })

  it('pas de durée si on tourne le dos à la cible ou si on est à l’arrêt', () => {
    const dos = {
      ...depart,
      position: [0, 0, 0] as const,
      lacet: Math.PI / 2,
      vitesseKmS: 10,
    }
    expect(calculerVol(dos, 'lune').dureeRestanteS).toBeNull()
    expect(
      calculerVol({ ...depart, vitesseKmS: 0 }, 'lune').dureeRestanteS
    ).toBeNull()
  })

  it("choisit l'astre le plus proche du cap", () => {
    const versLune = {
      ...depart,
      position: [0, 0, 0] as const,
      lacet: -Math.PI / 2,
    }
    expect(choisirCible(versLune)).toBe('lune')
    const versTerre = {
      ...depart,
      position: [DISTANCE_TERRE_LUNE_KM / 2, 0, 0] as const,
      lacet: Math.PI / 2,
    }
    expect(choisirCible(versTerre)).toBe('terre')
  })

  it('progression bornée', () => {
    expect(progression(100, 100)).toBe(0)
    expect(progression(100, 25)).toBe(0.75)
    expect(progression(100, 150)).toBe(0)
    expect(progression(100, -5)).toBe(1)
    expect(progression(0, 5)).toBe(0)
  })

  it('cadre du trajet : tous les points tiennent dans la zone', () => {
    const points = [
      [0, 0, 0],
      [384_400, 0, 0],
      [-60_000, 0, 120_000],
    ] as const
    const cadre = cadrerTrajet(points, 300, 160, 10)
    for (const p of points) {
      const x = cadre.origineX + p[0] * cadre.echelle
      const y = cadre.origineY + p[2] * cadre.echelle
      expect(x).toBeGreaterThanOrEqual(10 - 1e-6)
      expect(x).toBeLessThanOrEqual(290 + 1e-6)
      expect(y).toBeGreaterThanOrEqual(10 - 1e-6)
      expect(y).toBeLessThanOrEqual(150 + 1e-6)
    }
    expect(cadrerTrajet([], 100, 100)).toEqual({
      echelle: 1,
      origineX: 0,
      origineY: 0,
    })
  })
})

describe('fiche de cible', () => {
  const vol = calculerVol(
    { ...creerVaisseau(), position: [0, 0, 0] as const },
    'lune'
  )
  const fiche = construireFiche(vol)

  it("n'invente aucune température, gravité, atmosphère ni orbite", () => {
    for (const cle of ['temperature', 'gravite', 'atmosphere', 'orbite']) {
      expect(fiche.find((l) => l.cle === cle)?.valeur).toBeNull()
    }
  })

  it('donne le diamètre de la Lune avec sa source', () => {
    const diametre = fiche.find((l) => l.cle === 'diametre')
    expect(diametre?.valeur).toEqual({ nombre: DIAMETRE_LUNE_KM, unite: 'km' })
    expect(diametre?.sourcee).toBe(true)
  })

  it('range chaque ligne dans une catégorie connue', () => {
    for (const ligne of fiche) expect(CATEGORIES).toContain(ligne.categorie)
  })

  it('le scan révèle une ligne à la fois puis se termine', () => {
    expect(phaseScan(0, 5)).toEqual({ revelees: 1, termine: false })
    expect(phaseScan(900, 5, false, 420)).toEqual({
      revelees: 3,
      termine: false,
    })
    expect(phaseScan(10_000, 5)).toEqual({ revelees: 5, termine: true })
    expect(phaseScan(0, 5, true)).toEqual({ revelees: 5, termine: true })
    expect(phaseScan(0, 0)).toEqual({ revelees: 0, termine: true })
  })
})

describe('formaterValeurFiche', () => {
  it('colle le nombre à son unité avec une espace insécable', () => {
    expect(formaterValeurFiche({ nombre: 384400, unite: 'km' })).toBe(
      `${formaterNombre(384400)}\u00a0km`
    )
    expect(formaterValeurFiche({ nombre: 12.345, unite: 'deg' })).toContain('°')
  })

  it('met une durée dans l’unité lisible', () => {
    expect(formaterValeurFiche({ nombre: 120, unite: 's' })).toMatch(/minute/)
  })

  it('renvoie une chaîne vide pour un nombre invalide', () => {
    expect(formaterValeurFiche({ nombre: NaN, unite: 'km' })).toBe('')
  })
})
