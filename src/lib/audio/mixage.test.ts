import { describe, it, expect } from 'vitest'
import { CLE_AUDIO, VOLUMES_PAR_DEFAUT } from './constantes'
import {
  canalActif,
  chargerReglages,
  lireReglages,
  reglagesParDefaut,
  sauvegarderReglages,
  serialiserReglages,
  volumeValide,
  type Stockage,
} from './mixage'

function stockage(initial?: string): Stockage & { contenu: Map<string, string> } {
  const contenu = new Map<string, string>()
  if (initial !== undefined) contenu.set(CLE_AUDIO, initial)
  return { contenu, getItem: (k) => contenu.get(k) ?? null, setItem: (k, v) => void contenu.set(k, v) }
}

describe('réglages par défaut', () => {
  it('volumes modérés (jamais à fond), pas muet, voix en ligne désactivée', () => {
    const r = reglagesParDefaut()
    for (const v of Object.values(r.volumes)) {
      expect(v).toBeGreaterThan(0)
      expect(v).toBeLessThanOrEqual(0.7)
    }
    expect(r.volumes).toEqual({ ...VOLUMES_PAR_DEFAUT })
    expect(r.muet).toBe(false)
    expect(r.voixEnLigne).toBe(false)
  })

  it('renvoie une copie : modifier un résultat ne change pas le suivant', () => {
    reglagesParDefaut().volumes.ambiance = 1
    expect(reglagesParDefaut().volumes.ambiance).toBe(VOLUMES_PAR_DEFAUT.ambiance)
  })
})

describe('lecture tolérante', () => {
  it('ignore chaque valeur invalide séparément', () => {
    const r = lireReglages({ volumes: { ambiance: 0.2, effets: 'fort', voix: Number.NaN, inconnu: 1 }, muet: 'oui', voixEnLigne: true })
    expect(r.volumes).toEqual({ ambiance: 0.2, effets: VOLUMES_PAR_DEFAUT.effets, voix: VOLUMES_PAR_DEFAUT.voix })
    expect(r.muet).toBe(false)
    expect(r.voixEnLigne).toBe(true)
  })

  it('borne les volumes entre 0 et 1', () => {
    const r = lireReglages({ volumes: { ambiance: 5, effets: -2 } })
    expect(r.volumes.ambiance).toBe(1)
    expect(r.volumes.effets).toBe(0)
    expect(volumeValide(Infinity)).toBeNull()
    expect(volumeValide('0.5')).toBeNull()
  })

  it.each([null, undefined, 3, 'texte', [], { volumes: 'x' }])('contenu inattendu (%j) : valeurs par défaut', (brut) => {
    expect(lireReglages(brut)).toEqual(reglagesParDefaut())
  })
})

describe('sauvegarde dans la clé dédiée', () => {
  it('la clé est « horizon.audio », distincte de celle des préférences et de la progression', () => {
    expect(CLE_AUDIO).toBe('horizon.audio')
    expect(CLE_AUDIO).not.toBe('horizon.progression')
    expect(CLE_AUDIO).not.toMatch(/pref/i)
  })

  it('enregistre puis relit les mêmes réglages', () => {
    const s = stockage()
    const r = { volumes: { ambiance: 0.1, effets: 0.2, voix: 0.3 }, muet: true, voixEnLigne: true }
    expect(sauvegarderReglages(s, r)).toBe(true)
    expect([...s.contenu.keys()]).toEqual([CLE_AUDIO])
    expect(chargerReglages(s)).toEqual(r)
  })

  it('une autre version, un JSON cassé ou pas de sauvegarde : valeurs par défaut', () => {
    expect(chargerReglages(stockage(JSON.stringify({ version: 99, muet: true })))).toEqual(reglagesParDefaut())
    expect(chargerReglages(stockage('{pas du json'))).toEqual(reglagesParDefaut())
    expect(chargerReglages(stockage())).toEqual(reglagesParDefaut())
    expect(chargerReglages(null)).toEqual(reglagesParDefaut())
  })

  it('un stockage qui lève une erreur ne casse rien (navigation privée)', () => {
    const casse: Stockage = {
      getItem: () => {
        throw new Error('refusé')
      },
      setItem: () => {
        throw new Error('plein')
      },
    }
    expect(chargerReglages(casse)).toEqual(reglagesParDefaut())
    expect(sauvegarderReglages(casse, reglagesParDefaut())).toBe(false)
    expect(sauvegarderReglages(null, reglagesParDefaut())).toBe(false)
  })

  it('serialiserReglages porte la version', () => {
    expect(JSON.parse(serialiserReglages(reglagesParDefaut())).version).toBe(1)
  })
})

describe('canal actif', () => {
  it('un canal muet ou à volume nul ne sonne pas', () => {
    const r = reglagesParDefaut()
    expect(canalActif(r, 'effets')).toBe(true)
    expect(canalActif({ ...r, muet: true }, 'effets')).toBe(false)
    expect(canalActif({ ...r, volumes: { ...r.volumes, effets: 0 } }, 'effets')).toBe(false)
    expect(canalActif({ ...r, volumes: { ...r.volumes, effets: 0 } }, 'ambiance')).toBe(true)
  })
})
