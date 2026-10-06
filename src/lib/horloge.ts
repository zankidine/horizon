/** Horloge de mission : « T+ 03:07:42 » (heures, minutes, secondes). */
export function formaterHorloge(secondes: number): string {
  const total =
    Number.isFinite(secondes) && secondes > 0 ? Math.floor(secondes) : 0
  const deux = (n: number): string => String(n).padStart(2, '0')
  const heures = Math.floor(total / 3600)
  return `T+ ${heures < 100 ? deux(heures) : heures}:${deux(Math.floor((total % 3600) / 60))}:${deux(total % 60)}`
}
