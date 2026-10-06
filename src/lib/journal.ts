/**
 * Fil de journal de données : lignes techniques générées, purement décoratives
 * (aria-hidden, marquées « simulation »). Déterministe pour un index donné.
 */
import { hash } from './bruit'

const MOTS = [
  'SYNC',
  'LIAISON',
  'CALIBRAGE',
  'NOYAU',
  'THERMIQUE',
  'ANTENNE',
  'GYRO',
  'VERIF',
  'BUFFER',
  'RELAIS',
] as const

const ETATS = ['OK', 'NOMINAL', 'STABLE', 'EN COURS'] as const

function hexa(n: number): string {
  return Math.floor(n * 0xffff)
    .toString(16)
    .toUpperCase()
    .padStart(4, '0')
}

/** Une ligne de journal, par exemple « 3F2A · GYRO · STABLE · 87 % ». */
export function ligneJournal(index: number, graine = 0): string {
  const mot = MOTS[Math.floor(hash(index, graine) * MOTS.length)]
  const etat = ETATS[Math.floor(hash(index, graine + 1) * ETATS.length)]
  const pourcent = 60 + Math.floor(hash(index, graine + 2) * 40)
  return `${hexa(hash(index, graine + 3))} · ${mot} · ${etat} · ${pourcent} %`
}

/** Les `n` dernières lignes à partir de l'index courant (la plus récente en dernier). */
export function lignesJournal(
  courant: number,
  n: number,
  graine = 0
): string[] {
  const nombre = Math.max(0, Math.floor(n))
  return Array.from({ length: nombre }, (_, i) =>
    ligneJournal(courant - (nombre - 1 - i), graine)
  )
}
