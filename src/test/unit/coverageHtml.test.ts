import './setup.js';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { test } from 'node:test';
import {
  classifyCoverageOutput,
  coverageHtmlReportPath,
  offerCoverageHtmlReport,
  prepareCoverageHtmlReport,
  writeCoverageHtmlReport,
} from '../../coverage';
import {
  __getOpenedExternal,
  __resetConfigValues,
  __resetMessages,
  __resetOpenedExternal,
  __setConfigValue,
  __setInformationResult,
  __setSaveDialogResult,
  Uri,
} from '../vscode-stub';

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-html-'));
}

test('classifyCoverageOutput: HTML, XML e console', () => {
  assert.strictEqual(classifyCoverageOutput('<!DOCTYPE html><html>'), 'html');
  assert.strictEqual(classifyCoverageOutput('  <html><body>'), 'html');
  assert.strictEqual(classifyCoverageOutput('<?xml version="1.0"?>'), 'xml');
  assert.strictEqual(classifyCoverageOutput('<coverage line-rate="1">'), 'xml');
  assert.strictEqual(classifyCoverageOutput('Suite APP.UT_X'), 'console');
  assert.strictEqual(classifyCoverageOutput(''), 'console');
});

test('coverageHtmlReportPath: workspace e fallback temp', () => {
  assert.strictEqual(
    coverageHtmlReportPath('/ws/project'),
    path.join('/ws/project', 'test-results', 'coverage.html'),
  );
  assert.strictEqual(
    coverageHtmlReportPath(),
    path.join(os.tmpdir(), 'utplsql-coverage', 'coverage.html'),
  );
});

test('writeCoverageHtmlReport: grava de forma atômica e remove o alvo anterior', async () => {
  const dir = tempDir();
  const target = path.join(dir, 'test-results', 'coverage.html');
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, 'stale');
    await writeCoverageHtmlReport('<!DOCTYPE html><html>ok</html>', target);
    assert.strictEqual(fs.readFileSync(target, 'utf8'), '<!DOCTYPE html><html>ok</html>');
    assert.ok(!fs.existsSync(`${target}.tmp`), 'o .tmp não deve sobrar');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('prepareCoverageHtmlReport: remove alvo e .tmp sem lançar', async () => {
  const dir = tempDir();
  const target = path.join(dir, 'coverage.html');
  try {
    fs.writeFileSync(target, 'stale');
    fs.writeFileSync(`${target}.tmp`, 'partial');
    await prepareCoverageHtmlReport(target);
    assert.ok(!fs.existsSync(target));
    assert.ok(!fs.existsSync(`${target}.tmp`));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('offerCoverageHtmlReport: "Abrir no navegador" chama openExternal', async () => {
  const dir = tempDir();
  const source = path.join(dir, 'coverage.html');
  fs.writeFileSync(source, '<html>ok</html>');
  __setConfigValue('language', 'en');
  __setInformationResult('Open in Browser');
  __resetOpenedExternal();
  try {
    await offerCoverageHtmlReport(source);
    assert.deepStrictEqual(__getOpenedExternal(), [source]);
  } finally {
    __resetConfigValues();
    __resetMessages();
    __resetOpenedExternal();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('offerCoverageHtmlReport: "Save to file" copia para o destino escolhido', async () => {
  const dir = tempDir();
  const source = path.join(dir, 'coverage.html');
  const target = path.join(dir, 'saved.html');
  fs.writeFileSync(source, '<html>ok</html>');
  __setConfigValue('language', 'en');
  __setInformationResult('Save to file…');
  __setSaveDialogResult(Uri.file(target));
  try {
    await offerCoverageHtmlReport(source);
    assert.ok(fs.existsSync(target));
    assert.strictEqual(fs.readFileSync(target, 'utf8'), '<html>ok</html>');
  } finally {
    __resetConfigValues();
    __resetMessages();
    __setSaveDialogResult(undefined);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
