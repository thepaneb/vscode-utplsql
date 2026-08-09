// This file is loaded by @vscode/test-electron's runTests().
// Not currently used — the container script uses xdotool + mouse clicks instead.
// Kept as reference for future API-based screenshot automation.

async function run() {
  const vscode = require('vscode');
  const { execSync } = require('child_process');
  const path = require('path');

  const out = process.env.SCREENSHOT_DIR || '/tmp';

  // Capture screenshot via scrot
  function snap(name) {
    try { execSync(`scrot "${path.join(out, name)}"`, { timeout: 5000 }); } catch {}
  }

  // Wait for extension activation
  await new Promise(r => setTimeout(r, 5000));

  // Run all tests
  try { await vscode.commands.executeCommand('utplsql.runAll'); } catch {}
  await new Promise(r => setTimeout(r, 45000));

  // Capture results
  snap('dev-host-testing.png');
  await vscode.commands.executeCommand('workbench.view.testing.focus');
  await new Promise(r => setTimeout(r, 1000));
  snap('test-explorer-pass-fail.png');
  snap('coverage-panel.png');
  snap('output-terminal.png');
}

module.exports = { run };
