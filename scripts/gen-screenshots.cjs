/**
 * Gera screenshots da wiki automaticamente.
 *
 * Uso:
 *   npm run gen-screenshots
 *   node scripts/gen-screenshots.cjs
 *
 * Requer:
 *   - playwright (devDependency): npm install
 *   - npx playwright install chromium
 *   - Ambiente com display (X11/Wayland) ou xvfb-run no CI
 *
 * A extensão já tenta conectar ao Electron do VSCode via CDP.
 * Se falhar, lança uma instância local do VSCode.
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const FIXTURES_DIR = path.join(ROOT, 'src', 'test', 'fixtures', 'workspace-gen-screenshots');
const OUTPUT_DIR = path.join(ROOT, 'docs', 'wiki', 'images');
const SAMPLE_DIR = path.join(ROOT, 'src', 'test', 'fixtures', 'sample-output');

let playwright;
let vscodeProcess;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function log(msg) {
  console.log(`[gen-screenshots] ${msg}`);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function ensurePlaywright() {
  try {
    playwright = require('playwright');
  } catch {
    log('Instalando playwright...');
    execSync('npm install --save-dev playwright', { cwd: ROOT, stdio: 'inherit' });
    execSync('npx playwright install chromium', { cwd: ROOT, stdio: 'inherit' });
    playwright = require('playwright');
  }
}

// ---------------------------------------------------------------------------
// VSCode launch
// ---------------------------------------------------------------------------
async function launchVSCode() {
  log('Procurando VSCode...');

  // Try common paths
  const candidates = [
    'code',
    'code-insiders',
    '/usr/bin/code',
    '/usr/local/bin/code',
    '/mnt/c/Users/gilcl/AppData/Local/Programs/Microsoft VS Code/bin/code',
    '/mnt/c/Program Files/Microsoft VS Code/bin/code',
  ];

  let codePath = null;
  for (const c of candidates) {
    try {
      execSync(`"${c}" --version`, { stdio: 'pipe' });
      codePath = c;
      break;
    } catch { /* not found */ }
  }

  if (!codePath) {
    log('VSCode não encontrado nos paths padrão.');
    log('Especifique o caminho via CODE_PATH env var.');
    log('Ex: CODE_PATH="/mnt/c/.../code" npm run gen-screenshots');
    return false;
  }

  log(`VSCode: ${codePath}`);

  const args = [
    '--extensionDevelopmentPath=' + ROOT,
    path.resolve(FIXTURES_DIR),
    '--skip-release-notes',
    '--skip-welcome',
    '--disable-extensions',
    '--disable-gpu',
    '--new-window',
  ];

  vscodeProcess = spawn(codePath, args, {
    stdio: 'pipe',
    env: { ...process.env, DISPLAY: process.env.DISPLAY || ':0' },
  });

  vscodeProcess.on('error', (err) => {
    log(`ERRO ao lançar VSCode: ${err.message}`);
  });

  log('Aguardando VSCode iniciar (10s)...');
  await sleep(10000);
  return true;
}

// ---------------------------------------------------------------------------
// Screenshot capture
// ---------------------------------------------------------------------------
async function captureScreenshots(page) {
  log('Iniciando capturas...');
  await page.setViewportSize({ width: 1280, height: 800 });
  await sleep(3000);

  const captures = [];

  // 1. Extension Development Host
  captures.push({ name: 'dev-host-testing', action: async () => {
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'dev-host-testing.png') });
  }});

  // 2. Test Explorer
  captures.push({ name: 'test-explorer-pass-fail', action: async () => {
    await page.keyboard.press('Control+Shift+T');
    await sleep(2000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'test-explorer-pass-fail.png') });
  }});

  // 3. Command Palette — utPLSQL commands
  captures.push({ name: 'palette-commands', action: async () => {
    await page.keyboard.press('F1');
    await sleep(800);
    await page.keyboard.type('utplsql');
    await sleep(500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'palette-commands.png') });
    await page.keyboard.press('Escape');
    await sleep(500);
  }});

  // 4. Clear connection command
  captures.push({ name: 'palette-clear-connection', action: async () => {
    await page.keyboard.press('F1');
    await sleep(800);
    await page.keyboard.type('utplsql clear');
    await sleep(300);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'palette-clear-connection.png') });
    await page.keyboard.press('Escape');
    await sleep(300);
  }});

  // 5. Keyboard shortcuts
  captures.push({ name: 'keyboard-shortcuts', action: async () => {
    await page.keyboard.press('Control+K Control+S');
    await sleep(1500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'keyboard-shortcuts.png') });
    await page.keyboard.press('Escape');
    await sleep(500);
  }});

  // 6. Editor with coverage sample
  captures.push({ name: 'editor-coverage-gutters', action: async () => {
    await page.keyboard.press('Control+P');
    await sleep(500);
    await page.keyboard.type('tst_coverage_sample.pks');
    await sleep(500);
    await page.keyboard.press('Enter');
    await sleep(1500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'editor-coverage-gutters.png') });
  }});

  // 7. Coverage panel
  captures.push({ name: 'coverage-panel', action: async () => {
    await page.keyboard.press('Control+Shift+9');
    await sleep(1000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'coverage-panel.png') });
  }});

  // 8. Context menu (.pks file in Explorer)
  captures.push({ name: 'context-menu-pks', action: async () => {
    await page.keyboard.press('Control+Shift+E');
    await sleep(1000);
    await page.keyboard.press('Shift+F10');
    await sleep(500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'context-menu-pks.png') });
    await page.keyboard.press('Escape');
    await sleep(300);
  }});

  // 9. QuickPick reporters
  captures.push({ name: 'quickpick-reporters', action: async () => {
    await page.keyboard.press('F1');
    await sleep(500);
    await page.keyboard.type('utplsql select reporter');
    await sleep(300);
    await page.keyboard.press('Enter');
    await sleep(1000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'quickpick-reporters.png') });
    await page.keyboard.press('Escape');
    await sleep(300);
  }});

  // 10-14. Output panel captures
  const outputCaptures = [
    { file: 'documentation-reporter.txt', name: 'output-terminal.png' },
    { file: 'coverage-mapping.txt', name: 'output-coverage-mapping.png' },
    { file: 'cli-args.txt', name: 'output-cli-args.png' },
    { file: 'sqlcl-compile.txt', name: 'sqlcl-compile.png' },
    { file: 'sqlcl-version.txt', name: 'sqlcl-version.png' },
  ];

  for (const { name } of outputCaptures) {
    captures.push({ name, action: async () => {
      await page.keyboard.press('Control+Shift+U');
      await sleep(500);
      await page.screenshot({ path: path.join(OUTPUT_DIR, name) });
    }});
  }

  // 15. Context menu folder
  captures.push({ name: 'context-menu-folder', action: async () => {
    await page.keyboard.press('Control+Shift+E');
    await sleep(1000);
    // Select a folder and right-click
    await page.keyboard.press('Shift+F10');
    await sleep(500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'context-menu-folder.png') });
    await page.keyboard.press('Escape');
  }});

  // 16. Marketplace card / install from VSIX — manual screenshots for now
  // These require the extension to be installed from VSIX, not dev host

  let count = 0;
  for (const cap of captures) {
    try {
      await cap.action();
      count++;
      log(`  ${cap.name}.png OK`);
    } catch (err) {
      log(`  ${cap.name}.png ERRO: ${err.message}`);
    }
  }

  log(`${count}/${captures.length} screenshots capturados.`);
  return count;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  log('=== Gerador de Screenshots da Wiki ===');
  log('');

  // Ensure output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  await ensurePlaywright();

  const launched = await launchVSCode();
  if (!launched) {
    log('Não foi possível lançar o VSCode.');
    process.exit(1);
  }

  let count = 0;
  try {
    // Connect Playwright to VSCode Electron
    let browser = null;
    for (const port of [9222, 9223, 9224]) {
      try {
        browser = await playwright.chromium.connectOverCDP(`http://localhost:${port}`);
        log(`Conectado ao VSCode via CDP na porta ${port}.`);
        break;
      } catch { /* try next port */ }
    }

    if (browser) {
      const contexts = browser.contexts();
      const page = contexts[0]?.pages()[0];
      if (page) {
        count = await captureScreenshots(page);
      } else {
        log('ERRO: Página não encontrada no contexto do browser.');
      }
      await browser.close();
    } else {
      log('AVISO: Não foi possível conectar via CDP. O VSCode precisa ser lançado com --remote-debugging-port.');
      log('  Inicie o VSCode manualmente com: code --remote-debugging-port=9222');
      log('  Depois rode: npm run gen-screenshots');
      log('');
      log('  O VSCode permanece aberto para captura manual.');
      await sleep(5000);
    }
  } finally {
    if (vscodeProcess) {
      vscodeProcess.kill();
      await sleep(1000);
    }
  }

  // Summary
  if (fs.existsSync(OUTPUT_DIR)) {
    const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.png'));
    log(`\nArquivos em ${OUTPUT_DIR}:`);
    for (const f of files.sort()) {
      const stat = fs.statSync(path.join(OUTPUT_DIR, f));
      log(`  ${f} (${(stat.size / 1024).toFixed(1)} KB)`);
    }
    log(`\nTotal: ${files.length} screenshots gerados.`);
  }

  log(count >= 16 ? '\n✅ Todos os screenshots gerados.' : `\n⚠️  ${count}/16 screenshots. Faltam ${16 - count}.`);
}

main().catch(err => {
  console.error('[gen-screenshots] ERRO FATAL:', err.message);
  if (vscodeProcess) vscodeProcess.kill();
  process.exit(1);
});
