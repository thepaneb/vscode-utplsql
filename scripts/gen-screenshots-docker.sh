#!/bin/bash
# Wrapper para gerar screenshots via Docker.
# Constrói a imagem (se necessário) e executa o container.
#
# Uso: bash scripts/gen-screenshots-docker.sh

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DOCKERFILE="$PROJECT_DIR/scripts/Dockerfile.screenshots"
IMAGE_NAME="utplsql-screenshots:latest"

echo "=== Construindo imagem Docker ==="
docker build -t "$IMAGE_NAME" -f "$DOCKERFILE" "$PROJECT_DIR" 2>&1 | tail -5

echo ""
echo "=== Executando container ==="
docker run --rm \
  -v "$PROJECT_DIR:/workspace" \
  -v /tmp/.X11-unix:/tmp/.X11-unix:ro \
  --network none \
  "$IMAGE_NAME"

echo ""
echo "=== Screenshots gerados em docs/wiki/images/ ==="
ls -la "$PROJECT_DIR/docs/wiki/images/"*.png 2>/dev/null || echo "Verificar container logs."
