/**
 * Action Svelte : réagit à l'appui (pointerdown) au lieu du clic, pour supprimer
 * le délai tactile. Le clavier reste servi : Entrée et Espace produisent un clic
 * sans position (detail 0). Un clic de souris ou de doigt, qui suit le pointerdown,
 * est ignoré : l'appui n'est jamais compté deux fois.
 */
export function surAppui(noeud: HTMLElement, rappel: () => void): { update(r: () => void): void; destroy(): void } {
  let courant = rappel
  const appui = (evenement: PointerEvent): void => {
    if (!evenement.isPrimary || (evenement.pointerType === 'mouse' && evenement.button !== 0)) return
    courant()
  }
  const clic = (evenement: MouseEvent): void => {
    if (evenement.detail === 0) courant()
  }
  noeud.addEventListener('pointerdown', appui)
  noeud.addEventListener('click', clic)
  return {
    update(r) {
      courant = r
    },
    destroy() {
      noeud.removeEventListener('pointerdown', appui)
      noeud.removeEventListener('click', clic)
    },
  }
}
