import './setup.js';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { test } from 'node:test';
import { resolveSourceUri } from '../../coverage';
import { mapDbPathsToFiles } from '../../oracleRunner';

function withTempDir(fn: (dir: string) => void) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coverage-test-'));
  try {
    fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('resolveSourceUri: caminho absoluto existente', () => {
  withTempDir((dir) => {
    const filePath = path.join(dir, 'exemplo.sql');
    fs.writeFileSync(filePath, '');
    const uri = resolveSourceUri(filePath, dir, 'install');
    assert.ok(uri);
    assert.strictEqual(uri.fsPath, filePath);
  });
});

test('resolveSourceUri: relativo ao workspace', () => {
  withTempDir((dir) => {
    const filePath = path.join(dir, 'funcao.sql');
    fs.writeFileSync(filePath, '');
    const uri = resolveSourceUri('funcao.sql', dir, 'install');
    assert.ok(uri);
    assert.strictEqual(uri.fsPath, filePath);
  });
});

test('resolveSourceUri: relativo ao sourcePath', () => {
  withTempDir((dir) => {
    const sub = path.join(dir, 'install');
    fs.mkdirSync(sub);
    const filePath = path.join(sub, 'funcao.sql');
    fs.writeFileSync(filePath, '');
    const uri = resolveSourceUri('funcao.sql', dir, 'install');
    assert.ok(uri);
    assert.strictEqual(uri.fsPath, filePath);
  });
});

test('resolveSourceUri: basename no sourcePath', () => {
  withTempDir((dir) => {
    const sub = path.join(dir, 'install');
    fs.mkdirSync(sub);
    const filePath = path.join(sub, 'funcao.sql');
    fs.writeFileSync(filePath, '');
    const uri = resolveSourceUri('packages/funcao.sql', dir, 'install');
    assert.ok(uri);
    assert.strictEqual(uri.fsPath, filePath);
  });
});

test('resolveSourceUri: tenta .pks/.pkb quando o relatório mapeia .sql', () => {
  withTempDir((dir) => {
    const sub = path.join(dir, 'install', 'packages');
    fs.mkdirSync(sub, { recursive: true });
    const filePath = path.join(sub, 'CALC.pkb');
    fs.writeFileSync(filePath, '');
    const uri = resolveSourceUri('packages/CALC.sql', dir, 'install');
    assert.ok(uri);
    assert.strictEqual(uri.fsPath, filePath);
  });
});

test('resolveSourceUri: função real com extensão .fnc', () => {
  withTempDir((dir) => {
    const sub = path.join(dir, 'install', 'functions');
    fs.mkdirSync(sub, { recursive: true });
    const filePath = path.join(sub, 'FN1.fnc');
    fs.writeFileSync(filePath, '');
    const uri = resolveSourceUri('functions/FN1.sql', dir, 'install');
    assert.ok(uri);
    assert.strictEqual(uri.fsPath, filePath);
  });
});

test('resolveSourceUri: extensão .prc na raiz do sourcePath (basename)', () => {
  withTempDir((dir) => {
    const sub = path.join(dir, 'install');
    fs.mkdirSync(sub);
    const filePath = path.join(sub, 'PR1.prc');
    fs.writeFileSync(filePath, '');
    const uri = resolveSourceUri('procedures/PR1.sql', dir, 'install');
    assert.ok(uri);
    assert.strictEqual(uri.fsPath, filePath);
  });
});

test('pipeline cobertura: tipo schema.objeto → mapDbPathsToFiles → resolveSourceUri', () => {
  withTempDir((dir) => {
    const sub = path.join(dir, 'install', 'packages');
    fs.mkdirSync(sub, { recursive: true });
    const filePath = path.join(sub, 'CALCULATOR.pkb');
    fs.writeFileSync(filePath, '');
    const mapped = mapDbPathsToFiles('<class filename="package body UT3.CALCULATOR" />');
    const file = mapped.match(/filename="([^"]+)"/)?.[1] as string;
    assert.ok(file, `mapDbPathsToFiles deveria gerar filename: ${mapped}`);
    const uri = resolveSourceUri(file, dir, 'install');
    assert.ok(uri, `resolveSourceUri deveria achar ${file}`);
    assert.strictEqual(uri.fsPath, filePath);
  });
});

test('resolveSourceUri: arquivo inexistente retorna undefined', () => {
  withTempDir((dir) => {
    const uri = resolveSourceUri('nao_existe.sql', dir, 'install');
    assert.strictEqual(uri, undefined);
  });
});

test('resolveSourceUri: pasta passada como arquivo retorna undefined', () => {
  withTempDir((dir) => {
    const uri = resolveSourceUri(dir, dir, 'install');
    assert.strictEqual(uri, undefined);
  });
});

test('resolveSourceUri: sourcePath que nao existe retorna undefined', () => {
  withTempDir((dir) => {
    const uri = resolveSourceUri('funcao.sql', dir, 'inexistente');
    assert.strictEqual(uri, undefined);
  });
});

test('resolveSourceUri: caminho com folderRoot tem prioridade', () => {
  withTempDir((dir) => {
    const folderRoot = path.join(dir, 'sub');
    fs.mkdirSync(folderRoot);
    const filePath = path.join(folderRoot, 'app.sql');
    fs.writeFileSync(filePath, '');
    const uri = resolveSourceUri('app.sql', dir, 'install', folderRoot);
    assert.ok(uri);
    assert.strictEqual(uri.fsPath, filePath);
  });
});

test('resolveSourceUri: path traversal (../) fora da raiz retorna undefined', () => {
  withTempDir((dir) => {
    const outside = path.join(dir, '..', 'cov-traversal-leak.txt');
    fs.writeFileSync(outside, 'sensitive');
    try {
      const uri = resolveSourceUri('../../../cov-traversal-leak.txt', dir, 'install');
      assert.strictEqual(uri, undefined);
    } finally {
      fs.rmSync(outside, { force: true });
    }
  });
});

test('resolveSourceUri: caminho absoluto fora da raiz retorna undefined', () => {
  withTempDir((dir) => {
    const outside = path.join(dir, '..', 'cov-absolute-leak.txt');
    fs.writeFileSync(outside, 'sensitive');
    try {
      const uri = resolveSourceUri(outside, dir, 'install');
      assert.strictEqual(uri, undefined);
    } finally {
      fs.rmSync(outside, { force: true });
    }
  });
});

test('resolveSourceUri: file vazio cobre o branch rc === rb', () => {
  withTempDir((dir) => {
    const uri = resolveSourceUri('', dir, 'install');
    assert.strictEqual(uri, undefined);
  });
});

test('resolveSourceUri: path inválido (estat lança) é ignorado no catch', () => {
  withTempDir((dir) => {
    const uri = resolveSourceUri('\u0000', dir, 'install');
    assert.strictEqual(uri, undefined);
  });
});
