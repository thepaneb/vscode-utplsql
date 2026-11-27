import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { test } from 'node:test';

const ROOT = path.resolve(__dirname, '../../..');
const EXPORT = path.join(ROOT, 'scripts', 'i18n-export.cjs');
const APPLY = path.join(ROOT, 'scripts', 'i18n-apply.cjs');
const CHECK = path.join(ROOT, 'scripts', 'i18n-check.cjs');

const { exportCatalogs, loadCompiled, readEnGbOverrides } =
  require('../../../scripts/i18n-export.cjs') as {
    exportCatalogs: (o?: { root?: string; outDir?: string }) => string[];
    loadCompiled: (root?: string) => unknown;
    readEnGbOverrides: (root?: string) => Record<string, string>;
  };
const { applyLocale } = require('../../../scripts/i18n-apply.cjs') as {
  applyLocale: (o: {
    root: string;
    locale: string;
    base?: string;
    messages: Record<string, string | Record<string, string>>;
  }) => string;
};
const { check } = require('../../../scripts/i18n-check.cjs') as {
  check: (root?: string) => string[];
};

function tempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `utplsql-${prefix}-`));
}

function evaluateCatalog(text: string): Record<string, unknown> {
  const body = text.replace(/^[\s\S]*?export const \w+: Record<string, Message> = /, 'return ');
  return new Function(body)() as Record<string, unknown>;
}

test('i18n-export: exporta 26 locales; en-gb vira overlay', () => {
  const outDir = tempDir('i18n-export');
  try {
    const written = exportCatalogs({ root: ROOT, outDir });
    assert.strictEqual(written.length, 26);
    const compiled = require(path.join(ROOT, 'out', 'i18n', 'locales', 'index.js')) as {
      catalogs: Record<string, Record<string, string>>;
    };
    const pt = JSON.parse(fs.readFileSync(path.join(outDir, 'pt-br.json'), 'utf8'));
    assert.deepStrictEqual(pt.messages, compiled.catalogs['pt-br']);
    const gb = JSON.parse(fs.readFileSync(path.join(outDir, 'en-gb.json'), 'utf8'));
    assert.strictEqual(gb.base, 'en');
    assert.deepStrictEqual(gb.messages, readEnGbOverrides(ROOT));
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
});

test('i18n-export: erro claro sem out/ compilado', () => {
  const root = tempDir('i18n-export-missing');
  try {
    assert.throws(() => loadCompiled(root), /npm run compile/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('i18n-export: CLI grava os 26 JSONs', () => {
  const outDir = tempDir('i18n-export-cli');
  try {
    const result = spawnSync(process.execPath, [EXPORT, '--root', ROOT, '--out', outDir], {
      encoding: 'utf8',
    });
    assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.strictEqual(fs.readdirSync(outDir).length, 26);
    assert.match(result.stdout, /Exportados 26 locales/);
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
});

test('i18n-apply: regenera catálogo e suporta formas plurais (objeto)', () => {
  const root = tempDir('i18n-apply');
  try {
    const file = applyLocale({
      root,
      locale: 'pt-br',
      messages: {
        'demo.key': "valor com 'aspas' e \\ barra",
        'demo.plural': { one: '{count} item', other: '{count} itens' },
      },
    });
    const text = fs.readFileSync(file, 'utf8');
    assert.match(text, /export const ptBr: Record<string, Message> = \{/);
    const catalog = evaluateCatalog(text) as Record<string, unknown>;
    assert.strictEqual(catalog['demo.key'], "valor com 'aspas' e \\ barra");
    assert.deepStrictEqual(catalog['demo.plural'], {
      one: '{count} item',
      other: '{count} itens',
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('i18n-apply: en-gb mantém o overlay ...en', () => {
  const root = tempDir('i18n-apply-gb');
  try {
    const file = applyLocale({
      root,
      locale: 'en-gb',
      base: 'en',
      messages: { 'demo.key': 'value' },
    });
    const text = fs.readFileSync(file, 'utf8');
    assert.match(text, /import \{ en \} from '\.\/en';/);
    assert.match(text, /\.\.\.en,/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('i18n pipeline: round-trip export → apply (todos os locales)', () => {
  const outDir = tempDir('i18n-roundtrip-export');
  const root = tempDir('i18n-roundtrip-root');
  try {
    exportCatalogs({ root: ROOT, outDir });
    const result = spawnSync(process.execPath, [APPLY, '--in', outDir, '--root', root], {
      encoding: 'utf8',
    });
    assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
    for (const file of fs.readdirSync(outDir)) {
      const payload = JSON.parse(fs.readFileSync(path.join(outDir, file), 'utf8'));
      const generated = path.join(root, 'src', 'i18n', 'locales', `${payload.locale}.ts`);
      assert.ok(fs.existsSync(generated), `arquivo ausente: ${payload.locale}`);
      if (payload.base) {
        assert.match(fs.readFileSync(generated, 'utf8'), /\.\.\.en,/);
        continue;
      }
      assert.deepStrictEqual(evaluateCatalog(fs.readFileSync(generated, 'utf8')), payload.messages);
    }
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('i18n-check: repositório atual consistente', () => {
  assert.deepStrictEqual(check(ROOT), []);
});

test('i18n-check: detecta catálogo incompleto e glossário ausente', () => {
  const root = tempDir('i18n-check');
  try {
    fs.mkdirSync(path.join(root, 'out', 'i18n', 'locales'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'out', 'i18n', 'locales', 'index.js'),
      "module.exports={LOCALE_CODES:['pt-br','en'],catalogs:{'pt-br':{'a':'b'},en:{}}};\n",
    );
    fs.writeFileSync(path.join(root, 'package.nls.pt-br.json'), '{}\n');
    const problems = check(root);
    assert.ok(problems.some((p) => p.includes('LOCALE_CODES')));
    assert.ok(problems.some((p) => p.includes('en: 1 chave(s) ausente(s)')));
    assert.ok(problems.some((p) => p.includes('glossário ausente')));

    const result = spawnSync(process.execPath, [CHECK, '--root', root], { encoding: 'utf8' });
    assert.strictEqual(result.status, 1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('i18n-check: sem out/ e catálogo/manifesto ausentes', () => {
  const noOut = tempDir('i18n-check-noout');
  const incomplete = tempDir('i18n-check-incomplete');
  try {
    assert.match(check(noOut)[0], /npm run compile/);

    fs.mkdirSync(path.join(incomplete, 'out', 'i18n', 'locales'), { recursive: true });
    fs.writeFileSync(
      path.join(incomplete, 'out', 'i18n', 'locales', 'index.js'),
      "module.exports={LOCALE_CODES:['pt-br','zz'],catalogs:{'pt-br':{'a':'b'},zz:{a:'c'}}};\n",
    );
    const problems = check(incomplete);
    assert.ok(problems.some((p) => p.includes('zz: package.nls.zz.json ausente')));

    const ok = spawnSync(process.execPath, [CHECK, '--root', ROOT], { encoding: 'utf8' });
    assert.strictEqual(ok.status, 0, `${ok.stdout}\n${ok.stderr}`);
    assert.match(ok.stdout, /OK: catálogos/);
  } finally {
    fs.rmSync(noOut, { recursive: true, force: true });
    fs.rmSync(incomplete, { recursive: true, force: true });
  }
});
