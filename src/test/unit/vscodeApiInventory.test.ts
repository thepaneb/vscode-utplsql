import './setup.js';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { test } from 'node:test';

// Testa scripts/vscode-api-inventory.cjs (fonte do inventário de APIs do VS Code,
// usado pela CLI `npm run vscode:api` e pelo gerador `brain:vscode-api`).
const ROOT = path.resolve(__dirname, '../../..');
const { scanVscodeApi, summarize } = require('../../../scripts/vscode-api-inventory.cjs') as {
  scanVscodeApi: (root?: string) => Map<string, { file: string; line: number }[]>;
  summarize: (
    refs?: Map<string, { file: string; line: number }[]>,
  ) => { api: string; count: number; files: string[] }[];
};

/** Fixture com `src/**` (ignora `src/test/**` e não-.ts). */
function fixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-vscode-api-'));
  fs.mkdirSync(path.join(root, 'src', 'commands'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src', 'test'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'src', 'a.ts'),
    [
      "import * as vscode from 'vscode';",
      'const a = vscode.window.showInformationMessage;',
      "const u: vscode.Uri = vscode.Uri.file('x');",
      'vscode.window.showInformationMessage;',
      '',
    ].join('\n'),
  );
  fs.writeFileSync(
    path.join(root, 'src', 'commands', 'b.ts'),
    'export const b = vscode.commands.registerCommand;\n',
  );
  // Ignorados: diretório de teste e arquivo não-.ts.
  fs.writeFileSync(path.join(root, 'src', 'test', 'c.ts'), "vscode.env.openExternal('x');\n");
  fs.writeFileSync(path.join(root, 'src', 'd.js'), 'vscode.env;\n');
  return root;
}

test('vscode-api-inventory: scanVscodeApi lê src/** e ignora testes/não-ts', () => {
  const root = fixture();
  try {
    const refs = scanVscodeApi(root);
    assert.ok(refs.has('vscode.window.showInformationMessage'));
    assert.strictEqual(refs.get('vscode.window.showInformationMessage')?.length, 2);
    assert.ok(refs.has('vscode.commands.registerCommand'));
    assert.ok(refs.has('vscode.Uri.file'));
    // membro do namespace vs namespace puro
    assert.ok(refs.has('vscode.Uri'));
    const files = new Set([...refs.values()].flat().map((r) => r.file));
    assert.ok(![...files].some((f) => f.includes('src/test/')));
    assert.ok(![...files].some((f) => f.endsWith('.js')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('vscode-api-inventory: summarize ordena por uso e agrega arquivos', () => {
  const rows = summarize(
    new Map([
      ['vscode.b', [{ file: 'x.ts', line: 1 }]],
      [
        'vscode.a',
        [
          { file: 'x.ts', line: 2 },
          { file: 'y.ts', line: 3 },
        ],
      ],
    ]),
  );
  assert.deepStrictEqual(
    rows.map((r) => r.api),
    ['vscode.a', 'vscode.b'],
  );
  assert.strictEqual(rows[0].count, 2);
  assert.deepStrictEqual(rows[0].files, ['x.ts', 'y.ts']);
});

test('vscode-api-inventory: CLI --json devolve o inventário do repo', () => {
  const script = path.join(ROOT, 'scripts', 'vscode-api-inventory.cjs');
  const result = spawnSync(process.execPath, [script, '--json'], { encoding: 'utf8' });
  assert.strictEqual(result.status, 0, result.stderr);
  const rows = JSON.parse(result.stdout) as { api: string; count: number; files: string[] }[];
  assert.ok(rows.length > 0);
  assert.ok(rows.some((r) => r.api === 'vscode.TestItem'));
  assert.ok(rows.every((r) => r.count > 0 && r.files.length > 0));
});

test('vscode-api-inventory: CLI texto imprime símbolo e referência', () => {
  const script = path.join(ROOT, 'scripts', 'vscode-api-inventory.cjs');
  const result = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /APIs do VS Code/);
  assert.match(result.stdout, /vscode\.TestItem/);
  assert.match(result.stdout, /src\/.+\.ts:\d+/);
});
