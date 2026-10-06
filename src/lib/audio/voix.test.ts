import { describe, it, expect } from 'vitest'
import {
  choisirVoix,
  DELAI_ESSAI_VOIX_MS,
  DELAI_RELANCE_MS,
  FILE_MAX,
  FileVoix,
  VOLUME_VOIX_MAX,
  type EnonceSynthese,
  type Synthese,
  type VoixSynthese,
} from './voix'

const voix = (name: string, lang: string, localService: boolean, defaut = false): VoixSynthese => ({ name, lang, localService, default: defaut })

describe('choisirVoix : voix française locale d’abord', () => {
  it('choisit la voix fr-FR locale', () => {
    const v = choisirVoix([voix('Anglais', 'en-US', true), voix('Amélie', 'fr-FR', true), voix('Canada', 'fr-CA', true)], { voixEnLigne: false })
    expect(v?.name).toBe('Amélie')
  })

  it('une voix distante n’est jamais choisie par défaut, même si elle est française', () => {
    expect(choisirVoix([voix('Distante', 'fr-FR', false)], { voixEnLigne: false })).toBeNull()
    expect(choisirVoix([voix('Distante', 'fr-FR', false), voix('Locale', 'fr-CA', true)], { voixEnLigne: false })?.name).toBe('Locale')
  })

  it('avec l’option « voix en ligne », une voix distante est permise mais la locale reste préférée', () => {
    const toutes = [voix('Distante', 'fr-FR', false), voix('Locale', 'fr-FR', true)]
    expect(choisirVoix(toutes, { voixEnLigne: true })?.name).toBe('Locale')
    expect(choisirVoix([voix('Distante', 'fr-FR', false)], { voixEnLigne: true })?.name).toBe('Distante')
  })

  it('aucune voix française : null (silence)', () => {
    expect(choisirVoix([voix('Anglais', 'en-GB', true)], { voixEnLigne: true })).toBeNull()
    expect(choisirVoix([], { voixEnLigne: false })).toBeNull()
  })

  it('accepte « fr_FR » (Android), préfère fr-FR puis la voix par défaut', () => {
    expect(choisirVoix([voix('A', 'fr-BE', true), voix('B', 'fr_FR', true)], { voixEnLigne: false })?.name).toBe('B')
    expect(choisirVoix([voix('A', 'fr-BE', true), voix('B', 'fr-CA', true, true)], { voixEnLigne: false })?.name).toBe('B')
  })
})

/** Faux speechSynthesis et faux planificateur manuel. */
function banc(voixInitiales: VoixSynthese[] = [voix('Locale', 'fr-FR', true)]) {
  const journal: string[] = []
  const enonces: EnonceSynthese[] = []
  const ecouteurs: (() => void)[] = []
  let liste = voixInitiales
  const synthese: Synthese = {
    getVoices: () => liste,
    speak: (e) => {
      journal.push(`speak:${e.text}`)
      enonces.push(e)
    },
    cancel: () => void journal.push('cancel'),
    addEventListener: (_t, f) => void ecouteurs.push(f),
    removeEventListener: (_t, f) => void ecouteurs.splice(ecouteurs.indexOf(f), 1),
  }
  const taches: { fn: () => void; a: number; annulee: boolean }[] = []
  let maintenant = 0
  const planifier = (fn: () => void, ms: number) => {
    const tache = { fn, a: maintenant + ms, annulee: false }
    taches.push(tache)
    return () => void (tache.annulee = true)
  }
  const avancer = (ms: number) => {
    const fin = maintenant + ms
    for (;;) {
      const prochaine = taches.filter((t) => !t.annulee && t.a <= fin).sort((x, y) => x.a - y.a)[0]
      if (!prochaine) break
      maintenant = prochaine.a
      prochaine.annulee = true
      prochaine.fn()
    }
    maintenant = fin
  }
  const creerEnonce = (texte: string): EnonceSynthese => ({
    text: texte,
    lang: '',
    voice: null,
    rate: 1,
    pitch: 1,
    volume: 1,
    onend: null,
    onerror: null,
  })
  const file = new FileVoix({ synthese, creerEnonce, planifier })
  return {
    file,
    journal,
    enonces,
    avancer,
    changerVoix: (v: VoixSynthese[]) => {
      liste = v
      ecouteurs.forEach((f) => f())
    },
    definirListe: (v: VoixSynthese[]) => (liste = v),
    ecouteurs,
    tachesActives: () => taches.filter((t) => !t.annulee).length,
  }
}

describe('FileVoix : lecture', () => {
  it('annule (cancel) avant de relancer, puis parle avec la voix locale française', () => {
    const b = banc()
    expect(b.file.parler('Bonjour')).toBe(true)
    b.avancer(DELAI_RELANCE_MS)
    expect(b.journal).toEqual(['cancel', 'speak:Bonjour'])
    expect(b.enonces[0].voice?.name).toBe('Locale')
    expect(b.enonces[0].lang).toBe('fr-FR')
  })

  it('les répliques se suivent une par une : la deuxième attend la fin de la première', () => {
    const b = banc()
    b.file.parler('Un')
    b.file.parler('Deux')
    b.avancer(DELAI_RELANCE_MS)
    expect(b.journal.filter((j) => j.startsWith('speak'))).toEqual(['speak:Un'])
    b.enonces[0].onend!()
    b.avancer(DELAI_RELANCE_MS * 3)
    expect(b.journal.filter((j) => j.startsWith('speak'))).toEqual(['speak:Un', 'speak:Deux'])
    // Un cancel() précède chaque lecture.
    expect(b.journal.join(',')).toBe('cancel,speak:Un,cancel,speak:Deux')
  })

  it('la file est limitée : les plus anciennes répliques en attente sont abandonnées', () => {
    const b = banc()
    for (let i = 1; i <= FILE_MAX + 3; i++) b.file.parler(`R${i}`)
    b.avancer(DELAI_RELANCE_MS)
    for (let i = 0; i < 10; i++) {
      b.enonces[b.enonces.length - 1].onend!()
      b.avancer(DELAI_RELANCE_MS * 3)
    }
    const dites = b.journal.filter((j) => j.startsWith('speak')).map((j) => j.slice(6))
    // La première réplique, puis seulement les FILE_MAX plus récentes.
    expect(dites).toEqual(['R1', 'R4', 'R5', 'R6'])
    expect(dites).toHaveLength(1 + FILE_MAX)
  })

  it('interrompre : coupe la réplique en cours et passe à la nouvelle, sans reprendre l’ancienne', () => {
    const b = banc()
    b.file.parler('Ancienne')
    b.avancer(DELAI_RELANCE_MS)
    b.file.parler('Nouvelle', { interrompre: true })
    b.enonces[0].onend!() // la fin tardive de l'ancienne est ignorée
    b.avancer(DELAI_RELANCE_MS * 3)
    expect(b.journal.filter((j) => j.startsWith('speak'))).toEqual(['speak:Ancienne', 'speak:Nouvelle'])
  })

  it('une erreur de lecture ne bloque pas la file', () => {
    const b = banc()
    b.file.parler('Un')
    b.file.parler('Deux')
    b.avancer(DELAI_RELANCE_MS)
    b.enonces[0].onerror!()
    b.avancer(DELAI_RELANCE_MS * 3)
    expect(b.journal).toContain('speak:Deux')
  })

  it('si la fin n’est jamais signalée, un filet de sécurité passe à la suite', () => {
    const b = banc()
    b.file.parler('Un')
    b.file.parler('Deux')
    b.avancer(DELAI_RELANCE_MS)
    b.avancer(60_000) // aucun onend
    expect(b.journal).toContain('speak:Deux')
  })

  it('le volume suit le canal « voix » et ne dépasse jamais le plafond de la voix', () => {
    const b = banc()
    b.file.definirReglages({ muet: false, volume: 1, voixEnLigne: false })
    b.file.parler('Fort')
    b.avancer(DELAI_RELANCE_MS)
    expect(b.enonces[0].volume).toBeCloseTo(VOLUME_VOIX_MAX, 12)
    expect(b.enonces[0].volume).toBeLessThan(1)
  })
})

describe('FileVoix : silence, muet, onglet caché', () => {
  it('sans voix française locale : silence, et rien n’est envoyé à speak()', () => {
    const b = banc([voix('Distante', 'fr-FR', false), voix('Anglais', 'en-US', true)])
    expect(b.file.disponible).toBe(false)
    expect(b.file.parler('Bonjour')).toBe(false)
    b.avancer(5000)
    expect(b.journal.filter((j) => j.startsWith('speak'))).toEqual([])
  })

  it('sans speechSynthesis du tout : repli silencieux, sans erreur', () => {
    const file = new FileVoix({ synthese: null, creerEnonce: () => ({}) as EnonceSynthese, planifier: () => () => undefined })
    expect(file.parler('Bonjour')).toBe(false)
    expect(() => file.arreter()).not.toThrow()
  })

  it('voix distante autorisée seulement après l’option « voix en ligne »', () => {
    const b = banc([voix('Distante', 'fr-FR', false)])
    expect(b.file.parler('A')).toBe(false)
    b.file.definirReglages({ muet: false, volume: 0.7, voixEnLigne: true })
    expect(b.file.parler('B')).toBe(true)
    b.avancer(DELAI_RELANCE_MS)
    expect(b.journal).toContain('speak:B')
    b.file.definirReglages({ muet: false, volume: 0.7, voixEnLigne: false })
    expect(b.file.voixChoisie).toBeNull()
  })

  it('muet ou volume nul : on coupe la réplique en cours, la file est vidée, plus rien ne part', () => {
    const b = banc()
    b.file.parler('Un')
    b.file.parler('Deux')
    b.avancer(DELAI_RELANCE_MS)
    b.file.definirReglages({ muet: true, volume: 0.7, voixEnLigne: false })
    expect(b.journal[b.journal.length - 1]).toBe('cancel')
    expect(b.file.parler('Trois')).toBe(false)
    b.avancer(5000)
    expect(b.journal.filter((j) => j.startsWith('speak'))).toEqual(['speak:Un'])
    b.file.definirReglages({ muet: false, volume: 0, voixEnLigne: false })
    expect(b.file.parler('Quatre')).toBe(false)
  })

  it('onglet caché : annule et nettoie la file', () => {
    const b = banc()
    b.file.parler('Un')
    b.file.parler('Deux')
    b.avancer(DELAI_RELANCE_MS)
    b.file.surVisibilite(true)
    b.enonces[0].onend?.()
    b.avancer(5000)
    expect(b.journal.filter((j) => j.startsWith('speak'))).toEqual(['speak:Un'])
    expect(b.journal[b.journal.length - 1]).toBe('cancel')
    // Quand l'onglet revient, la voix reparle normalement.
    b.file.surVisibilite(false)
    b.file.parler('Retour')
    b.avancer(DELAI_RELANCE_MS)
    expect(b.journal).toContain('speak:Retour')
  })

  it('un texte vide ou fait d’espaces n’est pas dit', () => {
    const b = banc()
    expect(b.file.parler('   \n ')).toBe(false)
  })
})

describe('FileVoix : getVoices() vide au premier appel', () => {
  it('l’événement voiceschanged apporte les voix, puis la voix parle', () => {
    const b = banc([])
    expect(b.file.parler('Trop tôt')).toBe(false)
    b.changerVoix([voix('Locale', 'fr-FR', true)])
    expect(b.file.voixChoisie?.name).toBe('Locale')
    expect(b.file.parler('Maintenant')).toBe(true)
    b.avancer(DELAI_RELANCE_MS)
    expect(b.journal).toContain('speak:Maintenant')
  })

  it('sans événement, des essais réguliers retrouvent les voix', () => {
    const b = banc([])
    b.definirListe([voix('Locale', 'fr-FR', true)])
    b.avancer(DELAI_ESSAI_VOIX_MS)
    expect(b.file.voixChoisie?.name).toBe('Locale')
  })

  it('les essais s’arrêtent après un nombre fini de tentatives (pas de boucle infinie)', () => {
    const b = banc([])
    b.avancer(DELAI_ESSAI_VOIX_MS * 50)
    expect(b.tachesActives()).toBe(0)
  })

  it('une réplique demandée avant l’arrivée des voix n’est pas rejouée plus tard (silence assumé)', () => {
    const b = banc([])
    b.file.parler('Perdue')
    b.changerVoix([voix('Locale', 'fr-FR', true)])
    b.avancer(5000)
    expect(b.journal.filter((j) => j.startsWith('speak'))).toEqual([])
  })

  it('detruire retire l’écoute de voiceschanged et arrête tout', () => {
    const b = banc()
    expect(b.ecouteurs).toHaveLength(1)
    b.file.detruire()
    expect(b.ecouteurs).toHaveLength(0)
  })
})
