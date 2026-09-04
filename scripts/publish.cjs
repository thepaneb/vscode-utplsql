// Publica a extensão no VS Code Marketplace.
// Bloqueado localmente: a publicação é feita exclusivamente pelo workflow de
// release (publish.yml), que roda com CI=true (setado pelo GitHub Actions).
// Local: use `npm run package` para gerar o .vsix.
const { spawnSync } = require('child_process');

if (!process.env.CI) {
  console.warn(
    '⚠️ Publicacao apenas via GitHub workflow (release). Use npm run package para .vsix local.',
  );
  process.exit(1);
}

const result = spawnSync('vsce', ['publish'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(result.status ?? 0);
