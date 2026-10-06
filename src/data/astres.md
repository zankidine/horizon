# Données des astres : valeurs et sources

Relecture de `astres.json`. Chaque valeur est lue sur la fiche NASA elle-même (NASA NSSDCA, Planetary Fact Sheet), consultée le 2026-10-06, et gardée dans l'**unité d'origine** de la source ; les conversions (K → °C, bar et mb → kPa, 10^6 km → km…) sont faites dans le code (`src/core/astres-donnees.ts`).

- Une donnée **indisponible** n'existe pas sur la fiche : elle est marquée telle quelle avec la raison, jamais remplacée par zéro.
- « environ » et « estimation » reprennent les réserves de la fiche (« ~ », « estimates »).
- Colonne « page exacte » : ligne de la fiche où la valeur est lue (le lien est la page exacte). Colonne « mise à jour » : « Last Updated » de la page.

Pages : [Earth Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html) · [Moon Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) · [Mars Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html)

| Astre | Grandeur | Valeur | Unité d'origine | Sens, précision, contexte | Page exacte (ligne lue) | Mise à jour de la page |
|---|---|---|---|---|---|---|
| Terre | Rayon équatorial | 6378.137 | km | equatorial | [Equatorial radius (km)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html) | 15 November 2024 |
| Terre | Rayon moyen volumétrique | 6371.0 | km | moyen_volumetrique | [Volumetric mean radius (km)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html) | 15 November 2024 |
| Terre | Masse | 5.9722 | 10^24 kg |  | [Mass (10^24 kg)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html) | 15 November 2024 |
| Terre | Gravité de surface | 9.82 | m/s² | moyenne | [Surface gravity (mean) (m/s^2)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html) | 15 November 2024 |
| Terre | Durée du jour | 24.0 | h | jour solaire moyen | [Length of day (hrs)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html) | 15 November 2024 |
| Terre | Rotation sidérale | 23.9345 | h |  | [Sidereal rotation period (hrs)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html) | 15 November 2024 |
| Terre | Période orbitale | 365.256 | jours | autour du Soleil | [Sidereal orbit period (days)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html) | 15 November 2024 |
| Terre | Distance au Soleil | 149.598 | 10^6 km | demi-grand axe | [Semimajor axis (10^6 km)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html) | 15 November 2024 |
| Terre | Nombre de lunes | 1 | nombre |  | [Number of natural satellites](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html) | 15 November 2024 |
| Terre | Température (moyenne) | 288 | K | moyenne ; libellé de la fiche : « Average temperature » ; la fiche ne précise pas « globale » | [Atmosphere: Average temperature: 288 K (15 C)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html) | 15 November 2024 |
| Terre | Température (plage diurne) | 283 à 293 | K | plage_diurne | [Atmosphere: Diurnal temperature range: 283 K to 293 K (10 to 20 C)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html) | 15 November 2024 |
| Terre | Pression (surface) | 1014 | mb | surface | [Atmosphere: Surface pressure: 1014 mb](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html) | 15 November 2024 |
| Lune | Rayon équatorial | 1738.1 | km | equatorial | [Equatorial radius (km)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) | 11 January 2024 |
| Lune | Rayon moyen volumétrique | 1737.4 | km | moyen_volumetrique | [Volumetric mean radius (km)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) | 11 January 2024 |
| Lune | Masse | 0.07346 | 10^24 kg |  | [Mass (10^24 kg)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) | 11 January 2024 |
| Lune | Gravité de surface | 1.62 | m/s² | moyenne | [Surface gravity (m/s^2)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) | 11 January 2024 |
| Lune | Durée du jour | **données indisponibles** | — | La fiche de la Lune ne donne pas de « Length of day » ; elle donne la rotation sidérale (655,720 h) et la période synodique (29,53 jours). | [Orbital parameters (aucune ligne « Length of day »)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) | 11 January 2024 |
| Lune | Rotation sidérale | 655.72 | h |  | [Sidereal rotation period (hrs)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) | 11 January 2024 |
| Lune | Période orbitale | 27.3217 | jours | autour de la Terre | [Revolution period (days)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) | 11 January 2024 |
| Lune | Distance au Soleil | **données indisponibles** | — | La fiche de la Lune décrit son orbite autour de la Terre, pas sa distance au Soleil. | [Orbital parameters (orbite autour de la Terre)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) | 11 January 2024 |
| Lune | Nombre de lunes | **données indisponibles** | — | La fiche de la Lune ne contient pas de ligne « Number of natural satellites ». | [Moon Fact Sheet (champ absent)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) | 11 January 2024 |
| Lune | Température (moyenne) | **données indisponibles** | — | La fiche de la Lune ne donne pas de température moyenne, seulement la plage jour-nuit à l'équateur. | [Lunar Atmosphere (aucune ligne « Average temperature »)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) | 11 January 2024 |
| Lune | Température (plage diurne) | 95 à 390 | K | plage_diurne ; à l'équateur ; 95 K côté nuit, 390 K côté jour | [Lunar Atmosphere: Diurnal temperature range (equator): 95 K to 390 K](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) | 11 January 2024 |
| Lune | Pression (nuit) | 3 × 10^-15 | bar | nuit ; atmosphère quasi inexistante (exosphère) ; valeur de la fiche, de jour la fiche ne donne rien ; environ | [Lunar Atmosphere: Surface pressure (night): 3 x 10^-15 bar (2 x 10^-12 torr)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) | 11 January 2024 |
| Mars | Rayon équatorial | 3396.2 | km | equatorial | [Equatorial radius (km)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) | 19 May 2025 |
| Mars | Rayon moyen volumétrique | 3389.5 | km | moyen_volumetrique | [Volumetric mean radius (km)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) | 19 May 2025 |
| Mars | Masse | 0.64169 | 10^24 kg |  | [Mass (10^24 kg)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) | 19 May 2025 |
| Mars | Gravité de surface | 3.73 | m/s² | moyenne | [Surface gravity (mean) (m/s^2)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) | 19 May 2025 |
| Mars | Durée du jour | 24.6597 | h | jour solaire moyen | [Length of day (hrs)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) | 19 May 2025 |
| Mars | Rotation sidérale | 24.6229 | h |  | [Sidereal rotation period (hrs)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) | 19 May 2025 |
| Mars | Période orbitale | 686.98 | jours | autour du Soleil | [Sidereal orbit period (days)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) | 19 May 2025 |
| Mars | Distance au Soleil | 227.956 | 10^6 km | demi-grand axe | [Semimajor axis (10^6 km)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) | 19 May 2025 |
| Mars | Nombre de lunes | 2 | nombre |  | [Number of natural satellites](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) | 19 May 2025 |
| Mars | Température (moyenne) | 214 | K | moyenne ; libellé de la fiche : « Average temperature », avec « ~ » ; la fiche ne précise pas « globale » ; environ | [Martian Atmosphere: Average temperature: ~214 K (-59 C)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) | 19 May 2025 |
| Mars | Température (plage diurne) | 184 à 242 | K | plage_diurne ; mesure du site de l'atterrisseur Viking 1, pas une plage globale | [Martian Atmosphere: Diurnal temperature range: 184 K to 242 K (-89 to -31 C) (Viking 1 Lander site)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) | 19 May 2025 |
| Mars | Pression (surface) | 6.36 | mb | surface ; au rayon moyen | [Martian Atmosphere: Surface pressure: 6.36 mb at mean radius](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) | 19 May 2025 |
| Mars | Pression (variation saisonniere) | 4.0 à 8.7 | mb | variation_saisonniere | [Martian Atmosphere: (variable from 4.0 to 8.7 mb depending on season)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) | 19 May 2025 |

## Composition de l'atmosphère

| Astre | Constituant | Valeur | Unité d'origine | Sens | Page exacte (ligne lue) |
|---|---|---|---|---|---|
| Terre | azote (N2) | 78.08 | % | air sec, en volume | [Atmospheric composition (by volume, dry air): Major](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html) |
| Terre | dioxygène (O2) | 20.95 | % | air sec, en volume | [Atmospheric composition (by volume, dry air): Major](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html) |
| Lune | hélium 4 (4He) | 40000 | particules/cm³ | estimation de la nuit, en particules par cm³ (limites supérieures) ; estimation | [Estimated Composition (night, particles per cubic cm)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) |
| Lune | néon 20 (20Ne) | 40000 | particules/cm³ | estimation de la nuit, en particules par cm³ (limites supérieures) ; estimation | [Estimated Composition (night, particles per cubic cm)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) |
| Lune | dihydrogène (H2) | 35000 | particules/cm³ | estimation de la nuit, en particules par cm³ (limites supérieures) ; estimation | [Estimated Composition (night, particles per cubic cm)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) |
| Lune | argon 40 (40Ar) | 30000 | particules/cm³ | estimation de la nuit, en particules par cm³ (limites supérieures) ; estimation | [Estimated Composition (night, particles per cubic cm)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) |
| Lune | néon 22 (22Ne) | 5000 | particules/cm³ | estimation de la nuit, en particules par cm³ (limites supérieures) ; estimation | [Estimated Composition (night, particles per cubic cm)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) |
| Lune | argon 36 (36Ar) | 2000 | particules/cm³ | estimation de la nuit, en particules par cm³ (limites supérieures) ; estimation | [Estimated Composition (night, particles per cubic cm)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) |
| Mars | dioxyde de carbone (CO2) | 95.1 | % | en volume | [Atmospheric composition (by volume): Major](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) |
| Mars | azote (N2) | 2.59 | % | en volume | [Atmospheric composition (by volume): Major](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) |
| Mars | argon (Ar) | 1.94 | % | en volume | [Atmospheric composition (by volume): Major](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) |
| Mars | dioxygène (O2) | 0.16 | % | en volume | [Atmospheric composition (by volume): Major](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) |
| Mars | monoxyde de carbone (CO) | 0.06 | % | en volume | [Atmospheric composition (by volume): Major](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) |

## À savoir

- Les rayons sont ceux de la fiche ; le diamètre se calcule dans le code. Le test de concordance avec `constants.ts` compare le diamètre **moyen** (2 × rayon moyen volumétrique), jamais l'équatorial : Terre 12 742 km (exact), Lune 3 474,8 km (NASA) contre 3 474 km (`constants.ts`), écart toléré sous 1 km et signalé dans la sortie du test.
- Les températures « Average temperature » de la Terre et de Mars sont notées « moyenne » : la fiche ne précise pas « globale ». La plage de Mars est celle du site de Viking 1, pas une plage globale.
- La Lune : atmosphère quasi inexistante, pression de nuit 3 × 10^-15 bar reprise telle quelle ; la fiche ne donne ni température moyenne, ni durée du jour, ni distance au Soleil, ni nombre de lunes.
- La fiche de la Lune indique la masse de la Terre à 5,9724 × 10^24 kg, celle de la Terre 5,9722 : on garde la valeur de la fiche de chaque astre.
