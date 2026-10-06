import { describe, it, expect } from 'vitest'
import {
  arcJauge,
  decalageTete,
  DECALAGE_TETE_MAX_PX,
  DUREE_FERMETURE_MS,
  DUREE_FONDU_MS,
  DUREE_OUVERTURE_MS,
  dureeFermeture,
  dureeOuverture,
  elementsAllumes,
  estToucheMasquer,
  etatSuivant,
  facilite,
  fenetreVisible,
  fractionJauge,
  graduationsBoussole,
  niveauJauge,
  normaliserCap,
  pointCardinal,
  positionFenetre,
  positionReticule,
  progression,
  valeurAnimee,
} from './hud'

describe('decalageTete', () => {
  it('reste de quelques pixels au maximum', () => {
    expect(decalageTete({ x: 1, y: -1 }, false)).toEqual({
      x: -DECALAGE_TETE_MAX_PX,
      y: DECALAGE_TETE_MAX_PX,
    })
    expect(Math.abs(decalageTete({ x: 9, y: 9 }, false).x)).toBeLessThanOrEqual(
      DECALAGE_TETE_MAX_PX
    )
  })

  it('est nul en mouvement réduit', () => {
    expect(decalageTete({ x: 1, y: 1 }, true)).toEqual({ x: 0, y: 0 })
  })
})

describe('positionReticule', () => {
  const boite = { largeur: 400, hauteur: 200 }

  it('suit la taille du conteneur', () => {
    expect(positionReticule({ x: 0.5, y: 0.25 }, boite)).toMatchObject({
      x: 200,
      y: 50,
      dansLeChamp: true,
    })
    expect(
      positionReticule({ x: 0.5, y: 0.25 }, { largeur: 800, hauteur: 400 })
    ).toMatchObject({ x: 400, y: 100 })
  })

  it('ramène au bord une ancre hors du cadre et le signale', () => {
    const pos = positionReticule({ x: 1.5, y: 0.5 }, boite, 20)
    expect(pos.dansLeChamp).toBe(false)
    expect(pos.x).toBe(380)
    expect(pos.angleDeg).toBe(0)
    expect(positionReticule({ x: -1, y: 0.5 }, boite, 20).x).toBe(20)
  })

  it("donne la direction de l'ancre depuis le centre", () => {
    expect(positionReticule({ x: 0.5, y: 2 }, boite).angleDeg).toBe(90)
    expect(positionReticule({ x: 0.5, y: -1 }, boite).angleDeg).toBe(-90)
  })

  it("met l'étiquette du côté qui reste dans le cadre", () => {
    expect(positionReticule({ x: 0.2, y: 0.5 }, boite).cote).toBe('droite')
    expect(positionReticule({ x: 0.9, y: 0.5 }, boite).cote).toBe('gauche')
  })

  it('supporte un conteneur vide ou des valeurs invalides', () => {
    expect(
      positionReticule({ x: 0.5, y: 0.5 }, { largeur: 0, hauteur: 0 })
    ).toMatchObject({
      x: 0,
      y: 0,
    })
    const pos = positionReticule({ x: Number.NaN, y: 0.5 }, boite)
    expect(pos.dansLeChamp).toBe(false)
    expect(pos.x).toBe(200)
  })

  it('ne donne pas -0', () => {
    expect(Object.is(positionReticule({ x: 0, y: 0 }, boite).x, 0)).toBe(true)
    expect(
      Object.is(positionReticule({ x: 0.5, y: 0.5 }, boite).angleDeg, 0)
    ).toBe(true)
  })
})

describe('positionFenetre', () => {
  const boite = { largeur: 400, hauteur: 300 }
  const taille = { largeur: 200, hauteur: 100 }

  it("centre la fenêtre sur l'ancre", () => {
    expect(positionFenetre({ x: 0.5, y: 0.5 }, boite, taille)).toEqual({
      x: 100,
      y: 100,
    })
  })

  it('la garde dans le cadre, marge comprise', () => {
    expect(positionFenetre({ x: 0, y: 0 }, boite, taille, 10)).toEqual({
      x: 10,
      y: 10,
    })
    expect(positionFenetre({ x: 1, y: 1 }, boite, taille, 10)).toEqual({
      x: 190,
      y: 190,
    })
  })

  it('reste dans le cadre si la fenêtre est plus grande que lui', () => {
    expect(
      positionFenetre(
        { x: 0.5, y: 0.5 },
        { largeur: 100, hauteur: 100 },
        taille
      )
    ).toEqual({ x: 0, y: 0 })
  })
})

describe('animation des valeurs', () => {
  it("progresse de 0 à 1 et s'arrête", () => {
    expect(progression(0, 700)).toBe(0)
    expect(progression(350, 700)).toBe(0.5)
    expect(progression(5000, 700)).toBe(1)
    expect(progression(10, 0)).toBe(1)
    expect(progression(Number.NaN, 700)).toBe(1)
  })

  it('ralentit vers la fin', () => {
    expect(facilite(0)).toBe(0)
    expect(facilite(1)).toBe(1)
    expect(facilite(0.5)).toBeGreaterThan(0.5)
  })

  it('va du départ à la cible, dans le bon sens', () => {
    expect(valeurAnimee(0, 100, 0)).toBe(0)
    expect(valeurAnimee(0, 100, 350)).toBeGreaterThan(50)
    expect(valeurAnimee(0, 100, 350)).toBeLessThan(100)
    expect(valeurAnimee(0, 100, 700)).toBe(100)
    expect(valeurAnimee(100, 20, 350)).toBeLessThan(100)
    expect(valeurAnimee(100, 20, 350)).toBeGreaterThan(20)
  })

  it('saute à la cible en mouvement réduit ou si le départ est invalide', () => {
    expect(valeurAnimee(0, 100, 10, 700, true)).toBe(100)
    expect(valeurAnimee(Number.NaN, 100, 10)).toBe(100)
    expect(valeurAnimee(5, Number.NaN, 10)).toBe(5)
  })
})

describe('états des fenêtres', () => {
  it('suit le cycle fermée, ouverture, ouverte, fermeture, fermée', () => {
    let etat = etatSuivant('fermee', 'ouvrir')
    expect(etat).toBe('ouverture')
    etat = etatSuivant(etat, 'fin')
    expect(etat).toBe('ouverte')
    etat = etatSuivant(etat, 'fermer')
    expect(etat).toBe('fermeture')
    etat = etatSuivant(etat, 'fin')
    expect(etat).toBe('fermee')
  })

  it('ignore les événements sans effet', () => {
    expect(etatSuivant('fermee', 'fermer')).toBe('fermee')
    expect(etatSuivant('fermee', 'fin')).toBe('fermee')
    expect(etatSuivant('ouverte', 'ouvrir')).toBe('ouverte')
    expect(etatSuivant('ouverte', 'fin')).toBe('ouverte')
  })

  it('permet de refermer pendant l’ouverture et de rouvrir pendant la fermeture', () => {
    expect(etatSuivant('ouverture', 'fermer')).toBe('fermeture')
    expect(etatSuivant('fermeture', 'ouvrir')).toBe('ouverture')
  })

  it('reste dans la page sauf quand elle est fermée', () => {
    expect(fenetreVisible('fermee')).toBe(false)
    expect(fenetreVisible('ouverture')).toBe(true)
    expect(fenetreVisible('fermeture')).toBe(true)
  })

  it('ouvre en 300 à 500 ms, ou par un fondu court en mouvement réduit', () => {
    expect(DUREE_OUVERTURE_MS).toBeGreaterThanOrEqual(300)
    expect(DUREE_OUVERTURE_MS).toBeLessThanOrEqual(500)
    expect(dureeOuverture(false)).toBe(DUREE_OUVERTURE_MS)
    expect(dureeOuverture(true)).toBe(DUREE_FONDU_MS)
    expect(dureeFermeture(false)).toBe(DUREE_FERMETURE_MS)
    expect(dureeFermeture(true)).toBeLessThan(DUREE_OUVERTURE_MS)
  })
})

describe("séquence d'allumage", () => {
  it('allume les éléments un à un puis tous', () => {
    expect(elementsAllumes(0, 5, 100)).toBe(1)
    expect(elementsAllumes(250, 5, 100)).toBe(3)
    expect(elementsAllumes(10_000, 5, 100)).toBe(5)
    expect(elementsAllumes(0, 0)).toBe(0)
  })

  it('allume tout de suite en mouvement réduit', () => {
    expect(elementsAllumes(0, 5, 100, true)).toBe(5)
  })
})

describe('jauges', () => {
  it('ramène la valeur entre 0 et 1', () => {
    expect(fractionJauge(50, 0, 200)).toBe(0.25)
    expect(fractionJauge(-5, 0, 10)).toBe(0)
    expect(fractionJauge(50, 0, 10)).toBe(1)
    expect(fractionJauge(5, 10, 10)).toBe(0)
    expect(fractionJauge(Number.NaN)).toBe(0)
  })

  it('signale un niveau bas', () => {
    expect(niveauJauge(0.1)).toBe('bas')
    expect(niveauJauge(0.8)).toBe('normal')
  })

  it("mesure l'arc proportionnellement à la valeur", () => {
    const vide = arcJauge(0, 40)
    const moitie = arcJauge(0.5, 40)
    expect(vide.rempli).toBe(0)
    expect(moitie.rempli).toBeCloseTo(moitie.longueur / 2)
    expect(arcJauge(2, 40).rempli).toBe(arcJauge(1, 40).longueur)
    expect(arcJauge(0.5, 0).longueur).toBe(0)
  })
})

describe('boussole', () => {
  it('ramène un cap dans [0, 360[', () => {
    expect(normaliserCap(370)).toBe(10)
    expect(normaliserCap(-10)).toBe(350)
    expect(normaliserCap(360)).toBe(0)
    expect(normaliserCap(Number.NaN)).toBe(0)
  })

  it('donne le point cardinal en français', () => {
    expect(pointCardinal(0)).toBe('N')
    expect(pointCardinal(90)).toBe('E')
    expect(pointCardinal(225)).toBe('SO')
    expect(pointCardinal(270)).toBe('O')
    expect(pointCardinal(350)).toBe('N')
  })

  it('place les graduations autour du cap, de 0 à 1', () => {
    const graduations = graduationsBoussole(100, 45, 5)
    expect(graduations[0].position).toBeGreaterThanOrEqual(0)
    expect(graduations[graduations.length - 1].position).toBeLessThanOrEqual(1)
    const centre = graduations.find((g) => g.ecart === 0)
    expect(centre?.position).toBe(0.5)
    expect(centre?.cap).toBe(100)
  })

  it('traverse le nord sans trou', () => {
    const caps = graduationsBoussole(355, 20, 5).map((g) => g.cap)
    expect(caps).toContain(0)
    expect(caps).toContain(340)
  })

  it('renvoie une liste vide pour des paramètres invalides', () => {
    expect(graduationsBoussole(0, 0, 5)).toEqual([])
    expect(graduationsBoussole(0, 45, 0)).toEqual([])
  })
})

describe('estToucheMasquer', () => {
  it('accepte H, en majuscule aussi', () => {
    expect(estToucheMasquer({ key: 'h' })).toBe(true)
    expect(estToucheMasquer({ key: 'H', cible: 'BODY' })).toBe(true)
  })

  it('refuse les autres touches, les raccourcis et la répétition', () => {
    expect(estToucheMasquer({ key: 'j' })).toBe(false)
    expect(estToucheMasquer({ key: 'h', ctrlKey: true })).toBe(false)
    expect(estToucheMasquer({ key: 'h', metaKey: true })).toBe(false)
    expect(estToucheMasquer({ key: 'h', repeat: true })).toBe(false)
  })

  it('refuse pendant une saisie', () => {
    expect(estToucheMasquer({ key: 'h', cible: 'input' })).toBe(false)
    expect(estToucheMasquer({ key: 'h', cible: 'SELECT' })).toBe(false)
  })
})
