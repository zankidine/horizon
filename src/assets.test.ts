import { describe, it, expect } from 'vitest'
import { assets } from '../assets.json'

// Tous les fichiers servis depuis public/ (clés seulement, rien n'est chargé).
const fichiersPublics = Object.keys(
  import.meta.glob('/public/**/*', { query: '?url' })
).map((chemin) => chemin.slice(1))

describe('assets.json', () => {
  it('donne une source et une licence pour chaque asset', () => {
    for (const asset of assets) {
      expect(asset.chemin).toMatch(/^public\//)
      expect(asset.source.length).toBeGreaterThan(0)
      expect(asset.url).toMatch(/^https:\/\//)
      expect(asset.licence.length).toBeGreaterThan(0)
      expect(asset.licence_url).toMatch(/^https:\/\//)
      expect(asset.mention_requise.length).toBeGreaterThan(0)
      expect(asset.credit.length).toBeGreaterThan(0)
    }
  })

  it('liste un fichier source et son empreinte', () => {
    for (const asset of assets) {
      expect(asset.fichier_source).toMatch(/^https:\/\//)
      expect(asset.sha256_source).toMatch(/^[0-9a-f]{64}$/)
    }
  })

  it('liste chaque fichier présent dans public/', () => {
    const listes = new Set(assets.map((a) => a.chemin))
    for (const fichier of fichiersPublics) {
      expect(listes, fichier).toContain(fichier)
    }
  })
})
