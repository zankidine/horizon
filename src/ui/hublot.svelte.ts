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
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  type Group,
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
import { ASTRES, apparenceAstre, diametreAffiche, type ApparenceAstre } from '../core/astres'
import { effetsMouvement, intensiteHaloSoleil } from '../core/effets'
import { genererPoussiere } from '../core/poussiere'
import { directionCap, type Vec3 } from '../core/vaisseau'
import { assets } from '../../assets.json'
import { vaisseau as vaisseauParDefaut, type SimulationVaisseau } from './vaisseau.svelte'

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

/**
 * État du hublot partagé par défaut : SceneHublot l'utilise quand on ne lui
 * passe pas de prop `etat`. Créé à la première demande (il lit le navigateur).
 */
let etatParDefaut: EtatHublot | undefined
export function etatHublotParDefaut(): EtatHublot {
  return (etatParDefaut ??= new EtatHublot())
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
 * La scène reflète l'état du vaisseau (vaisseau.svelte.ts). La caméra reste à
 * l'origine et tourne selon le cap (lacet, tangage, léger roulis) : tout le
 * ciel (étoiles, Terre, Lune, Soleil) tourne donc avec elle. Les astres sont
 * placés dans la direction où le vaisseau les voit (apparenceAstre) à une
 * distance de rendu fixe, et leur taille vient de leur diamètre angulaire.
 *
 * Les tailles ne sont pas réelles, pour la lisibilité : diametreAffiche()
 * compresse le diamètre angulaire réel (de 0,4° à 90°) vers des tailles
 * de 2,5° à 70° à l'écran, et borne au-delà. La Lune, qui ne mesure que
 * 0,52° depuis la Terre, resterait un point ; l'astre qui se rapproche
 * grossit toujours. Les distances et les durées, elles, sont réelles : elles
 * viennent du code de simulation (src/core), pas de cette scène.
 */
/** Inclinaison de l'axe de rotation de la Terre, en degrés. */
const INCLINAISON_AXE_TERRE_DEG = 23.44

/**
 * Distances de rendu des astres, en unités de scène. L'astre le plus proche
 * du vaisseau est dessiné un peu plus près, pour que l'ordre soit le bon
 * quand ils se recouvrent à l'écran. La taille à l'écran ne dépend pas de ces
 * distances (elle vient de l'angle).
 */
const DISTANCE_RENDU_PROCHE = 90
const DISTANCE_RENDU_LOIN = 110

export const INCLINAISON_TERRE = MathUtils.degToRad(INCLINAISON_AXE_TERRE_DEG)
/**
 * Direction du Soleil dans le monde (fixe). Presque perpendiculaire à l'axe
 * Terre-Lune : vue du vaisseau, la Terre et la Lune sont éclairées de côté.
 */
export const POSITION_SOLEIL: [number, number, number] = [3.5, 2.5, 9]
/** Lumière dure du Soleil et ambiance quasi nulle (l'espace est noir). */
export const INTENSITE_SOLEIL = 3
export const INTENSITE_AMBIANTE = 0.02

const RAYON_CIEL = 400
export const CAMERA = { fov: 50, near: 0.1, far: RAYON_CIEL * 2 }

/** Halo du Soleil : plan face à la caméra, à cette distance et de cette largeur (unités de scène). */
const DISTANCE_HALO_SOLEIL = 350
const LARGEUR_HALO_SOLEIL = 140
const COULEUR_HALO_SOLEIL = '#ffe6b8'

/** Poussière : côté de la boîte qui entoure le vaisseau, et taille de base d'un grain (pixels à 1 unité). */
const BOITE_POUSSIERE = 30
const TAILLE_POUSSIERE = 40
const COULEUR_POUSSIERE = '#cfe3ff'

/**
 * Vibration de la caméra quand la poussée est active : amplitude en unités de
 * scène et en radians, fréquences en rad/s, et vitesse de lissage (1/s) pour
 * que la vibration monte et retombe en douceur.
 */
const VIBRATION_POSITION = 0.012
const VIBRATION_ROTATION = 0.0012
const VIBRATION_FREQUENCES = [143, 197] as const
const VIBRATION_LISSAGE = 4

/** Période du roulis de dérive, en secondes (très lent). */
const PERIODE_ROULIS_S = 40

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
  uniform float uEtirement;
  uniform float uAspect;
  attribute vec3 aCouleur;
  attribute float aTaille;
  attribute float aPhase;
  varying vec3 vCouleur;
  varying vec2 vSens;
  void main() {
    // Scintillement très léger : ±12 % d'éclat, rythme propre à chaque étoile.
    float vitesse = 0.6 + fract(aPhase * 7.0) * 1.4;
    // Une étoile étirée garde l'éclat total d'une étoile ronde, ou presque.
    vCouleur = aCouleur * (1.0 + 0.12 * sin(uTemps * vitesse + aPhase)) / (1.0 + 0.5 * uEtirement);
    vec4 position_ecran = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = position_ecran;
    // On avance vers le centre de l'écran : les étoiles s'étirent à partir de lui.
    vec2 ecran = position_ecran.xy / max(position_ecran.w, 0.0001) * vec2(uAspect, 1.0);
    vSens = length(ecran) > 0.0001 ? normalize(ecran) : vec2(1.0, 0.0);
    gl_PointSize = aTaille * uRatioPixels * (1.0 + uEtirement);
  }
`

const FRAGMENT_ETOILES = /* glsl */ `
  uniform float uEtirement;
  varying vec3 vCouleur;
  varying vec2 vSens;
  void main() {
    // Ellipse allongée le long du sens de fuite (rond quand uEtirement vaut 0).
    vec2 p = gl_PointCoord - 0.5;
    p.y = -p.y;
    float longueur = dot(p, vSens);
    float largeur = dot(p, vec2(-vSens.y, vSens.x));
    float d = length(vec2(longueur, largeur * (1.0 + uEtirement)));
    float alpha = smoothstep(0.5, 0.1, d);
    if (alpha <= 0.0) discard;
    gl_FragColor = vec4(vCouleur, alpha);
  }
`

/**
 * Poussière proche. Les grains (positions dans [0,1[) bouclent dans une boîte
 * de côté uBoite qui entoure le vaisseau, dans les axes du monde : uDecalage,
 * le chemin parcouru par le vaisseau dans la boîte, les fait défiler à
 * l'opposé de la vitesse, et la caméra qui tourne leur donne la bonne perspective.
 */
const VERTEX_POUSSIERE = /* glsl */ `
  uniform vec3 uDecalage;
  uniform float uBoite;
  uniform float uTailleBase;
  uniform float uRatioPixels;
  uniform float uIntensite;
  uniform float uEtirement;
  uniform float uAspect;
  attribute float aTaille;
  attribute float aPhase;
  varying float vAlpha;
  varying vec2 vSens;
  void main() {
    vec3 rel = mod(position * uBoite - uDecalage, uBoite) - 0.5 * uBoite;
    vec4 vue = viewMatrix * vec4(rel, 1.0);
    float profondeur = -vue.z;
    vec4 position_ecran = projectionMatrix * vue;
    gl_Position = position_ecran;
    vec2 ecran = position_ecran.xy / max(position_ecran.w, 0.0001) * vec2(uAspect, 1.0);
    vSens = length(ecran) > 0.0001 ? normalize(ecran) : vec2(1.0, 0.0);
    // Les grains sont d'autant plus gros qu'ils sont près.
    float taille = clamp(aTaille * uTailleBase / max(profondeur, 0.5), 1.5, 8.0);
    gl_PointSize = taille * uRatioPixels * (1.0 + uEtirement);
    // Fondu aux bords de la boîte (là où les grains bouclent) et tout près de la caméra.
    float bord = 1.0 - smoothstep(0.55, 1.0, length(rel) / (0.5 * uBoite));
    float pres = smoothstep(0.6, 2.5, profondeur);
    vAlpha = 0.7 * uIntensite * bord * pres * (0.35 + 0.65 * aPhase);
  }
`

const FRAGMENT_POUSSIERE = /* glsl */ `
  uniform vec3 uCouleur;
  uniform float uEtirement;
  varying float vAlpha;
  varying vec2 vSens;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    p.y = -p.y;
    float longueur = dot(p, vSens);
    float largeur = dot(p, vec2(-vSens.y, vSens.x));
    float d = length(vec2(longueur, largeur * (1.0 + uEtirement)));
    float alpha = smoothstep(0.5, 0.05, d) * vAlpha;
    if (alpha <= 0.002) discard;
    gl_FragColor = vec4(uCouleur, alpha);
  }
`

/** Halo du Soleil : un cœur et une lueur douce, sur un plan face à la caméra. */
const VERTEX_SOLEIL = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAGMENT_SOLEIL = /* glsl */ `
  uniform vec3 uCouleur;
  uniform float uIntensite;
  varying vec2 vUv;
  void main() {
    float r = length(vUv - 0.5) * 2.0;
    float lueur = exp(-r * r * 7.0) * 0.45 + exp(-r * r * 60.0) * 0.8;
    float alpha = lueur * (1.0 - smoothstep(0.8, 1.0, r)) * uIntensite;
    if (alpha <= 0.002) discard;
    gl_FragColor = vec4(uCouleur, alpha);
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
    uniforms: {
      uTemps: { value: 0 },
      uRatioPixels: { value: 1 },
      uEtirement: { value: 0 },
      uAspect: { value: 1 },
    },
    vertexShader: VERTEX_ETOILES,
    fragmentShader: FRAGMENT_ETOILES,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
}

function creerMateriauPoussiere(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uDecalage: { value: new Vector3() },
      uBoite: { value: BOITE_POUSSIERE },
      uTailleBase: { value: TAILLE_POUSSIERE },
      uRatioPixels: { value: 1 },
      uIntensite: { value: 0 },
      uEtirement: { value: 0 },
      uAspect: { value: 1 },
      uCouleur: { value: new Color(COULEUR_POUSSIERE) },
    },
    vertexShader: VERTEX_POUSSIERE,
    fragmentShader: FRAGMENT_POUSSIERE,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
}

function creerMateriauSoleil(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uCouleur: { value: new Color(COULEUR_HALO_SOLEIL) },
      uIntensite: { value: 0 },
    },
    vertexShader: VERTEX_SOLEIL,
    fragmentShader: FRAGMENT_SOLEIL,
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

function creerGeometriePoussiere(nombre: number): BufferGeometry {
  const poussiere = genererPoussiere(nombre)
  const geometrie = new BufferGeometry()
  // La position sert ici de fraction de la boîte (voir VERTEX_POUSSIERE).
  geometrie.setAttribute('position', new BufferAttribute(poussiere.positions, 3))
  geometrie.setAttribute('aTaille', new BufferAttribute(poussiere.tailles, 1))
  geometrie.setAttribute('aPhase', new BufferAttribute(poussiere.phases, 1))
  return geometrie
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

export function creerSceneHublot(
  etat: EtatHublot,
  vaisseau: SimulationVaisseau = vaisseauParDefaut
) {
  const { invalidate, size } = useThrelte()

  // Panneau de réglage du vaisseau : mode développement seulement. Cette
  // condition est remplacée par `false` à la build, et l'import disparaît.
  if (import.meta.env.DEV) {
    void import('./dev/monter-panneau').then((m) => m.monterPanneauVaisseau())
  }

  const materiauEtoiles = creerMateriauEtoiles()
  const materiauPoussiere = creerMateriauPoussiere()
  const materiauSoleil = creerMateriauSoleil()
  const geometrieSoleil = new PlaneGeometry(1, 1)
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
  const geometriePoussiere = $derived(
    creerGeometriePoussiere(etat.parametres.nombrePoussieres)
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
    groupeTerre?: Group
    terre?: Mesh
    lune?: Mesh
    soleil?: Mesh
  }>({})

  $effect(() => {
    const geometrie = geometrieEtoiles
    return () => geometrie.dispose()
  })

  $effect(() => {
    const geometrie = geometriePoussiere
    return () => geometrie.dispose()
  })

  $effect(() => {
    const geometrie = geometrieSphere
    return () => geometrie.dispose()
  })

  $effect(() => {
    materiauEtoiles.uniforms.uRatioPixels.value = etat.ratioPixels
    materiauPoussiere.uniforms.uRatioPixels.value = etat.ratioPixels
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
      geometrieSoleil.dispose()
      materiauEtoiles.dispose()
      materiauPoussiere.dispose()
      materiauSoleil.dispose()
      materiauHalo.dispose()
      materiauLisere.dispose()
      materiauTerre.dispose()
      materiauLune.dispose()
    }
  })

  // Outils réutilisés à chaque image (pas d'allocation dans la boucle).
  const directionSoleil = new Vector3(...POSITION_SOLEIL).normalize()
  const directionSoleilTuple: Vec3 = [directionSoleil.x, directionSoleil.y, directionSoleil.z]
  let temps = 0
  let vibration = 0

  /** Place un astre dans sa direction, à sa distance de rendu, à sa taille à l'écran. */
  function placerAstre(
    objet: { position: Vector3; scale: Vector3 } | undefined,
    apparence: ApparenceAstre,
    autre: ApparenceAstre
  ): void {
    if (!objet) return
    const distanceRendu =
      apparence.distanceKm <= autre.distanceKm
        ? DISTANCE_RENDU_PROCHE
        : DISTANCE_RENDU_LOIN
    const rayon =
      distanceRendu * Math.sin(diametreAffiche(apparence.diametreAngulaireRad) / 2)
    const [x, y, z] = apparence.direction
    objet.position.set(x * distanceRendu, y * distanceRendu, z * distanceRendu)
    objet.scale.setScalar(rayon)
  }

  useTask((delta) => {
    temps += delta
    materiauEtoiles.uniforms.uTemps.value = temps
    const aspect = size.current.width / Math.max(1, size.current.height)
    materiauEtoiles.uniforms.uAspect.value = aspect
    materiauPoussiere.uniforms.uAspect.value = aspect

    if (refs.terre) refs.terre.rotation.y += delta * VITESSE_TERRE
    if (refs.lune) refs.lune.rotation.y += delta * VITESSE_LUNE

    // Le vaisseau avance, puis la scène en reflète l'état.
    vaisseau.mettreAJour(delta, etat.mouvementReduit)
    const etatVaisseau = vaisseau.etat
    const effets = effetsMouvement(
      etatVaisseau.vitesseKmS,
      etatVaisseau.poussee,
      etat.mouvementReduit
    )

    const terre = apparenceAstre(etatVaisseau, ASTRES.terre)
    const lune = apparenceAstre(etatVaisseau, ASTRES.lune)
    placerAstre(refs.groupeTerre, terre, lune)
    placerAstre(refs.lune, lune, terre)

    // Sensation de vitesse : étoiles étirées, poussière qui défile à l'opposé du cap.
    materiauEtoiles.uniforms.uEtirement.value = effets.etirementEtoiles
    const poussiere = materiauPoussiere.uniforms
    poussiere.uIntensite.value = effets.intensitePoussiere
    poussiere.uEtirement.value = effets.etirementPoussiere
    const [dx, dy, dz] = directionCap(etatVaisseau)
    const pas = effets.vitessePoussiere * delta
    const decalage = poussiere.uDecalage.value as Vector3
    // Le décalage reste dans [0, boîte[ : pas de perte de précision avec le temps.
    decalage.set(
      MathUtils.euclideanModulo(decalage.x + dx * pas, BOITE_POUSSIERE),
      MathUtils.euclideanModulo(decalage.y + dy * pas, BOITE_POUSSIERE),
      MathUtils.euclideanModulo(decalage.z + dz * pas, BOITE_POUSSIERE)
    )

    const camera = refs.camera
    if (!camera) return

    // Halo du Soleil : un plan face à la caméra, visible quand le Soleil est dans le champ.
    materiauSoleil.uniforms.uIntensite.value = intensiteHaloSoleil(
      directionCap(etatVaisseau),
      directionSoleilTuple
    )
    if (refs.soleil) {
      refs.soleil.position.copy(directionSoleil).multiplyScalar(DISTANCE_HALO_SOLEIL)
      refs.soleil.quaternion.copy(camera.quaternion)
      refs.soleil.scale.setScalar(LARGEUR_HALO_SOLEIL)
    }

    // La caméra prend le cap du vaisseau (lacet, puis tangage, puis roulis).
    camera.rotation.order = 'YXZ'
    if (etat.mouvementReduit) {
      // Mouvement réduit : ni balancement, ni vibration, ni roulis.
      camera.position.set(0, 0, 0)
      camera.rotation.set(etatVaisseau.tangage, etatVaisseau.lacet, 0)
      return
    }
    vibration += (effets.vibration - vibration) * Math.min(1, delta * VIBRATION_LISSAGE)
    const [f1, f2] = VIBRATION_FREQUENCES
    const vibX = Math.sin(temps * f1) * vibration * VIBRATION_POSITION
    const vibY = Math.sin(temps * f2) * vibration * VIBRATION_POSITION
    const vibRot = Math.sin(temps * (f1 + f2)) * vibration * VIBRATION_ROTATION
    const roulis =
      Math.sin((temps * 2 * Math.PI) / PERIODE_ROULIS_S) * effets.roulisMaxRad
    // Très léger balancement du vaisseau, en plus du cap.
    camera.position.set(
      Math.sin(temps * 0.21) * 0.03 + vibX,
      Math.sin(temps * 0.17) * 0.02 + vibY,
      0
    )
    camera.rotation.set(
      etatVaisseau.tangage + Math.sin(temps * 0.13) * 0.006 + vibRot,
      etatVaisseau.lacet + Math.sin(temps * 0.11) * 0.008 + vibRot,
      roulis
    )
  })

  return {
    refs,
    materiauEtoiles,
    materiauPoussiere,
    materiauSoleil,
    geometrieSoleil,
    materiauHalo,
    materiauLisere,
    materiauTerre,
    materiauLune,
    get geometrieEtoiles() {
      return geometrieEtoiles
    },
    get geometriePoussiere() {
      return geometriePoussiere
    },
    get geometrieSphere() {
      return geometrieSphere
    },
  }
}

/** Échelles du halo et du liseré, relatives à la sphère de la Terre (de rayon 1 dans son groupe). */
export const ECHELLE_HALO = 1 + EPAISSEUR_HALO
/** Le liseré colle à la surface sans la traverser. */
export const ECHELLE_LISERE = 1.005
