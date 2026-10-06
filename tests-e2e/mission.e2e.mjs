/* global process, console, document, window, getComputedStyle, Event, NodeFilter, setTimeout */
/**
 * Test de bout en bout de la mission 1 dans Chromium (Playwright).
 *
 * Playwright n'est PAS une dépendance du projet : on l'installe hors du dépôt
 * (par exemple /opt/node-tools) et on donne son chemin :
 *
 *   npm run dev -- --port 5199 --strictPort &
 *   PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright/index.mjs \
 *   CHROMIUM=/opt/pw-browsers/chromium \
 *   node tests-e2e/mission.e2e.mjs
 *
 * Il joue la mission aux niveaux et tailles demandés, avec et sans erreurs, en
 * ne touchant que l'interface (clics, touchers, saisie). Les réponses attendues
 * sont lues dans les données de la mission par le serveur de développement.
 * Les captures vont dans tests-e2e/captures/ (ignoré par Git).
 *
 * Variables : BASE_URL, NIVEAUX="1,4", ERREURS="0,1", TAILLES="390x844,1440x900",
 * CAPTURES (dossier), PARALLELE (nombre de parcours en même temps, 4 par défaut).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')

const BASE = process.env.BASE_URL ?? 'http://localhost:5199/'
const DOSSIER = process.env.CAPTURES ?? 'tests-e2e/captures'
const NIVEAUX = (process.env.NIVEAUX ?? '1,4').split(',').map(Number)
const ERREURS = (process.env.ERREURS ?? '0,1').split(',').map(Number)
const TAILLES = (process.env.TAILLES ?? '390x844,1440x900').split(',').map((t) => t.split('x').map(Number))
const PARALLELE = Number(process.env.PARALLELE ?? 4)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Parcours à jouer : chaque niveau × erreurs × taille. */
const parcours = []
for (const [largeur, hauteur] of TAILLES) {
  for (const niveau of NIVEAUX) {
    for (const erreurs of ERREURS) parcours.push({ largeur, hauteur, niveau, erreurs })
  }
}

/** Contrôles de mise en page exécutés dans la page. */
function controlesPage() {
  document.querySelectorAll('.panneau-dev-vaisseau, [data-stats-dev]').forEach((n) => n.remove())
  const problemes = []
  const visible = (el) => {
    const r = el.getBoundingClientRect()
    const s = getComputedStyle(el)
    if (!(r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !el.closest('[inert]') && !el.disabled)) return false
    // Un élément défilé hors de la zone visible du panneau n'est pas à l'écran.
    const corps = el.closest('.m-corps')
    if (corps) {
      const c = corps.getBoundingClientRect()
      if (r.bottom < c.top + 2 || r.top > c.bottom - 2 || r.right < c.left + 2 || r.left > c.right - 2) return false
    }
    return true
  }
  const mission = document.querySelector('.mission')
  if (!mission) return ['panneau de mission absent']
  if (document.documentElement.scrollWidth > window.innerWidth + 1) problemes.push('défilement horizontal de la page')
  const pr = mission.getBoundingClientRect()
  if (pr.left < -0.5 || pr.right > window.innerWidth + 0.5 || pr.top < -0.5 || pr.bottom > window.innerHeight + 0.5) {
    problemes.push(`panneau hors de l'écran (${Math.round(pr.left)},${Math.round(pr.top)},${Math.round(pr.right)},${Math.round(pr.bottom)})`)
  }
  if (mission.scrollWidth > mission.clientWidth + 1) problemes.push('défilement horizontal dans le panneau')
  // Texte d'au moins 18 px.
  const marcheur = document.createTreeWalker(mission, NodeFilter.SHOW_TEXT)
  const petits = new Set()
  for (let n = marcheur.nextNode(); n; n = marcheur.nextNode()) {
    if (!n.textContent.trim()) continue
    const el = n.parentElement
    if (!el || !visible(el.closest('button, p, span, label, li, h2, h3, strong, figure') ?? el)) continue
    const taille = parseFloat(getComputedStyle(el).fontSize)
    if (taille < 17.99) petits.add(`${n.textContent.trim().slice(0, 30)} (${taille}px)`)
  }
  if (petits.size > 0) problemes.push(`texte sous 18 px : ${[...petits].join(' | ')}`)
  // Boutons du panneau d'au moins 56 px.
  for (const b of mission.querySelectorAll('button')) {
    if (!visible(b)) continue
    const r = b.getBoundingClientRect()
    if (r.height < 55.5 || r.width < 55.5) problemes.push(`bouton trop petit : ${b.textContent.trim().slice(0, 25)} (${Math.round(r.width)}×${Math.round(r.height)})`)
  }
  // Les commandes de l'étape doivent tenir sans défilement dans la zone visible du panneau.
  const corps = mission.querySelector('.m-corps')
  if (corps) {
    const c = corps.getBoundingClientRect()
    for (const b of corps.querySelectorAll('[data-etape] button, [data-etape] [role=switch], [data-etape] input')) {
      if (b.closest('.m-retour')) continue
      const r = b.getBoundingClientRect()
      if (r.width === 0) continue
      if (r.top < c.top - 1 || r.bottom > c.bottom + 1) problemes.push(`commande à faire défiler : ${(b.textContent.trim() || b.id || b.tagName).slice(0, 25)}`)
    }
  }
  // Au moins 12 px entre deux éléments cliquables (hors dev).
  const cliquables = [...document.querySelectorAll('button, input, a[href], [role=switch], select')].filter(visible)
  const rects = cliquables.map((el) => ({ el, r: el.getBoundingClientRect() }))
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i]
      const b = rects[j]
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue
      const dx = Math.max(0, a.r.left - b.r.right, b.r.left - a.r.right)
      const dy = Math.max(0, a.r.top - b.r.bottom, b.r.top - a.r.bottom)
      const d = Math.hypot(dx, dy)
      if (d < 11.5) {
        const nom = (x) => (x.textContent.trim().slice(0, 18) || x.getAttribute('aria-label') || x.tagName).replace(/\s+/g, ' ')
        problemes.push(`éléments à ${d.toFixed(1)} px : « ${nom(a.el)} » et « ${nom(b.el)} »`)
      }
    }
  }
  return problemes
}

/** Positions des trois boutons du pied (Lire, Indice, Suivant). */
function positionsPied() {
  const boutons = [...document.querySelectorAll('.m-pied .m-bouton')]
  return boutons.map((b) => {
    const r = b.getBoundingClientRect()
    return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]
  })
}

async function jouerParcours({ largeur, hauteur, niveau, erreurs }, navigateur) {
  const nom = `${largeur}x${hauteur}-niveau${niveau}-${erreurs > 0 ? 'avec-erreurs' : 'sans-erreur'}`
  const dossier = join(DOSSIER, nom)
  mkdirSync(dossier, { recursive: true })
  const tactile = largeur < 600
  const ctx = await navigateur.newContext({
    viewport: { width: largeur, height: hauteur },
    hasTouch: tactile,
    isMobile: tactile,
    deviceScaleFactor: tactile ? 2 : 1,
  })
  const page = await ctx.newPage()
  const rapport = { nom, erreursConsole: [], problemes: new Map(), captures: [], etapes: [], notes: [], piedRef: null }
  const probleme = (contexte, texte) => {
    const cle = `${texte}`
    if (!rapport.problemes.has(cle)) rapport.problemes.set(cle, contexte)
  }
  page.on('pageerror', (e) => rapport.erreursConsole.push(`pageerror : ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource.*404/.test(m.text())) rapport.erreursConsole.push(m.text())
  })

  const appuyer = async (locator) => (tactile ? locator.tap() : locator.click())
  const photos = new Set()
  const capture = async (clef) => {
    if (photos.has(clef)) return
    photos.add(clef)
    await page.evaluate(() => document.querySelectorAll('.panneau-dev-vaisseau, [data-stats-dev]').forEach((n) => n.remove()))
    await page.screenshot({ path: join(dossier, `${clef}.png`) })
    rapport.captures.push(`${nom}/${clef}.png`)
  }
  const mission = page.locator('.mission')
  const idEtape = () => mission.getAttribute('data-etape-id')
  const typeEtape = () => mission.getAttribute('data-etape-type')

  async function demarrer() {
    await page.goto(BASE)
    await page.locator(`input[name=niveau][value="${niveau}"]`).check({ force: true })
    await page.locator('input[name=copilote]').fill('Nova')
    await appuyer(page.getByRole('button', { name: 'Décollage' }))
    await page.waitForSelector('.mission')
  }

  const attendreChangement = async (ancien, delai = 20000) => {
    await page.waitForFunction((id) => document.querySelector('.mission')?.dataset.etapeId !== id, ancien, { timeout: delai })
  }

  const dejaControle = new Set()
  async function controler(etiquette) {
    const id = `${etiquette}`
    if (dejaControle.has(id)) return
    dejaControle.add(id)
    for (const p of await page.evaluate(controlesPage)) probleme(`${nom} @ ${id}`, p)
    const pied = await page.evaluate(positionsPied)
    if (pied.length === 3) {
      if (!rapport.piedRef) rapport.piedRef = pied
      else if (JSON.stringify(pied) !== JSON.stringify(rapport.piedRef)) probleme(`${nom} @ ${id}`, `Lire/Indice/Suivant ont changé de place : ${JSON.stringify(pied)} au lieu de ${JSON.stringify(rapport.piedRef)}`)
    }
  }

  const fermerRetours = async () => {
    for (let i = 0; i < 5; i++) {
      const bouton = page.locator('.m-retour .m-bouton', { hasText: "J'ai compris" }).first()
      if ((await bouton.count()) === 0) return
      await appuyer(bouton)
      await sleep(60)
    }
  }

  async function attendreOuverte(delai = 25000) {
    await page.waitForSelector('.m-enorme[data-ouverte="true"]', { timeout: delai })
  }

  /** Valeur attendue d'une étape de calcul, lue dans les données par le serveur de développement. */
  const attendu = (id) =>
    page.evaluate(async (etape) => {
      const donnees = (await import('/src/data/missions/mission1.json')).default
      const { evaluer } = await import('/src/core/mission-valeurs.ts')
      const e = donnees.etapes.find((x) => x.id === etape)
      return { valeur: evaluer(e.reponse), format: e.formatReponse }
    }, id)

  const cibleObservation = (id) =>
    page.evaluate(async (etape) => {
      const donnees = (await import('/src/data/missions/mission1.json')).default
      const e = donnees.etapes.find((x) => x.id === etape)
      return { cible: e.cible, mode: e.mode }
    }, id)

  const nombreDe = (texte) => parseFloat(texte.replace(/[\s\u00a0\u202f\u2009]/g, '').replace(',', '.'))

  async function jouerEtape(id, type) {
    const fautes = erreurs > 0
    switch (type) {
      case 'dialogue': {
        if (id === 'p1-accueil') {
          // Aucune avance automatique : on attend, la réplique reste.
          const avant = await page.locator('.m-replique').innerText()
          await sleep(4000)
          if ((await idEtape()) !== id || (await page.locator('.m-replique').innerText()) !== avant) probleme(nom, 'le dialogue a avancé tout seul')
          await appuyer(page.locator('.m-pied .m-bouton').first())
          await sleep(200)
          await capture('dialogue-apres-lire')
        }
        await appuyer(page.getByRole('button', { name: 'Suivant' }))
        break
      }
      case 'choix':
        await appuyer(page.locator('[data-etape=choix] .m-bouton').first())
        break
      case 'calcul': {
        const a = await attendu(id)
        const unite = a.format === 'pourcent' ? '%' : a.format
        if (niveau <= 2) {
          const boutons = page.locator('[data-etape=calcul] .m-grille .m-bouton')
          const textes = await boutons.allInnerTexts()
          const valeurs = textes.map(nombreDe)
          const tri = valeurs.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0])
          if (fautes) {
            await appuyer(boutons.nth(tri[0][1])) // la plus petite : fausse
            await sleep(150)
            await capture('calcul-apres-erreur')
          }
          await appuyer(boutons.nth(tri[1][1])) // la médiane : la bonne (les fausses valent ×0,5 et ×2)
        } else {
          const champ = page.locator('#m-saisie')
          if (fautes) {
            await champ.fill('abc')
            await champ.press('Enter')
            await page.waitForSelector('#m-saisie-erreur', { timeout: 2000 })
            await capture('calcul-saisie-invalide')
            await champ.fill(String(a.valeur * 0.5).replace('.', ','))
            await champ.press('Enter')
            await sleep(150)
            await capture('calcul-apres-erreur')
          }
          const juste = a.format === 'pourcent' ? `${String(a.valeur).replace('.', ',')} ${unite}` : `${Math.round(a.valeur).toLocaleString('fr-FR')} ${unite}`
          await page.locator('#m-saisie').fill(juste)
          await page.locator('#m-saisie').press('Enter')
        }
        break
      }
      case 'action': {
        const interrupteurs = page.locator('[data-etape=action] [role=switch]')
        const n = await interrupteurs.count()
        if (fautes && n > 1) {
          await appuyer(interrupteurs.nth(n - 1)) // dans le désordre : un indice
          await sleep(150)
          await capture('action-apres-erreur')
        }
        for (let i = 0; i < n; i++) {
          if ((await idEtape()) !== id) break
          await appuyer(interrupteurs.nth(i))
          await sleep(80)
          if (i === 0) await capture('action-un-interrupteur')
        }
        break
      }
      case 'timing': {
        if (fautes) {
          await appuyer(page.locator('.m-enorme')) // trop tôt
          await sleep(500)
          await capture('timing-apres-erreur')
        }
        await attendreOuverte()
        // Aux niveaux 3 et 4 la fenêtre est courte : pas de capture avant l'appui.
        if (niveau <= 2) {
          await capture('timing-fenetre-ouverte')
          // Un appui lent suffit aux niveaux 1 et 2 : on attend un peu dans la fenêtre.
          await sleep(600)
        }
        await appuyer(page.locator('.m-enorme'))
        break
      }
      case 'voyage': {
        await sleep(1500)
        await capture('voyage-debut')
        const texte = await mission.innerText()
        if (!texte.trim()) probleme(nom, 'écran de voyage vide')
        if (niveau === 1 && largeur < 600 && !rapport.pauseTestee) {
          rapport.pauseTestee = true
          await testerPause(page, rapport, probleme)
        }
        await page.waitForFunction(() => document.querySelectorAll('.m-jalon').length >= 1, null, { timeout: 60000 })
        await capture('voyage-jalon')
        await attendreChangement(id, 120000)
        break
      }
      case 'observation': {
        const o = await cibleObservation(id)
        const libelles = { reperer: 'Repérer', scanner: 'Scanner' }
        const noms = { terre: 'Terre', lune: 'Lune' }
        const bon = page.getByRole('button', { name: `${libelles[o.mode]} : ${noms[o.cible]}` })
        if (fautes) {
          const faux = page.getByRole('button', { name: `${libelles[o.mode]} : ${noms[o.cible === 'terre' ? 'lune' : 'terre']}` })
          await appuyer(faux)
          await sleep(150)
          await capture('observation-apres-erreur')
        }
        await appuyer(bon)
        break
      }
      case 'descente': {
        await sleep(600)
        await capture('descente-debut')
        if (fautes && niveau >= 3) {
          // Sans freiner : au contact trop rapide, un indice puis un nouvel essai.
          await page.waitForSelector('.m-retour[data-genre=indice]', { timeout: 120000 })
          await capture('descente-apres-erreur')
        } else if (fautes) {
          await page.waitForSelector('.m-retour[data-genre=assistance], [data-etape=descente] .m-statut[data-ok=false]', { timeout: 60000 }).catch(() => {})
          await capture('descente-assistance')
        }
        // Comme un enfant : on freine (MOTEUR) quand la vitesse monte, on lâche quand elle est basse.
        let moteurCapture = false
        for (let i = 0; i < 3000 && (await idEtape()) === id; i++) {
          const moteur = page.locator('[data-etape=descente] .m-enorme')
          const texte = await page.locator('[data-etape=descente] .m-mesures').innerText().catch(() => '')
          const vitesse = nombreDe((/Vitesse : ([\d\s\u00a0\u202f,]+)/.exec(texte) ?? [])[1] ?? 'NaN')
          const allume = (await moteur.getAttribute('aria-pressed').catch(() => null)) === 'true'
          const veutAllumer = allume ? vitesse > 0.8 : vitesse > 1.5
          if (Number.isFinite(vitesse) && veutAllumer !== allume && (await moteur.count()) > 0) {
            await appuyer(moteur).catch(() => {})
            if (veutAllumer && !moteurCapture) {
              moteurCapture = true
              await sleep(300)
              await capture('descente-moteur')
            }
          }
          await sleep(100)
        }
        await attendreChangement(id, 150000)
        break
      }
      default:
        throw new Error(`type d'étape inconnu : ${type}`)
    }
  }

  try {
  await demarrer()
  let derniere = ''
  let essais = 0
  for (let n = 0; n < 300; n++) {
    if ((await page.locator('[data-ecran=fin]').count()) > 0) break
    const id = await idEtape()
    const type = await typeEtape()
    if (id === null) break
    if (id === derniere) {
      essais += 1
      if (essais > 6) throw new Error(`${nom} : bloqué sur l'étape ${id}`)
    } else {
      essais = 0
      derniere = id
      rapport.etapes.push(`${id}:${type}`)
      if (process.env.VERBOSE) console.log(`${nom} → ${id} (${type})`)
      await sleep(120)
      await capture(`etape-${type}`)
      await controler(`${id}`)
    }
    // Les retours (indice, solution) restent affichés jusqu'à leur fermeture.
    const retours = await page.locator('.m-retour').count()
    if (retours > 0) {
      await capture(`retour-${await page.locator('.m-retour').first().getAttribute('data-genre')}`)
      await sleep(1500)
      if ((await page.locator('.m-retour').count()) < retours) probleme(`${nom} @ ${id}`, 'un retour a disparu sans être fermé')
      await controler(`${id}-avec-retour`)
      await fermerRetours()
    }
    await jouerEtape(id, type)
    await sleep(100)
  }

  // --- Fin de mission ---------------------------------------------------------------------
  await page.waitForSelector('[data-ecran=fin]', { timeout: 10000 })
  await sleep(300)
  await capture('fin')
  await controler('fin')
  const textFin = await page.locator('[data-ecran=fin]').innerText()
  const bilan = /Étoiles gagnées : (\d+) sur (\d+)/.exec(textFin)
  if (!bilan) probleme(nom, 'bilan en étoiles absent de l’écran de fin')
  else {
    rapport.etoiles = `${bilan[1]}/${bilan[2]}`
    if (erreurs === 0 && bilan[1] !== bilan[2]) probleme(nom, `sans erreur, toutes les étoiles attendues : ${bilan[1]} sur ${bilan[2]}`)
  }
  for (const bouton of ['Recommencer la mission', 'Changer de niveau']) {
    if ((await page.getByRole('button', { name: bouton }).count()) === 0) probleme(nom, `bouton « ${bouton} » absent`)
  }

  // --- Changer de niveau : retour à la préparation, mission remise à zéro ------------------------
  await appuyer(page.getByRole('button', { name: 'Changer de niveau' }))
  await page.waitForSelector('text=Préparation de mission', { timeout: 5000 })
  await capture('retour-preparation')
  await page.locator(`input[name=niveau][value="${niveau}"]`).check({ force: true })
  await page.locator('input[name=copilote]').fill('Nova')
  await appuyer(page.getByRole('button', { name: 'Décollage' }))
  await page.waitForSelector('.mission')
  if ((await idEtape()) !== 'p1-accueil' || (await page.locator('[data-ecran=reprise]').count()) > 0) probleme(nom, 'après « Changer de niveau », la mission ne repart pas du début')

  // --- Reprise : recharger au milieu de la mission, recommencer, puis recharger et continuer -------
  const avancerUnPeu = async () => {
    await appuyer(page.getByRole('button', { name: 'Suivant' }))
    await attendreChangement('p1-accueil')
    await appuyer(page.locator('[data-etape=choix] .m-bouton').first())
    await attendreChangement('p2-choix')
    return idEtape()
  }
  const rechargerEtDecoller = async () => {
    await page.reload()
    await page.locator('input[name=copilote]').fill('Nova')
    await appuyer(page.getByRole('button', { name: 'Décollage' }))
    await page.waitForSelector('[data-ecran=reprise]')
  }
  await avancerUnPeu()
  await rechargerEtDecoller()
  await capture('reprise')
  await controler('reprise')
  await appuyer(page.getByRole('button', { name: 'Recommencer la mission' }))
  await page.waitForSelector('.m-pied')
  if ((await idEtape()) !== 'p1-accueil') probleme(nom, `« Recommencer » mène à ${await idEtape()} au lieu de p1-accueil`)
  const avantRechargement = await avancerUnPeu()
  await rechargerEtDecoller()
  await appuyer(page.getByRole('button', { name: 'Continuer' }))
  await page.waitForSelector('.m-pied')
  if ((await idEtape()) !== avantRechargement) probleme(nom, `reprise à ${await idEtape()} au lieu de ${avantRechargement}`)
  rapport.notes.push(`reprise : ${avantRechargement}`)

  // --- Journal et « J'ai appris » ----------------------------------------------------------------
  await appuyer(page.getByRole('button', { name: /^Journal/ }))
  await page.waitForSelector('[data-volet=journal]')
  await capture('journal')
  await appuyer(page.getByRole('button', { name: 'Retour à la mission' }))
  await appuyer(page.getByRole('button', { name: /^J'ai appris/ }))
  await page.waitForSelector('[data-volet=appris]')
  await capture('appris')
  await appuyer(page.getByRole('button', { name: 'Retour à la mission' }))

  rapport.ok = true
  } catch (e) {
    await page.screenshot({ path: join(dossier, 'ECHEC.png') }).catch(() => {})
    e.message = `${e.message} (dernière étape : ${rapport.etapes.at(-1)})`
    throw e
  } finally {
    await ctx.close()
  }
  return rapport
}

/** Simule un onglet caché pendant le voyage : la progression ne bouge pas, puis reprend. */
async function testerPause(page, rapport, probleme) {
  const pourcent = () => page.locator('.m-jauge[role=progressbar]').first().getAttribute('aria-valuenow').then(Number)
  await sleep(1000)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await sleep(300)
  const avant = await pourcent()
  await sleep(4000)
  const pendant = await pourcent()
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await sleep(2500)
  const apres = await pourcent()
  rapport.notes.push(`pause : ${avant} % → ${pendant} % (caché) → ${apres} % (visible)`)
  if (pendant !== avant) probleme(rapport.nom, `le voyage a avancé pendant la pause (${avant} → ${pendant})`)
  if (apres <= pendant) probleme(rapport.nom, 'le voyage ne reprend pas après la pause')
}

// --- Exécution ---------------------------------------------------------------------------------------------
const navigateur = await chromium.launch({
  executablePath: process.env.CHROMIUM,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
})
const resultats = []
const file = [...parcours]
async function ouvrier() {
  while (file.length > 0) {
    const p = file.shift()
    const debut = Date.now()
    try {
      const r = await jouerParcours(p, navigateur)
      r.duree = Math.round((Date.now() - debut) / 1000)
      resultats.push(r)
      console.log(`✓ ${r.nom} en ${r.duree} s, ${r.etapes.length} étapes, étoiles ${r.etoiles ?? '?'}`)
    } catch (e) {
      resultats.push({ nom: `${p.largeur}x${p.hauteur}-niveau${p.niveau}-${p.erreurs}`, echec: String(e.message ?? e), problemes: new Map(), erreursConsole: [], captures: [], etapes: [], notes: [] })
      console.log(`✗ ${p.largeur}x${p.hauteur} niveau ${p.niveau} erreurs ${p.erreurs} : ${e.message ?? e}`)
    }
  }
}
await Promise.all(Array.from({ length: PARALLELE }, ouvrier))
await navigateur.close()

let echecs = 0
const sortie = []
for (const r of resultats.sort((a, b) => a.nom.localeCompare(b.nom))) {
  const problemes = [...r.problemes.entries()].map(([texte, ctx]) => `${texte}  [${ctx}]`)
  if (r.echec || problemes.length > 0 || r.erreursConsole.length > 0) echecs += 1
  sortie.push(`## ${r.nom}`, r.echec ? `ÉCHEC : ${r.echec}` : `étapes jouées : ${r.etapes.length}, étoiles : ${r.etoiles ?? '?'}`)
  for (const n of r.notes) sortie.push(`- ${n}`)
  for (const p of problemes) sortie.push(`- PROBLÈME ${p}`)
  for (const e of r.erreursConsole) sortie.push(`- ERREUR CONSOLE ${e}`)
  sortie.push(`- captures : ${r.captures.length}`, '')
}
mkdirSync(DOSSIER, { recursive: true })
writeFileSync(join(DOSSIER, 'rapport.md'), sortie.join('\n'))
console.log(sortie.join('\n'))
console.log(echecs === 0 ? 'TOUT EST BON' : `${echecs} parcours avec des problèmes`)
process.exit(echecs === 0 ? 0 : 1)
