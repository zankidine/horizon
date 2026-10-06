import { afterEach, describe, expect, it, vi } from 'vitest'
import { vibrer } from './retour'

afterEach(() => vi.unstubAllGlobals())

describe('vibrer', () => {
  it("vibre brièvement quand l'appareil sait le faire", () => {
    const vibrate = vi.fn()
    vi.stubGlobal('navigator', { vibrate })
    vibrer()
    expect(vibrate).toHaveBeenCalledWith(12)
    vibrer(30)
    expect(vibrate).toHaveBeenLastCalledWith(30)
  })

  it('ne fait rien et ne plante pas sans navigator.vibrate (Safari, iOS)', () => {
    vi.stubGlobal('navigator', {})
    expect(() => vibrer()).not.toThrow()
  })

  it('ne plante pas sans navigator', () => {
    vi.stubGlobal('navigator', undefined)
    expect(() => vibrer()).not.toThrow()
  })
})
