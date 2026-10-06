# Sources, inspirations et licences : interface plein écran (étape 5a)

Les fichiers (images, sons, modèles, polices) sont listés dans `assets.json`.
Ce document couvre le **code** de l'interface plein écran et les références
consultées.

## Code réutilisé

**Aucun code tiers n'est copié.** Tout le code de l'interface (bruit, courbes,
radar, moteur de graphes, verre, grain) est écrit dans ce dépôt.

## Références consultées (inspiration seulement, rien copié)

| Référence                                                      | Licence      | Usage                                                                                                              |
| -------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------ |
| [augmented-ui](https://github.com/propors/augmented-ui) v2.0.0 | BSD-2-Clause | Idée de cadres aux coins biseautés ; notre version utilise `clip-path` et des coins CSS (`HudCoins`).              |
| [Arwes](https://github.com/arwes/arwes)                        | MIT          | Idée de séquence d'allumage (cadres qui se tracent, valeurs qui comptent). Réécrite avec `transform` et `opacity`. |
| [simplex-noise](https://github.com/jwagner/simplex-noise.js)   | MIT          | Lu pour comprendre le bruit lissé ; nous utilisons un bruit de valeur maison (`src/lib/bruit.ts`, testé).          |

Licences vérifiées dans les dépôts et paquets publiés. Aucune dépendance n'a été
ajoutée.

## Ressources protégées

Aucun logo, glyphe, capture ni écran exact de film, série ou jeu n'est utilisé.
Seul le genre « interface tête haute de science-fiction » inspire le style.

## Polices (hébergées, hors ligne)

- Rajdhani (Indian Type Foundry) et Share Tech Mono (Carrois Type Design) :
  SIL Open Font License 1.1, détails dans `assets.json`.

## Données affichées

- Valeurs **réelles** : calculées par le jeu (distance, vitesse, cap, durée,
  temps-lumière, délai radio) à partir de `src/core/constants.ts`. Les diamètres
  de la Terre et de la Lune viennent des fiches de données de la NASA citées dans
  ce fichier de constantes.
- Valeurs **décoratives** (oscilloscope, spectre, journal, points du radar,
  jauges d'énergie) : bruit lissé procédural, marquées « simulation » à l'écran,
  jamais présentées comme un fait scientifique.
- Température, gravité, atmosphère et orbite : le jeu ne les connaît pas encore,
  l'écran affiche « scan en cours » puis « donnée indisponible ».
