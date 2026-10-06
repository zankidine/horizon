# Mission 1 à l'écran

Le panneau de mission affiche l'étape courante du moteur de missions (`MissionVue`) sans modifier le moteur.

## Lancer le jeu

```
npm install
npm run dev          # http://localhost:5173
npm run dev -- --host   # pour l'ouvrir depuis un téléphone du même réseau
npm run build && npm run preview   # version de production (sans panneaux de développement)
```

Au premier lancement : choisir un niveau, nommer le copilote, toucher « Décollage » (c'est ce geste qui active l'audio).

## Organisation

| Fichier | Rôle |
| --- | --- |
| `src/lib/mission-session.ts` | Session : crée le moteur, lui donne le temps, range ses événements (réplique, retours, jalons, journal), sauvegarde, reprise. Sans Svelte, testée. |
| `src/lib/lecture-nombre.ts` | Lecture d'un nombre tapé à la française (« 384 400 km », « 384,4 »). |
| `src/lib/mission-reponses.ts` | Trois réponses à choisir aux niveaux 1 et 2. |
| `src/lib/mission-jauges.ts`, `mission-panneaux.ts` | Jauges et panneaux utiles par étape. |
| `src/lib/textes-mission.ts`, `src/data/mission-ui.json` | Libellés de l'interface, en version enfant et adulte, validés. |
| `src/ui/mission/mission.svelte.ts` | État d'affichage (textes prêts, actions, temps de jeu, pause onglet caché). |
| `src/ui/mission/*.svelte` | Composants minces : un par type d'étape. |

## Règles d'affichage

- Un dialogue n'avance jamais seul : « Suivant ».
- Un indice, une solution ou un coup de pouce reste affiché jusqu'à « J'ai compris ». Un indice disparaît quand son étape est réussie ; une solution reste, car l'étape s'est terminée toute seule.
- « Lire », « Indice » et « Suivant » ont toujours la même place.
- La poussée et le moteur réagissent à l'appui (`pointerdown`), les doubles appuis sont ignorés.
- Onglet caché ou téléphone verrouillé : le jeu est en pause, il reprend sans saut de temps.
- Progression : `horizon.progression` (moteur) et `horizon.journal` (textes du journal déjà résolus).
- Aux niveaux 1 et 2, un calcul se répond en choisissant parmi trois valeurs ; aux niveaux 3 et 4, par saisie.

## Test de bout en bout

Playwright n'est pas une dépendance du projet : on l'installe hors du dépôt.

```
npm run dev -- --port 5199 --strictPort &
PLAYWRIGHT_MODULE=/chemin/vers/node_modules/playwright/index.mjs \
CHROMIUM=/chemin/vers/chromium \
node tests-e2e/mission.e2e.mjs
```

Il joue la mission aux niveaux 1 et 4, avec et sans erreurs, en 390×844 et 1440×900, et contrôle : texte ≥ 18 px, boutons ≥ 56 px, 12 px entre éléments cliquables, pas de défilement horizontal, commandes visibles sans défilement, pied du panneau à la même place, pause, reprise, « Recommencer », « Changer de niveau ». Les captures vont dans `tests-e2e/captures/` (ignoré par Git) avec un `rapport.md`.
