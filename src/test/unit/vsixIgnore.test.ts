import './setup.js';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

// Higiene do pacote VSIX (PRD-83 / ADR-004): arquivos de desenvolvimento e de
// agente NÃO podem ir para o Marketplace. Este teste trava o `.vscodeignore`
// contra regressões — foi assim que o `opencode.json` vazou uma vez.

const ROOT = path.resolve(__dirname, '../../..');

function ignoreLines(): string[] {
  return fs
    .readFileSync(path.join(ROOT, '.vscodeignore'), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));
}

/** Um caminho relativo ao repo está coberto por alguma regra do .vscodeignore? */
function isIgnored(rel: string, lines: string[]): boolean {
  const posix = rel.split(path.sep).join('/');
  return lines.some((rule) => {
    const r = rule.replace(/^\//, '');
    if (r.endsWith('/**'))
      return posix === r.slice(0, -3) || posix.startsWith(`${r.slice(0, -3)}/`);
    if (r.includes('**')) {
      const re = new RegExp(
        `^${r
          .replace(/[.+^${}()|[\]\\]/g, '\\$&')
          .replace(/\*\*/g, '.*')
          .replace(/\*/g, '[^/]*')}$`,
      );
      return re.test(posix);
    }
    if (r.startsWith('*.')) return posix.endsWith(r.slice(1));
    if (r.endsWith('.*')) return posix.startsWith(`${r.slice(0, -1)}`);
    return posix === r || posix.startsWith(`${r}/`);
  });
}

test('vscodeignore: não vaza arquivos de agente/desenvolvimento no VSIX', () => {
  const lines = ignoreLines();
  const proibidos = [
    'opencode.json',
    'AGENTS.md',
    'CLAUDE.md',
    'DEVELOPMENT.md',
    '.env',
    '.env.local',
    'biome.json',
    'tsconfig.json',
    'esbuild.config.mjs',
    'src',
    'out',
    'scripts',
    'docs',
    'coverage',
  ];
  for (const p of proibidos) {
    assert.ok(isIgnored(p, lines), `${p} deveria estar coberto pelo .vscodeignore`);
  }
});

test('vscodeignore: arquivos essenciais NÃO são excluídos', () => {
  const lines = ignoreLines();
  const essenciais = [
    'dist/extension.js',
    'package.json',
    'README.md',
    'package.nls.json',
    'images/icon.png',
  ];
  for (const p of essenciais) {
    assert.ok(!isIgnored(p, lines), `${p} não deveria ser excluído`);
  }
});

test('vscodeignore: pasta .opencode e variantes de ambiente cobertas', () => {
  const lines = ignoreLines();
  assert.ok(isIgnored('.opencode/skills/release/SKILL.md', lines));
  assert.ok(isIgnored('.env.production', lines));
});
