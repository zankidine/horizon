import { ASTRES } from './astres'
import {
  FORMATS_VALEUR,
  LOCUTEURS,
  MODES_OBSERVATION,
  ORDRES_ACTION,
  TYPES_ETAPE,
  TYPES_JALON,
  type Etape,
  type Mission,
} from './mission-types'
import { marqueursDe, resoudreRef } from './mission-valeurs'
import { ErreurValidation, estObjet, verifierTexteProfil, PROFILS } from './validation'

const FORMAT_ID = /^[a-z0-9-]+$/
const FORMAT_NOM_VALEUR = /^[a-zA-Z]\w*$/

/** Marqueurs fournis par le moteur dans tous les textes. */
const MARQUEURS_MOTEUR = ['copilote'] as const
/** Marqueur ajouté dans les textes d'aide d'un calcul. */
const MARQUEUR_REPONSE = 'reponse'
/** Marqueurs ajoutés dans les textes d'un jalon de voyage. */
const MARQUEURS_JALON = ['distance', 'delai'] as const

function estDans<T extends string>(valeurs: readonly T[], valeur: unknown): valeur is T {
  return typeof valeur === 'string' && (valeurs as readonly string[]).includes(valeur)
}

const ASTRES_CONNUS = Object.keys(ASTRES)

/** Vérifie une expression : références connues, structure, aucun nombre écrit en dur. */
function verifierExpr(brut: unknown, chemin: string, problemes: string[]): void {
  if (!estObjet(brut)) {
    problemes.push(`${chemin} : expression { ref } | { produit } | { quotient } | { somme } attendue (pas de nombre écrit en dur)`)
    return
  }
  const cles = Object.keys(brut)
  if (cles.length !== 1) {
    problemes.push(`${chemin} : une seule clé attendue (ref, produit, quotient ou somme)`)
    return
  }
  const [cle] = cles
  const valeur = brut[cle]
  if (cle === 'ref') {
    if (typeof valeur !== 'string' || resoudreRef(valeur) === undefined) {
      problemes.push(`${chemin}.ref : la constante « ${String(valeur)} » n'existe pas dans constants.ts (nombre ou table de nombres)`)
    }
  } else if (cle === 'produit' || cle === 'somme') {
    if (!Array.isArray(valeur) || valeur.length < 2) {
      problemes.push(`${chemin}.${cle} : tableau d'au moins deux expressions attendu`)
    } else {
      valeur.forEach((e: unknown, i) => verifierExpr(e, `${chemin}.${cle}[${i}]`, problemes))
    }
  } else if (cle === 'quotient') {
    if (!Array.isArray(valeur) || valeur.length !== 2) {
      problemes.push(`${chemin}.quotient : deux expressions [dividende, diviseur] attendues`)
    } else {
      valeur.forEach((e: unknown, i) => verifierExpr(e, `${chemin}.quotient[${i}]`, problemes))
    }
  } else {
    problemes.push(`${chemin} : clé « ${cle} » inconnue (ref, produit, quotient ou somme)`)
  }
}

/** Vérifie qu'un texte profil n'emploie que des marqueurs connus. */
function verifierMarqueurs(
  texte: unknown,
  chemin: string,
  autorises: ReadonlySet<string>,
  problemes: string[]
): void {
  if (!estObjet(texte)) return
  for (const profil of PROFILS) {
    const t = texte[profil]
    if (typeof t !== 'string') continue
    for (const marqueur of marqueursDe(t)) {
      if (!autorises.has(marqueur)) {
        problemes.push(`${chemin}.${profil} : le marqueur {${marqueur}} n'est pas défini dans la mission`)
      }
    }
  }
}

interface Contexte {
  problemes: string[]
  scenes: Set<string>
  journal: Set<string>
  marqueurs: Set<string>
}

function verifierTexte(brut: unknown, chemin: string, ctx: Contexte, supplementaires: readonly string[] = []) {
  if (verifierTexteProfil(brut, chemin, ctx.problemes)) {
    verifierMarqueurs(brut, chemin, new Set([...ctx.marqueurs, ...supplementaires]), ctx.problemes)
  }
}

function verifierAide(brut: Record<string, unknown>, chemin: string, ctx: Contexte) {
  if (!Array.isArray(brut.indices) || brut.indices.length === 0) {
    ctx.problemes.push(`${chemin}.indices : au moins un indice attendu (une erreur donne un indice, puis la solution)`)
  } else {
    brut.indices.forEach((t: unknown, i) => verifierTexte(t, `${chemin}.indices[${i}]`, ctx, [MARQUEUR_REPONSE]))
  }
  verifierTexte(brut.solution, `${chemin}.solution`, ctx, [MARQUEUR_REPONSE])
}

function verifierAstre(brut: unknown, chemin: string, problemes: string[]) {
  if (typeof brut !== 'string' || !ASTRES_CONNUS.includes(brut)) {
    problemes.push(`${chemin} : astre inconnu « ${String(brut)} » (attendu : ${ASTRES_CONNUS.join(', ')})`)
  }
}

function verifierEtape(brut: Record<string, unknown>, chemin: string, ctx: Contexte) {
  const { problemes } = ctx
  if (typeof brut.scene !== 'string' || !ctx.scenes.has(brut.scene)) {
    problemes.push(`${chemin}.scene : scène inconnue « ${String(brut.scene)} »`)
  }
  verifierTexte(brut.objectif, `${chemin}.objectif`, ctx)
  if (brut.rappel !== undefined) verifierTexte(brut.rappel, `${chemin}.rappel`, ctx)
  for (const cle of ['effetsEntree', 'effetsSortie'] as const) {
    const effets = brut[cle]
    if (effets !== undefined && (!Array.isArray(effets) || !effets.every((e) => typeof e === 'string' && FORMAT_ID.test(e)))) {
      problemes.push(`${chemin}.${cle} : liste de noms d'effet (minuscules, chiffres, tirets) attendue`)
    }
  }
  if (brut.journal !== undefined && (typeof brut.journal !== 'string' || !ctx.journal.has(brut.journal))) {
    problemes.push(`${chemin}.journal : entrée de journal inconnue « ${String(brut.journal)} »`)
  }
  if (brut.etoile !== undefined && typeof brut.etoile !== 'boolean') problemes.push(`${chemin}.etoile : booléen attendu`)

  switch (brut.type) {
    case 'dialogue':
      if (!estDans(LOCUTEURS, brut.locuteur)) problemes.push(`${chemin}.locuteur : ${LOCUTEURS.join(', ')} attendu`)
      verifierTexte(brut.texte, `${chemin}.texte`, ctx)
      break
    case 'choix':
      verifierTexte(brut.question, `${chemin}.question`, ctx)
      if (!Array.isArray(brut.options) || brut.options.length < 2) {
        problemes.push(`${chemin}.options : au moins deux options attendues`)
      } else {
        const ids = new Set<string>()
        brut.options.forEach((o: unknown, i) => {
          const ch = `${chemin}.options[${i}]`
          if (!estObjet(o)) return void problemes.push(`${ch} : objet attendu`)
          if (typeof o.id !== 'string' || !FORMAT_ID.test(o.id)) problemes.push(`${ch}.id : identifiant attendu`)
          else if (ids.has(o.id)) problemes.push(`${ch}.id : « ${o.id} » est en double`)
          else ids.add(o.id)
          verifierTexte(o.texte, `${ch}.texte`, ctx)
          if (typeof o.suivant !== 'string') problemes.push(`${ch}.suivant : chaque option doit avoir une suite`)
        })
      }
      break
    case 'calcul':
      verifierTexte(brut.question, `${chemin}.question`, ctx)
      verifierExpr(brut.reponse, `${chemin}.reponse`, problemes)
      if (!estDans(FORMATS_VALEUR, brut.formatReponse)) problemes.push(`${chemin}.formatReponse : ${FORMATS_VALEUR.join(', ')} attendu`)
      verifierAide(brut, chemin, ctx)
      break
    case 'action':
      if (!estDans(ORDRES_ACTION, brut.ordre)) problemes.push(`${chemin}.ordre : ${ORDRES_ACTION.join(', ')} attendu`)
      if (!Array.isArray(brut.interrupteurs) || brut.interrupteurs.length === 0) {
        problemes.push(`${chemin}.interrupteurs : au moins un interrupteur attendu`)
      } else {
        const ids = new Set<string>()
        brut.interrupteurs.forEach((o: unknown, i) => {
          const ch = `${chemin}.interrupteurs[${i}]`
          if (!estObjet(o)) return void problemes.push(`${ch} : objet attendu`)
          if (typeof o.id !== 'string' || !FORMAT_ID.test(o.id)) problemes.push(`${ch}.id : identifiant attendu`)
          else if (ids.has(o.id)) problemes.push(`${ch}.id : « ${o.id} » est en double`)
          else ids.add(o.id)
          verifierTexte(o.libelle, `${ch}.libelle`, ctx)
        })
      }
      verifierAide(brut, chemin, ctx)
      break
    case 'timing':
      verifierTexte(brut.consigne, `${chemin}.consigne`, ctx)
      verifierAide(brut, chemin, ctx)
      break
    case 'voyage': {
      verifierAstre(brut.cible, `${chemin}.cible`, problemes)
      if (!estObjet(brut.depart)) {
        problemes.push(`${chemin}.depart : { astre, altitude } attendu`)
      } else {
        verifierAstre(brut.depart.astre, `${chemin}.depart.astre`, problemes)
        verifierExpr(brut.depart.altitude, `${chemin}.depart.altitude`, problemes)
        if (brut.depart.astre !== undefined && brut.depart.astre === brut.cible) {
          problemes.push(`${chemin}.depart.astre : le départ et la cible doivent différer`)
        }
      }
      verifierExpr(brut.vitesse, `${chemin}.vitesse`, problemes)
      verifierExpr(brut.facteurTemps, `${chemin}.facteurTemps`, problemes)
      verifierExpr(brut.arrivee, `${chemin}.arrivee`, problemes)
      if (!Array.isArray(brut.jalons)) {
        problemes.push(`${chemin}.jalons : tableau attendu (l'écran ne doit jamais rester vide)`)
      } else {
        let precedent = 0
        brut.jalons.forEach((j: unknown, i) => {
          const ch = `${chemin}.jalons[${i}]`
          if (!estObjet(j)) return void problemes.push(`${ch} : objet attendu`)
          if (typeof j.part !== 'number' || !(j.part > 0 && j.part < 1)) {
            problemes.push(`${ch}.part : nombre strictement entre 0 et 1 attendu`)
          } else if (j.part <= precedent) {
            problemes.push(`${ch}.part : les jalons doivent être dans l'ordre croissant`)
          } else {
            precedent = j.part
          }
          if (!estDans(TYPES_JALON, j.type)) problemes.push(`${ch}.type : ${TYPES_JALON.join(', ')} attendu`)
          verifierTexte(j.texte, `${ch}.texte`, ctx, MARQUEURS_JALON)
          if (j.type === 'observation') verifierAstre(j.astre, `${ch}.astre`, problemes)
          if (j.type === 'journal' && j.journal === undefined) problemes.push(`${ch}.journal : entrée de journal attendue`)
          if (j.journal !== undefined && (typeof j.journal !== 'string' || !ctx.journal.has(j.journal))) {
            problemes.push(`${ch}.journal : entrée de journal inconnue « ${String(j.journal)} »`)
          }
        })
      }
      break
    }
    case 'observation':
      verifierAstre(brut.cible, `${chemin}.cible`, problemes)
      if (!estDans(MODES_OBSERVATION, brut.mode)) problemes.push(`${chemin}.mode : ${MODES_OBSERVATION.join(', ')} attendu`)
      verifierAide(brut, chemin, ctx)
      break
  }
}

/** Étapes qui suivent une étape (les options d'un choix, ou « suivant »). */
function suites(etape: Etape): string[] {
  if (etape.type === 'choix') return etape.options.map((o) => o.suivant)
  return etape.suivant !== undefined ? [etape.suivant] : []
}

/** Vérifie le graphe : suites connues, étapes sans suite, inatteignables, boucles. */
function verifierGraphe(mission: Mission, problemes: string[]) {
  const parId = new Map(mission.etapes.map((e) => [e.id, e]))
  for (const etape of mission.etapes) {
    for (const suite of suites(etape)) {
      if (!parId.has(suite)) problemes.push(`étape « ${etape.id} » : la suite « ${suite} » n'existe pas`)
    }
    if (etape.type === 'choix' && etape.suivant !== undefined) {
      problemes.push(`étape « ${etape.id} » : un choix n'a pas de « suivant », chaque option a sa suite`)
    }
    if (etape.fin === true) {
      if (suites(etape).length > 0) problemes.push(`étape « ${etape.id} » : une étape finale n'a pas de suite`)
    } else if (suites(etape).length === 0) {
      problemes.push(`étape « ${etape.id} » : sans suite (ajouter « suivant » ou marquer « fin »)`)
    }
  }
  if (!parId.has(mission.debut)) {
    problemes.push(`debut : l'étape « ${mission.debut} » n'existe pas`)
    return
  }

  // Parcours en profondeur : état 1 = en cours (une arête vers lui est une boucle), 2 = terminé.
  const etat = new Map<string, 1 | 2>()
  const boucles = new Set<string>()
  const visiter = (id: string, chemin: string[]) => {
    etat.set(id, 1)
    for (const suite of suites(parId.get(id)!)) {
      if (!parId.has(suite)) continue
      const e = etat.get(suite)
      if (e === 1) boucles.add([...chemin.slice(chemin.indexOf(suite)), suite].join(' → '))
      else if (e === undefined) visiter(suite, [...chemin, suite])
    }
    etat.set(id, 2)
  }
  visiter(mission.debut, [mission.debut])
  for (const boucle of boucles) problemes.push(`boucle : ${boucle} (une mission avance toujours)`)
  for (const etape of mission.etapes) {
    if (!etat.has(etape.id)) problemes.push(`étape « ${etape.id} » : inatteignable depuis « ${mission.debut} »`)
  }
}

/** Valide les données JSON d'une mission ; lève ErreurValidation avec tous les problèmes. */
export function validerMission(donnees: unknown): Mission {
  if (!estObjet(donnees)) throw new ErreurValidation('mission', ['objet attendu'])
  const problemes: string[] = []
  if (typeof donnees.id !== 'string' || !FORMAT_ID.test(donnees.id)) {
    problemes.push('id : identifiant en minuscules, chiffres et tirets attendu')
  }
  verifierTexteProfil(donnees.titre, 'titre', problemes)
  if (typeof donnees.debut !== 'string') problemes.push('debut : identifiant de la première étape attendu')

  const ctx: Contexte = {
    problemes,
    scenes: new Set(),
    journal: new Set(),
    marqueurs: new Set(MARQUEURS_MOTEUR),
  }

  if (!Array.isArray(donnees.scenes) || donnees.scenes.length === 0) {
    problemes.push('scenes : tableau non vide attendu')
  } else {
    donnees.scenes.forEach((s: unknown, i) => {
      const chemin = `scenes[${i}]`
      if (!estObjet(s)) return void problemes.push(`${chemin} : objet attendu`)
      if (typeof s.id !== 'string' || !FORMAT_ID.test(s.id)) problemes.push(`${chemin}.id : identifiant attendu`)
      else if (ctx.scenes.has(s.id)) problemes.push(`${chemin}.id : « ${s.id} » est en double`)
      else ctx.scenes.add(s.id)
      verifierTexteProfil(s.titre, `${chemin}.titre`, problemes)
    })
  }

  if (donnees.valeurs !== undefined && !estObjet(donnees.valeurs)) {
    problemes.push('valeurs : objet attendu')
  } else {
    for (const [nom, def] of Object.entries(donnees.valeurs ?? {})) {
      const chemin = `valeurs.${nom}`
      if (!FORMAT_NOM_VALEUR.test(nom)) problemes.push(`${chemin} : nom de valeur invalide`)
      if (MARQUEURS_MOTEUR.some((m) => m === nom) || nom === MARQUEUR_REPONSE || MARQUEURS_JALON.some((m) => m === nom)) {
        problemes.push(`${chemin} : « ${nom} » est un marqueur réservé`)
      }
      if (!estObjet(def)) {
        problemes.push(`${chemin} : objet { expr, format } attendu`)
        continue
      }
      verifierExpr(def.expr, `${chemin}.expr`, problemes)
      if (!estDans(FORMATS_VALEUR, def.format)) problemes.push(`${chemin}.format : ${FORMATS_VALEUR.join(', ')} attendu`)
      if (def.approximatif !== undefined && typeof def.approximatif !== 'boolean') {
        problemes.push(`${chemin}.approximatif : booléen attendu`)
      }
      ctx.marqueurs.add(nom)
    }
  }

  if (!Array.isArray(donnees.journal)) {
    problemes.push('journal : tableau attendu')
  } else {
    donnees.journal.forEach((e: unknown, i) => {
      const chemin = `journal[${i}]`
      if (!estObjet(e)) return void problemes.push(`${chemin} : objet attendu`)
      if (typeof e.id !== 'string' || !FORMAT_ID.test(e.id)) problemes.push(`${chemin}.id : identifiant attendu`)
      else if (ctx.journal.has(e.id)) problemes.push(`${chemin}.id : « ${e.id} » est en double`)
      else ctx.journal.add(e.id)
    })
    donnees.journal.forEach((e: unknown, i) => {
      if (!estObjet(e)) return
      verifierTexte(e.titre, `journal[${i}].titre`, ctx)
      verifierTexte(e.texte, `journal[${i}].texte`, ctx, MARQUEURS_JALON)
    })
  }

  if (!Array.isArray(donnees.etapes) || donnees.etapes.length === 0) {
    problemes.push('etapes : tableau non vide attendu')
  } else {
    const ids = new Set<string>()
    const scenesUtilisees = new Set<string>()
    donnees.etapes.forEach((e: unknown, i) => {
      const chemin = `etapes[${i}]`
      if (!estObjet(e)) return void problemes.push(`${chemin} : objet attendu`)
      if (typeof e.id !== 'string' || !FORMAT_ID.test(e.id)) problemes.push(`${chemin}.id : identifiant attendu`)
      else if (ids.has(e.id)) problemes.push(`${chemin}.id : « ${e.id} » est en double`)
      else ids.add(e.id)
      if (!estDans(TYPES_ETAPE, e.type)) {
        problemes.push(`${chemin}.type : ${TYPES_ETAPE.join(', ')} attendu`)
        return
      }
      if (typeof e.scene === 'string') scenesUtilisees.add(e.scene)
      if (e.suivant !== undefined && typeof e.suivant !== 'string') problemes.push(`${chemin}.suivant : identifiant d'étape attendu`)
      if (e.fin !== undefined && e.fin !== true) problemes.push(`${chemin}.fin : vaut true ou est absent`)
      verifierEtape(e, chemin, ctx)
    })
    for (const scene of ctx.scenes) {
      if (!scenesUtilisees.has(scene)) problemes.push(`scène « ${scene} » : aucune étape`)
    }
  }

  if (problemes.length > 0) throw new ErreurValidation('mission', problemes)
  verifierGrapheSiPossible(donnees as unknown as Mission)
  return donnees as unknown as Mission
}

/** Le graphe n'est vérifié qu'une fois la structure valide (sinon les types ne sont pas sûrs). */
function verifierGrapheSiPossible(mission: Mission) {
  const problemes: string[] = []
  verifierGraphe(mission, problemes)
  if (problemes.length > 0) throw new ErreurValidation('mission', problemes)
}
