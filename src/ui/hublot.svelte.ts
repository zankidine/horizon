/**
 * Logique du hublot : réglage de qualité, mouvement réduit, scène 3D
 * (ciel étoilé, Terre, Lune) et animation. Les composants .svelte ne font
 * qu'afficher ce qui est préparé ici.
 */
import { MediaQuery } from 'svelte/reactivity'
import { useTask, useThrelte } from '@threlte/core'
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  FrontSide,
  MathUtils,
  MeshStandardMaterial,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  type Mesh,
  type PerspectiveCamera,
  type Side,
  type Texture,
} from 'three'
import {
  choisirQualite,
  cheminTexture,
  ratioPixelsPlafonne,
  NIVEAUX_QUALITE,
  PARAMETRES_QUALITE,
  type NiveauQualite,
} from '../core/qualite'
import { genererEtoiles } from '../core/etoiles'
import { assets } from '../../assets.json'

// ---------------------------------------------------------------------------
// Réglage de qualité
// ---------------------------------------------------------------------------

export type ReglageQualite = 'auto' | NiveauQualite

export const REGLAGES_QUALITE: readonly {
  valeur: ReglageQualite
  libelle: string
}[] = [
  { valeur: 'auto', libelle: 'Auto' },
  { valeur: 'bas', libelle: 'Bas' },
  { valeur: 'moyen', libelle: 'Moyen' },
  { valeur: 'haut', libelle: 'Haut' },
]

const CLE_REGLAGE = 'horizon.qualite'

function lireReglage(): ReglageQualite {
  try {
    const valeur = localStorage.getItem(CLE_REGLAGE)
    if (valeur === 'auto') return 'auto'
    if (NIVEAUX_QUALITE.includes(valeur as NiveauQualite)) {
      return valeur as NiveauQualite
    }
  } catch {
    // Stockage indisponible (navigation privée) : on garde « auto ».
  }
  return 'auto'
}

function ecrireReglage(reglage: ReglageQualite): void {
  try {
    localStorage.setItem(CLE_REGLAGE, reglage)
  } catch {
    // Sans stockage, le réglage vaut pour la session seulement.
  }
}

/** Lit les capacités de l'appareil (certaines manquent sur Safari et iOS). */
function niveauAutomatique(): NiveauQualite {
  const nav = navigator as Navigator & { deviceMemory?: number }
  return choisirQualite({
    coeurs: nav.hardwareConcurrency,
    memoireGo: nav.deviceMemory,
    ratioPixels: window.devicePixelRatio,
    petitCoteEcran: Math.min(window.screen.width, window.screen.height),
  })
}

export class EtatHublot {
  reglage = $state<ReglageQualite>(lireReglage())
  readonly niveauAuto: NiveauQualite = niveauAutomatique()
  readonly niveau = $derived<NiveauQualite>(
    this.reglage === 'auto' ? this.niveauAuto : this.reglage
  )
  readonly parametres = $derived(PARAMETRES_QUALITE[this.niveau])
  readonly ratioPixels = $derived(
    ratioPixelsPlafonne(window.devicePixelRatio, this.niveau)
  )

  readonly #mouvementReduit = new MediaQuery('(prefers-reduced-motion: reduce)')

  get mouvementReduit(): boolean {
    return this.#mouvementReduit.current
  }

  choisirReglage(reglage: ReglageQualite): void {
    this.reglage = reglage
    ecrireReglage(reglage)
  }
}

// ---------------------------------------------------------------------------
// Crédits des textures (issus de assets.json, sans doublon)
// ---------------------------------------------------------------------------

export const CREDITS_TEXTURES: readonly string[] = [
  ...new Set(assets.map((asset) => asset.credit)),
]

// ---------------------------------------------------------------------------
// Disposition de la scène
// ---------------------------------------------------------------------------

/*
 * Les échelles ne sont pas réelles. La Lune est en vrai à environ 60 rayons
 * terrestres : à cette distance, Terre et Lune ne tiendraient pas ensemble
 * dans le hublot avec une taille lisible. On garde donc le vrai rapport des
 * rayons (calculé ci-dessous) mais on rapproche fortement la Lune, et le
 * Soleil est une simple lumière directionnelle. Les vraies distances seront
 * données par le code de simulation, pas par cette scène.
 */
const RAYON_TERRE_KM = 6371
const RAYON_LUNE_KM = 1737.4
/** Inclinaison de l'axe de rotation de la Terre, en degrés. */
const INCLINAISON_AXE_TERRE_DEG = 23.44

export const RAYON_TERRE = 1.5
export const RAYON_LUNE = RAYON_TERRE * (RAYON_LUNE_KM / RAYON_TERRE_KM)
export const POSITION_TERRE: [number, number, number] = [-0.8, -0.5, -6]
export const POSITION_LUNE: [number, number, number] = [4, 2.2, -16]
export const INCLINAISON_TERRE = MathUtils.degToRad(INCLINAISON_AXE_TERRE_DEG)
export const POSITION_SOLEIL: [number, number, number] = [10, 3, 2]
/** Lumière dure du Soleil et ambiance quasi nulle (l'espace est noir). */
export const INTENSITE_SOLEIL = 3
export const INTENSITE_AMBIANTE = 0.02

const RAYON_CIEL = 400
export const CAMERA = { fov: 50, near: 0.1, far: RAYON_CIEL * 2 }

/** Rotation lente, en radians par seconde (accélérée, pas réelle). */
const VITESSE_TERRE = 0.04
const VITESSE_LUNE = 0.01

const COULEUR_TERRE_SIMPLE = '#2f6fd6'
const COULEUR_LUNE_SIMPLE = '#9a9a9a'
const COULEUR_ATMOSPHERE = '#6fb3ff'
/** Épaisseur du halo, en fraction du rayon terrestre. */
const EPAISSEUR_HALO = 0.04

// ---------------------------------------------------------------------------
// Matériaux
// ---------------------------------------------------------------------------

const VERTEX_ETOILES = /* glsl */ `
  uniform float uTemps;
  uniform float uRatioPixels;
  attribute vec3 aCouleur;
  attribute float aTaille;
  attribute float aPhase;
  varying vec3 vCouleur;
  void main() {
    // Scintillement très léger : ±12 % d'éclat, rythme propre à chaque étoile.
    float vitesse = 0.6 + fract(aPhase * 7.0) * 1.4;
    vCouleur = aCouleur * (1.0 + 0.12 * sin(uTemps * vitesse + aPhase));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aTaille * uRatioPixels;
  }
`

const FRAGMENT_ETOILES = /* glsl */ `
  varying vec3 vCouleur;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float alpha = smoothstep(0.5, 0.1, d);
    if (alpha <= 0.0) discard;
    gl_FragColor = vec4(vCouleur, alpha);
  }
`

const VERTEX_ATMOSPHERE = /* glsl */ `
  varying vec3 vNormale;
  varying vec3 vPosition;
  void main() {
    vec4 positionMonde = modelMatrix * vec4(position, 1.0);
    vPosition = positionMonde.xyz;
    vNormale = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * positionMonde;
  }
`

/** Halo extérieur : coque un peu plus grande vue de l'intérieur (BackSide). */
const FRAGMENT_HALO = /* glsl */ `
  uniform vec3 uCouleur;
  uniform vec3 uDirectionSoleil;
  uniform float uBordPlanete;
  varying vec3 vNormale;
  varying vec3 vPosition;
  void main() {
    vec3 n = normalize(vNormale);
    vec3 v = normalize(cameraPosition - vPosition);
    // 0 au bord de la coque, uBordPlanete au bord de la planète.
    float d = -dot(n, v);
    float halo = pow(smoothstep(0.0, uBordPlanete, d), 2.0);
    float jour = smoothstep(-0.1, 0.4, dot(n, uDirectionSoleil));
    gl_FragColor = vec4(uCouleur, halo * jour);
  }
`

/** Liseré sur le bord de la planète (effet de Fresnel). */
const FRAGMENT_LISERE = /* glsl */ `
  uniform vec3 uCouleur;
  uniform vec3 uDirectionSoleil;
  varying vec3 vNormale;
  varying vec3 vPosition;
  void main() {
    vec3 n = normalize(vNormale);
    vec3 v = normalize(cameraPosition - vPosition);
    float fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    float jour = smoothstep(-0.2, 0.5, dot(n, uDirectionSoleil));
    gl_FragColor = vec4(uCouleur, fresnel * jour * 0.8);
  }
`

function creerMateriauEtoiles(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uTemps: { value: 0 }, uRatioPixels: { value: 1 } },
    vertexShader: VERTEX_ETOILES,
    fragmentShader: FRAGMENT_ETOILES,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
}

function creerMateriauAtmosphere(
  fragmentShader: string,
  side: Side
): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uCouleur: { value: new Color(COULEUR_ATMOSPHERE) },
      uDirectionSoleil: {
        value: new Vector3(...POSITION_SOLEIL).normalize(),
      },
      // Sur la coque, distance (en cosinus) entre son bord et celui de la Terre.
      uBordPlanete: {
        value: Math.sqrt(1 - Math.pow(1 / (1 + EPAISSEUR_HALO), 2)),
      },
    },
    vertexShader: VERTEX_ATMOSPHERE,
    fragmentShader,
    side,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
}

function creerGeometrieEtoiles(nombre: number): BufferGeometry {
  const ciel = genererEtoiles(nombre, RAYON_CIEL)
  const geometrie = new BufferGeometry()
  geometrie.setAttribute('position', new BufferAttribute(ciel.positions, 3))
  geometrie.setAttribute('aCouleur', new BufferAttribute(ciel.couleurs, 3))
  geometrie.setAttribute('aTaille', new BufferAttribute(ciel.tailles, 1))
  geometrie.setAttribute('aPhase', new BufferAttribute(ciel.phases, 1))
  return geometrie
}

/**
 * Charge la texture du niveau demandé. Renvoie null si le fichier manque :
 * la scène garde alors un matériau de couleur simple.
 */
async function chargerTexture(
  nom: string,
  niveau: NiveauQualite
): Promise<Texture | null> {
  try {
    const texture = await new TextureLoader().loadAsync(
      import.meta.env.BASE_URL + cheminTexture(nom, niveau)
    )
    // Textures de couleur : sRGB, sinon les couleurs paraissent délavées.
    texture.colorSpace = SRGBColorSpace
    return texture
  } catch {
    return null
  }
}

function appliquerTexture(
  materiau: MeshStandardMaterial,
  texture: Texture | null,
  couleurSimple: string
): void {
  materiau.map = texture
  materiau.color.set(texture ? '#ffffff' : couleurSimple)
  materiau.needsUpdate = true
}

// ---------------------------------------------------------------------------
// Scène (à appeler pendant l'initialisation d'un composant enfant de <Canvas>)
// ---------------------------------------------------------------------------

export function creerSceneHublot(etat: EtatHublot) {
  const { invalidate } = useThrelte()

  const materiauEtoiles = creerMateriauEtoiles()
  const materiauHalo = creerMateriauAtmosphere(FRAGMENT_HALO, BackSide)
  const materiauLisere = creerMateriauAtmosphere(FRAGMENT_LISERE, FrontSide)
  const materiauTerre = new MeshStandardMaterial({
    color: COULEUR_TERRE_SIMPLE,
    roughness: 0.85,
    metalness: 0,
  })
  const materiauLune = new MeshStandardMaterial({
    color: COULEUR_LUNE_SIMPLE,
    roughness: 1,
    metalness: 0,
  })

  const geometrieEtoiles = $derived(
    creerGeometrieEtoiles(etat.parametres.nombreEtoiles)
  )
  const geometrieSphere = $derived(
    new SphereGeometry(
      1,
      etat.parametres.segmentsSphere,
      etat.parametres.segmentsSphere / 2
    )
  )

  const refs = $state<{
    camera?: PerspectiveCamera
    terre?: Mesh
    lune?: Mesh
  }>({})

  $effect(() => {
    const geometrie = geometrieEtoiles
    return () => geometrie.dispose()
  })

  $effect(() => {
    const geometrie = geometrieSphere
    return () => geometrie.dispose()
  })

  $effect(() => {
    materiauEtoiles.uniforms.uRatioPixels.value = etat.ratioPixels
  })

  // Charge uniquement les textures du niveau choisi. Les anciennes restent
  // affichées jusqu'à l'arrivée des nouvelles.
  let texturesAffichees: (Texture | null)[] = []
  $effect(() => {
    const niveau = etat.niveau
    let annule = false
    Promise.all([
      chargerTexture('earth-day', niveau),
      chargerTexture('moon', niveau),
    ]).then(([terre, lune]) => {
      if (annule) {
        terre?.dispose()
        lune?.dispose()
        return
      }
      appliquerTexture(materiauTerre, terre, COULEUR_TERRE_SIMPLE)
      appliquerTexture(materiauLune, lune, COULEUR_LUNE_SIMPLE)
      texturesAffichees.forEach((t) => t?.dispose())
      texturesAffichees = [terre, lune]
      invalidate()
    })
    return () => {
      annule = true
    }
  })

  $effect(() => {
    return () => {
      texturesAffichees.forEach((t) => t?.dispose())
      materiauEtoiles.dispose()
      materiauHalo.dispose()
      materiauLisere.dispose()
      materiauTerre.dispose()
      materiauLune.dispose()
    }
  })

  let temps = 0
  useTask((delta) => {
    temps += delta
    materiauEtoiles.uniforms.uTemps.value = temps
    if (refs.terre) refs.terre.rotation.y += delta * VITESSE_TERRE
    if (refs.lune) refs.lune.rotation.y += delta * VITESSE_LUNE

    const camera = refs.camera
    if (!camera) return
    if (etat.mouvementReduit) {
      camera.position.set(0, 0, 0)
      camera.rotation.set(0, 0, 0)
      return
    }
    // Très léger balancement du vaisseau.
    camera.position.set(
      Math.sin(temps * 0.21) * 0.03,
      Math.sin(temps * 0.17) * 0.02,
      0
    )
    camera.rotation.set(
      Math.sin(temps * 0.13) * 0.006,
      Math.sin(temps * 0.11) * 0.008,
      Math.sin(temps * 0.07) * 0.01
    )
  })

  return {
    refs,
    materiauEtoiles,
    materiauHalo,
    materiauLisere,
    materiauTerre,
    materiauLune,
    get geometrieEtoiles() {
      return geometrieEtoiles
    },
    get geometrieSphere() {
      return geometrieSphere
    },
  }
}

export const ECHELLE_HALO = RAYON_TERRE * (1 + EPAISSEUR_HALO)
/** Le liseré colle à la surface sans la traverser. */
export const ECHELLE_LISERE = RAYON_TERRE * 1.005
