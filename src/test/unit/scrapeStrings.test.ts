import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { test } from 'node:test';

const SCRIPT = require.resolve('../../../scripts/scrape-strings.cjs');
const { scan, loadAllowlist, isAllowed } = require('../../../scripts/scrape-strings.cjs') as {
  scan: (root?: string) => { file: string; line: number; text: string }[];
  loadAllowlist: (root?: string) => { file: string; text?: string }[];
  isAllowed: (
    finding: { file: string; text: string },
    allowlist: { file: string; text?: string }[],
  ) => boolean;
};

function fixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-scrape-'));
  fs.mkdirSync(path.join(root, 'src', 'test'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src', 'sub'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'src', 'demo.ts'),
    [
      'declare const vscode: unknown;',
      'declare function t(locale: string, key: string): string;',
      "vscode.window.showInformationMessage('hardcoded');",
      'vscode.window.showWarningMessage(`template`);',
      "vscode.window.showErrorMessage(t('en', 'key'));",
      "vscode.window.showErrorMessage('a' + b);",
      'vscode.window.showErrorMessage("double");',
    ].join('\n'),
  );
  fs.writeFileSync(
    path.join(root, 'src', 'sub', 'nested.ts'),
    "vscode.window.showInformationMessage('nested');\n",
  );
  fs.writeFileSync(path.join(root, 'src', 'notes.md'), 'não é TypeScript\n');
  fs.writeFileSync(
    path.join(root, 'src', 'test', 'ignored.ts'),
    "vscode.window.showInformationMessage('ignored test literal');\n",
  );
  return root;
}

test('scrape-strings: reporta strings/templates sem interpolação', () => {
  const root = fixture();
  try {
    const findings = scan(root);
    assert.deepStrictEqual(
      findings.map(({ file, line, text }) => ({ file, line, text })),
      [
        { file: 'src/demo.ts', line: 3, text: 'hardcoded' },
        { file: 'src/demo.ts', line: 4, text: 'template' },
        { file: 'src/demo.ts', line: 7, text: 'double' },
        { file: 'src/sub/nested.ts', line: 1, text: 'nested' },
      ],
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('scrape-strings: allowlist por arquivo/texto', () => {
  const root = fixture();
  try {
    assert.deepStrictEqual(loadAllowlist(root), []);
    const finding = { file: 'src/demo.ts', text: 'hardcoded' };
    assert.strictEqual(isAllowed(finding, []), false);
    assert.strictEqual(isAllowed(finding, [null as never]), false);
    assert.strictEqual(isAllowed(finding, [{ file: 'src/demo.ts' }]), true);
    assert.strictEqual(isAllowed(finding, [{ file: 'src/demo.ts', text: 'hardcoded' }]), true);
    assert.strictEqual(isAllowed(finding, [{ file: 'src/demo.ts', text: 'outro' }]), false);

    fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'scripts', 'scrape-strings.allow.json'),
      JSON.stringify([{ file: 'src/demo.ts', text: 'hardcoded' }]),
    );
    assert.deepStrictEqual(loadAllowlist(root), [{ file: 'src/demo.ts', text: 'hardcoded' }]);

    fs.writeFileSync(path.join(root, 'scripts', 'scrape-strings.allow.json'), '{invalid');
    assert.deepStrictEqual(loadAllowlist(root), []);
    fs.writeFileSync(path.join(root, 'scripts', 'scrape-strings.allow.json'), '{}');
    assert.deepStrictEqual(loadAllowlist(root), []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('scrape-strings: CLI --root e --strict', () => {
  const root = fixture();
  try {
    const warn = spawnSync(process.execPath, [SCRIPT, '--root', root], { encoding: 'utf8' });
    assert.strictEqual(warn.status, 0, `${warn.stdout}\n${warn.stderr}`);
    assert.match(warn.stdout, /4 achado\(s\)/);

    const strict = spawnSync(process.execPath, [SCRIPT, '--root', root, '--strict'], {
      encoding: 'utf8',
    });
    assert.strictEqual(strict.status, 1);

    fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'scripts', 'scrape-strings.allow.json'),
      JSON.stringify([{ file: 'src/demo.ts' }, { file: 'src/sub/nested.ts' }]),
    );
    const clean = spawnSync(process.execPath, [SCRIPT, '--root', root], { encoding: 'utf8' });
    assert.strictEqual(clean.status, 0);
    assert.match(clean.stdout, /nenhuma string de UI hardcoded/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
