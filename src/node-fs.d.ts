// Lecture de fichiers dans les tests (Vitest tourne sous Node) : seul usage de node:fs.
declare module 'node:fs' {
  export function readFileSync(chemin: URL | string, encodage: 'utf8'): string
}
