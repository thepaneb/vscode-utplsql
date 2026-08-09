#!/bin/bash
# Renderiza o diagrama de arquitetura de schemas (SVG → PNG).
# Requer: librsvg2-bin (rsvg-convert)
#
# Uso: bash scripts/gen-diagram.sh
#      npm run gen-diagram

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SVG="$PROJECT_DIR/docs/wiki/images/diagram-schemas.svg"
PNG="$PROJECT_DIR/docs/wiki/images/diagram-schemas.png"

if [ -f "$SVG" ]; then
  rsvg-convert -w 1200 "$SVG" -o "$PNG"
  echo "diagram-schemas.png OK ($(stat -c%s "$PNG" 2>/dev/null || echo 0) bytes)"
else
  echo "ERRO: $SVG não encontrado."
  exit 1
fi
