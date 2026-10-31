import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  platform: 'node',
  format: 'cjs',
  target: 'node24',
  external: ['vscode', 'oracledb'],
  sourcemap: true,
});
