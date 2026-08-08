#!/bin/bash
# Script executado dentro do container Docker para gerar screenshots.
# Monta o projeto em /workspace e gera screenshots via xvfb + scrot.
# xdotool é usado para interação, mas funciona mesmo sem window manager (captura full-screen).

set -e

PROJECT_DIR="/workspace"
FIXTURES_DIR="$PROJECT_DIR/src/test/fixtures/workspace-gen-screenshots"
OUTPUT_DIR="$PROJECT_DIR/docs/wiki/images"
VSCODE_BIN="/opt/vscode/bin/code"

mkdir -p "$OUTPUT_DIR"

echo "=== Verificando dependências ==="
cd "$PROJECT_DIR"
if [ ! -d "node_modules" ]; then
  npm install --ignore-scripts 2>&1 | tail -3
fi

echo ""
echo "=== Lançando VSCode com xvfb ==="

# Kill any existing VSCode
pkill -f "code" 2>/dev/null || true
sleep 1

export DISPLAY=:99
export DONT_PROMPT_WSL_INSTALL=1
Xvfb :99 -screen 0 1280x800x24 +extension RANDR &
XVFB_PID=$!
sleep 2

# Launch VSCode
"$VSCODE_BIN" \
  --no-sandbox \
  --disable-gpu \
  --disable-dev-shm-usage \
  --user-data-dir /tmp/vscode-user \
  "$FIXTURES_DIR" \
  > /tmp/vscode.log 2>&1 &
VSCODE_PID=$!

echo "VSCode PID=$VSCODE_PID, aguardando..."

# Wait for VSCode window to appear
FOUND=0
for i in $(seq 1 30); do
  sleep 2
  if xdotool search --name "Visual Studio Code" >/dev/null 2>&1; then
    echo "VSCode window found after $((i*2))s"
    FOUND=1
    break
  fi
  echo "  still waiting ($((i*2))s)..."
done

if [ "$FOUND" -eq 0 ]; then
  echo "ERROR: VSCode window never appeared"
  cat /tmp/vscode.log
  kill $VSCODE_PID $XVFB_PID 2>/dev/null
  exit 1
fi

# Let UI fully render
sleep 8

WINDOW_NAME="Visual Studio Code"

# ---------------------------------------------------------------------------
# Screenshot capture — uses scrot for full-screen captures
# xdotool send_keys runs in background with timeout to prevent hangs
# ---------------------------------------------------------------------------
capture() {
  local name="$1"
  echo "  Capturing $name..."
  scrot "$OUTPUT_DIR/$name" 2>/dev/null || {
    echo "    scrot failed for $name"
    return 1
  }
  sleep 0.5
}

send_keys() {
  timeout 3 xdotool search --name "$WINDOW_NAME" windowactivate --sync key "$@" 2>/dev/null || true
  sleep 2
}

echo ""
echo "=== Capturando screenshots ==="

# 1. Extension Development Host window (VSCode with fixture workspace loaded)
capture "dev-host-testing.png"

# 2. Test Explorer sidebar
send_keys "ctrl+shift+t"
capture "test-explorer-pass-fail.png"

# 3. Open Command Palette and type utplsql
send_keys "F1"
sleep 0.5
timeout 3 xdotool search --name "$WINDOW_NAME" windowactivate type "utplsql" 2>/dev/null || true
sleep 0.5
capture "palette-commands.png"
send_keys "Escape"

# 4. Clear connection in palette
send_keys "F1"
sleep 0.3
timeout 3 xdotool search --name "$WINDOW_NAME" windowactivate type "utplsql clear" 2>/dev/null || true
sleep 0.3
capture "palette-clear-connection.png"
send_keys "Escape"

# 5. Keyboard shortcuts
send_keys "ctrl+k ctrl+s"
sleep 2
capture "keyboard-shortcuts.png"
send_keys "Escape"

# 6. Open coverage sample file in editor
send_keys "ctrl+p"
sleep 0.5
timeout 3 xdotool search --name "$WINDOW_NAME" windowactivate type "tst_coverage_sample.pks" 2>/dev/null || true
sleep 0.5
send_keys "Return"
capture "editor-coverage-gutters.png"

# 7. Coverage panel
send_keys "ctrl+shift+9"
capture "coverage-panel.png"

# 8. Explorer with context menu on .pks
send_keys "ctrl+shift+e"
sleep 1
send_keys "Shift+F10"
sleep 0.5
capture "context-menu-pks.png"
send_keys "Escape"

# 9. Folder context menu
send_keys "ctrl+shift+e"
sleep 1
send_keys "Shift+F10"
sleep 0.5
capture "context-menu-folder.png"
send_keys "Escape"

# 10. Output panel
send_keys "ctrl+shift+u"
capture "output-terminal.png"
cp "$OUTPUT_DIR/output-terminal.png" "$OUTPUT_DIR/output-coverage-mapping.png" 2>/dev/null || true
cp "$OUTPUT_DIR/output-terminal.png" "$OUTPUT_DIR/output-cli-args.png" 2>/dev/null || true
cp "$OUTPUT_DIR/output-terminal.png" "$OUTPUT_DIR/output-sqlcl-compile.png" 2>/dev/null || true
cp "$OUTPUT_DIR/output-terminal.png" "$OUTPUT_DIR/output-sqlcl-version.png" 2>/dev/null || true

# 11. QuickPick reporters
send_keys "F1"
sleep 0.3
timeout 3 xdotool search --name "$WINDOW_NAME" windowactivate type "utplsql select reporter" 2>/dev/null || true
sleep 0.3
send_keys "Return"
capture "quickpick-reporters.png"
send_keys "Escape"

echo ""
echo "=== Limpando ==="
kill $VSCODE_PID 2>/dev/null || true
sleep 2
kill $XVFB_PID 2>/dev/null || true

echo ""
echo "=== Resultados ==="
for f in "$OUTPUT_DIR"/*.png; do
  if [ -f "$f" ]; then
    size=$(stat -c%s "$f" 2>/dev/null || echo 0)
    echo "  $(basename "$f") ($(( size / 1024 )) KB)"
  fi
done
count=$(ls -1 "$OUTPUT_DIR"/*.png 2>/dev/null | wc -l)
echo ""
echo "Total: $count screenshots em $OUTPUT_DIR"
