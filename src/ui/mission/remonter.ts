/**
 * Action Svelte : remet le défilement du nœud en haut chaque fois que sa valeur
 * change (par exemple à chaque nouvelle étape), pour que l'objectif soit lu en premier.
 */
export function remonter(noeud: HTMLElement, _cle: unknown): { update(cle: unknown): void } {
  let derniere = _cle
  return {
    update(cle) {
      if (cle === derniere) return
      derniere = cle
      noeud.scrollTop = 0
    },
  }
}
