/** Retour tactile léger, seulement si l'appareil sait vibrer. */
export function vibrer(dureeMs = 12): void {
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function'
  ) {
    navigator.vibrate(dureeMs)
  }
}
