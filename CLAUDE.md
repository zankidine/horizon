# Horizon : jeu éducatif spatial (enfant de 7 ans + adulte), en français

## Stack

Svelte 5 (runes) + TypeScript strict + Vite, Three.js via Threlte,
vite-plugin-pwa (hors ligne), Howler.js (son), Vitest (tests).
Avant d'utiliser une bibliothèque, lis sa documentation actuelle : ne te fie pas à ta mémoire.

## Règles

- Logique dans des fichiers .svelte.ts, jamais dans les composants .svelte.
- src/core : simulation en TypeScript pur (aucun import du DOM, de Svelte ou de Three). Testée avec Vitest.
  src/core peut importer des fonctions pures de src/lib (par exemple format-fr), jamais du DOM, de Svelte ni de Three.
- Missions et textes en données JSON validées (src/data), pas en code.
  Chaque fait existe en version « enfant » et « adulte ».
- Aucune valeur calculable écrite en dur : distances, durées et comparaisons viennent du code.
- Mobile d'abord : responsive, fonctionne au tactile, léger.
- Chaque asset (image, son, modèle) est listé dans assets.json avec sa source et sa licence.
- Aucune clé d'API dans le client.
- Pas de nouvelle dépendance sans me demander.
- Petits commits. Termine toujours par : lint, tests, build.

## Git

- Une seule branche : main. Un seul terminal à la fois.
- Commits directs sur main, petits et clairs.
- Avant chaque envoi : git pull --rebase origin main.
- Jamais de push --force.
- À la fin de chaque étape validée, crée et pousse une balise etape-N-nom (points de restauration).
- Ne supprime ni ne crée de branche.
