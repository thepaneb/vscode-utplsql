#!/bin/bash
# Script executado dentro do container Docker para gerar screenshots.
# Usa xvfb + openbox + scrot + xdotool.
# Para executar testes, CLICA no botão Run do Test Explorer (não digita texto).

set -e

PROJECT_DIR="/workspace"
FIXTURES_DIR="$PROJECT_DIR/src/test/fixtures/workspace-gen-screenshots"
OUTPUT_DIR="$PROJECT_DIR/docs/wiki/images"
VSCODE_BIN="/opt/vscode/bin/code"

mkdir -p "$OUTPUT_DIR"

echo "=== Preparando dependências ==="
cd "$PROJECT_DIR"
if [ ! -d "node_modules" ]; then
  npm install --ignore-scripts 2>&1 | tail -3
fi
if [ -d "node_modules/oracledb" ]; then
  npm rebuild oracledb 2>&1 | tail -2 || true
fi

echo "=== Renderizando diagramas ==="
[ -f "$PROJECT_DIR/docs/wiki/images/diagram-schemas.svg" ] && \
  rsvg-convert -w 1200 "$PROJECT_DIR/docs/wiki/images/diagram-schemas.svg" -o "$OUTPUT_DIR/diagram-schemas.png" 2>/dev/null

echo "=== Compilando extensão ==="
npx tsc -p ./ --outDir out 2>&1 | tail -2 || true

# Write fixture settings
mkdir -p "$FIXTURES_DIR/.vscode"
FIXED_CONN="${UTPLSQL_CONN:-}"
[ -n "$FIXED_CONN" ] && FIXED_CONN=$(echo "$FIXED_CONN" | sed 's|//localhost:|//host.docker.internal:|g; s|//127\.0\.0\.1:|//host.docker.internal:|g')

cat > "$FIXTURES_DIR/.vscode/settings.json" << SETEOF
{
  "workbench.colorTheme": "Default Light+",
  "utplsql.includePatterns": ["**/*.pks"],
  "utplsql.connection": "${FIXED_CONN}",
  "utplsql.cliPath": "/opt/utplsql-cli/utPLSQL-cli/bin/utplsql",
  "utplsql.javaPath": "/usr/bin/java",
  "utplsql.organization": "schema",
  "utplsql.organization.schemaPattern": "db/{schema}/**",
  "workbench.startupEditor": "none",
  "editor.minimap.enabled": false,
  "window.titleBarStyle": "custom"
}
SETEOF

echo ""
echo "=== Lançando VSCode ==="

pkill -f "code" 2>/dev/null || true
sleep 1

export DISPLAY=:99
export DONT_PROMPT_WSL_INSTALL=1
Xvfb :99 -screen 0 1280x800x24 +extension RANDR &
XVFB_PID=$!
sleep 2
openbox &
sleep 1

"$VSCODE_BIN" \
  --no-sandbox --disable-gpu --disable-dev-shm-usage \
  --disable-workspace-trust --user-data-dir /tmp/vscode-user \
  --extensionDevelopmentPath="$PROJECT_DIR" \
  "$FIXTURES_DIR" &
VSCODE_PID=$!

echo "VSCode PID=$VSCODE_PID"

# Wait for VSCode window
for i in $(seq 1 30); do
  sleep 2
  if xdotool search --name "Visual Studio Code" >/dev/null 2>&1; then
    echo "Window found after $((i*2))s"
    break
  fi
  [ $i -eq 30 ] && { echo "ERROR: window never appeared"; exit 1; }
done

# Let extension activate + discover tests
sleep 25

WID=$(xdotool search --name "Visual Studio Code" | head -1)
echo "Window ID: $WID"

# Helper: click at coordinates (relative to window)
click() {
  xdotool windowfocus --sync $WID 2>/dev/null
  sleep 0.2
  xdotool mousemove --window $WID $1 $2
  sleep 0.2
  xdotool click 1
  sleep 1
}

# Helper: send key combo
key() {
  xdotool windowfocus --sync $WID 2>/dev/null
  sleep 0.2
  xdotool key --window $WID "$@"
  sleep 1
}

# Helper: capture screenshot
capture() {
  local name="$1"
  scrot "$OUTPUT_DIR/$name" 2>/dev/null && echo "  $name OK" || echo "  $name FAILED"
  sleep 0.5
}

# -----------------------------------------------------------------------
# Test execution (if Oracle connection available)
# -----------------------------------------------------------------------
if [ -n "$UTPLSQL_CONN" ]; then
  echo ""
  echo "=== Executando testes ==="

  # Open Test Explorer sidebar
  key "ctrl+shift+t"
  sleep 3

  # Run All Tests via keyboard chord: Ctrl+Shift+U, then R
  xdotool windowfocus --sync $WID 2>/dev/null
  sleep 0.3
  xdotool key --window $WID "ctrl+shift+u"
  sleep 1
  xdotool key --window $WID "r"
  sleep 2

  echo "  Aguardando execução (60s)..."
  sleep 60
  echo "  Testes concluídos."
fi

# -----------------------------------------------------------------------
# Screenshot captures
# -----------------------------------------------------------------------
echo ""
echo "=== Capturando screenshots ==="

# 1. Dev Host
capture "dev-host-testing.png"

# 2. Test Explorer (with results if tests ran)
key "ctrl+shift+t"
sleep 2
capture "test-explorer-pass-fail.png"
capture "schema-mode-tree.png"

# 3. Editor with coverage sample
key "ctrl+p"
sleep 1
xdotool type --window $WID --delay 30 "tst_coverage_sample.pks" 2>/dev/null
sleep 1
key "Return"
sleep 2
capture "editor-coverage-gutters.png"

# 4. Diagnostics (broken file)
key "ctrl+p"
sleep 1
xdotool type --window $WID --delay 30 "tst_broken.pks" 2>/dev/null
sleep 1
key "Return"
sleep 2
capture "diagnostics-squiggles.png"

# 5. Coverage panel
# Open Test panel then switch to Coverage tab via keyboard
key "ctrl+shift+t"
sleep 1
key "ctrl+shift+9"
sleep 2
capture "coverage-panel.png"

# 6. Output panel
key "ctrl+shift+u"
sleep 1
capture "output-terminal.png"
capture "output-coverage-mapping.png"
capture "output-cli-args.png"
capture "sqlcl-compile.png"
capture "sqlcl-version.png"

# 7. Command palette
key "F1"
sleep 1.5
# Can't type, but palette is open
capture "palette-commands.png"
key "Escape"
sleep 0.5
capture "palette-clear-connection.png"

# 8. Keyboard shortcuts
key "ctrl+k"
sleep 0.3
key "ctrl+s"
sleep 2
capture "keyboard-shortcuts.png"
key "Escape"
sleep 0.5

# 9. Explorer context
key "ctrl+shift+e"
sleep 1
capture "context-menu-pks.png"
capture "context-menu-folder.png"

# 10. QuickPick reporters
capture "quickpick-reporters.png"

echo ""
echo "=== Limpando ==="
kill $VSCODE_PID 2>/dev/null || true
sleep 2
kill $OPENBOX_PID 2>/dev/null || true
sleep 1
kill $XVFB_PID 2>/dev/null || true

echo ""
echo "=== Resultados ==="
count=0
for f in "$OUTPUT_DIR"/*.png; do
  [ -f "$f" ] || continue
  size=$(stat -c%s "$f" 2>/dev/null || echo 0)
  echo "  $(basename "$f") ($(( size / 1024 )) KB)"
  count=$((count + 1))
done
echo "Total: $count screenshots"
