# Audio procédural

Tous les sons sont synthétisés avec Web Audio : aucun fichier audio, aucune dépendance.
Code : `src/lib/audio/`. Page d'essai (dev seulement, absente de `dist/`) : `audio-demo.html`.

## Façade (`src/lib/audio/index.ts`)

| Fonction | Rôle |
| --- | --- |
| `initialiser()` | Crée l'unique `AudioContext` (au premier geste : clic sur « Décollage »), le reprend s'il est suspendu. |
| `jouer(id)` | Joue un son du catalogue (anti-répétition et plafond de 8 sons simultanés). |
| `parler(texte)` | Voix du copilote (speechSynthesis, voix françaises locales). |
| `arreter()` | Coupe sons et voix. |
| `definirVolume(canal, valeur)` | Canaux `ambiance`, `effets`, `voix`, valeur 0 à 1 (courbe quadratique). |
| `muet(booleen)` | Coupe tout, suspend le contexte. |
| `connecterMission(moteur)` | S'abonne à `ecouter()` du moteur de missions (lecture seule). |

Réglages enregistrés sous la clé `horizon.audio` (distincte de `horizon.preferences` et `horizon.progression`).
Volumes par défaut : ambiance 0,5, effets 0,6, voix 0,7.

## Catalogue

Ambiance (continus) : `ambiance-cabine`, `respiration`, `poussee`.
Effets : `poussee-impulsion`, `bip-ouverture`, `bip-fermeture`, `bip-validation`, `bip-erreur`,
`radio-debut`, `radio-fin`, `radio-coupure`, `alerte`, `fanfare-etoile`, `fanfare-fin`.
Crêtes et intervalles minimaux : `catalogue.ts` (source de vérité).

## Événements de mission → sons (`sonPourEvenement`, fonction pure)

| Événement | Son |
| --- | --- |
| mission-demarree | ambiance cabine |
| scene « sortie » | ambiance coupée, respiration seule ; autre scène : cabine |
| effet decollage / descente | poussée continue ; poussee : impulsion ; coupure-radio / radio-retablie |
| moteur | réglage de la poussée |
| dialogue (copilote, narrateur) | voix ; contrôle : bips radio autour de la voix |
| reponse, contact, interrupteur, observation | bip validation / erreur / fermeture |
| choix, indice, fenêtre ouverte | bip ouverture |
| rappel, assistance | alerte douce |
| etoile / mission-terminee | fanfares |

Chaque information sonore existe aussi à l'écran : aucun son n'est indispensable.

## Voix

- Seulement des voix locales (`localService`) françaises ; sinon silence.
- Option « voix en ligne » désactivée par défaut, avec avertissement : le texte part vers un service externe.
- `voiceschanged` écouté, `getVoices()` retenté ; `cancel()` avant chaque relance ; file de 3 au plus ;
  file vidée en muet ou onglet caché.

## Sécurité de l'oreille

Chaîne : son → gain de canal → maître (−3 dB) → compresseur-limiteur → passe-bas 3 kHz → plafond dur
(`tanh`) à −6 dBFS → sortie. Un test calcule le pire cas (volumes au maximum, tous les sons ensemble)
et vérifie le plafond. Notes tonales ≤ 1 200 Hz. Alerte et fanfares plus douces que la voix.

Mesure (Chromium headless, rendu hors ligne, niveaux numériques, volumes à 1) : tous sons ensemble,
crête −8,0 dBFS, RMS −21,3 dBFS. Ce ne sont pas des mesures acoustiques.

## Performances et batterie

Un seul `AudioContext` ; un seul tampon de bruit partagé ; sons continus construits une fois puis ajustés
(`setTargetAtTime`) ; sources arrêtées et déconnectées à la fin ou en cas de muet ; contexte suspendu
si tout est muet ou onglet caché.

## iPhone

`navigator.audioSession.type = "playback"` si disponible ; un contexte `interrupted` est repris.
Non testé sur appareil Apple : comportement du commutateur silencieux, interruptions et haut-parleur à vérifier.

## Ajouter un son

1. Ajouter l'entrée dans `CATALOGUE` (`catalogue.ts`) : canal, type, crête, intervalle minimal, description.
2. Ajouter sa synthèse dans `PONCTUELS` ou `CONTINUS` (`sons.ts`), sans fréquence tonale au-dessus de 1 200 Hz,
   somme des gains parallèles ≤ crête.
3. Si un événement le déclenche : ajouter le cas dans `sonPourEvenement` (`evenements.ts`) et son test.
4. Lancer les tests (`FauxContexte` vérifie plafond, polyphonie, nœuds nettoyés).

## Ce qui n'a pas pu être écouté ou mesuré

- Aucune écoute humaine du rendu réel.
- Niveaux numériques seulement ; niveau de la voix de synthèse non mesuré face à l'alerte et aux fanfares.
- Aucune voix française réelle ni appareil Apple testés.
- Les haut-parleurs de téléphone coupent les graves du grondement de la cabine.
