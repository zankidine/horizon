#!/bin/sh
# Génère les textures du hublot (1k, 2k, 4k) à partir des cartes sources.
# Dépend seulement d'ImageMagick (outil de développement, pas du client).
#
# Usage : scripts/generer-textures.sh <terre-equirectangulaire> <lune-equirectangulaire>
# Les sources et leurs licences sont décrites dans assets.json.
set -eu

if [ "$#" -ne 2 ]; then
  echo "Usage : $0 <carte-terre> <carte-lune>" >&2
  exit 1
fi

sortie="$(dirname "$0")/../public/textures"
mkdir -p "$sortie"

# nom de variante : largeur en pixels (hauteur = largeur / 2)
generer() {
  source="$1"
  nom="$2"
  for variante in "1k:1024" "2k:2048" "4k:4096"; do
    suffixe="${variante%%:*}"
    largeur="${variante##*:}"
    convert "$source" -colorspace sRGB -depth 8 \
      -filter Lanczos -resize "${largeur}x" \
      -strip -interlace Plane -sampling-factor 4:2:0 -quality 85 \
      "$sortie/$nom-$suffixe.jpg"
  done
}

generer "$1" earth-day
generer "$2" moon

ls -l "$sortie"/*.jpg | awk '{ printf "%8.1f Ko  %s\n", $5 / 1024, $9 }'
