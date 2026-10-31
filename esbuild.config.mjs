import { rmSync } from 'node:fs';
import * as esbuild from 'esbuild';

// O bundle publicado é ESM (PRD-95). Os testes continuam CJS em `out/`.
// Limpa o `dist/` para não empacotar um `extension.js` antigo.
rmSync('dist', { recursive: true, force: true });

await esbuild.build({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.mjs',
  platform: 'node',
  format: 'esm',
  target: 'node24',
  external: ['vscode', 'oracledb'],
  sourcemap: true,
});
