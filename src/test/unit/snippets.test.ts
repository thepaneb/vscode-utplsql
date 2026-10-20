import './setup.js';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

// Valida a biblioteca de snippets da PRD-105 contra o JSON e o manifest.

const ROOT = path.resolve(__dirname, '../../..');
const SNIPPETS_PATH = path.join(ROOT, 'snippets', 'utplsql.code-snippets');

interface Snippet {
  prefix?: string | string[];
  body?: string | string[];
  description?: string;
}

type SnippetMap = Record<string, Snippet>;

function readSnippets(): SnippetMap {
  return JSON.parse(fs.readFileSync(SNIPPETS_PATH, 'utf8')) as SnippetMap;
}

function prefixesOf(entry: Snippet): string[] {
  return Array.isArray(entry.prefix) ? entry.prefix : [entry.prefix ?? ''];
}

function bodyOf(entry: Snippet): string {
  return Array.isArray(entry.body) ? entry.body.join('\n') : (entry.body ?? '');
}

const REQUIRED_PREFIXES = [
  'ut-suite',
  'ut-%suite',
  'ut-%suitepath',
  'ut-%test',
  'ut-%context',
  'ut-%endcontext',
  'ut-%name',
  'ut-%beforeall',
  'ut-%afterall',
  'ut-%beforeeach',
  'ut-%aftereach',
  'ut-%beforetest',
  'ut-%aftertest',
  'ut-%disabled',
  'ut-%tags',
  'ut-%rollback',
  'ut-%throws',
  'ut-%displayname',
  'ut-expect-equal',
  'ut-expect-null',
  'ut-expect-not-null',
  'ut-expect-true',
  'ut-expect-false',
  'ut-expect-between',
  'ut-expect-gt',
  'ut-expect-gte',
  'ut-expect-lt',
  'ut-expect-lte',
  'ut-expect-match',
  'ut-expect-like',
  'ut-expect-contain',
  'ut-expect-count',
  'ut-expect-cursor-equal',
  'ut-expect-json-equal',
  'ut-fail',
  'ut-nls-cursor',
];

test('snippets: JSON válido, com prefix/body não vazios e prefixos únicos', () => {
  const snippets = readSnippets();
  assert.ok(Object.keys(snippets).length >= REQUIRED_PREFIXES.length);
  const seen = new Set<string>();
  for (const [name, entry] of Object.entries(snippets)) {
    assert.ok(entry.description?.trim(), `${name} sem description`);
    const body = bodyOf(entry).trim();
    assert.ok(body.length > 0, `${name} sem body`);
    const prefixes = prefixesOf(entry).filter((p) => p.trim());
    assert.ok(prefixes.length > 0, `${name} sem prefix`);
    for (const prefix of prefixes) {
      assert.ok(!seen.has(prefix), `prefix duplicado: ${prefix}`);
      seen.add(prefix);
    }
  }
});

test('snippets: todas as annotations e matchers do RF1/RF2/RF3 existem', () => {
  const snippets = readSnippets();
  const prefixes = new Set(Object.values(snippets).flatMap(prefixesOf));
  for (const prefix of REQUIRED_PREFIXES) {
    assert.ok(prefixes.has(prefix), `prefix ausente: ${prefix}`);
  }
});

test('snippets: matchers do RF2 aparecem nos corpos', () => {
  const snippets = readSnippets();
  const allBodies = Object.values(snippets).map(bodyOf).join('\n');
  for (const matcher of [
    'to_equal',
    'to_be_not_null',
    'to_be_true',
    'to_be_false',
    'to_be_between',
    'to_be_greater_than',
    'to_be_greater_or_equal',
    'to_be_less_than',
    'to_be_less_or_equal',
    'to_match',
    'to_be_like',
    'to_contain',
    'to_have_count',
    'ut.fail',
  ]) {
    assert.ok(allBodies.includes(matcher), `matcher ausente: ${matcher}`);
  }
});

test('snippets: ut-nls-cursor mantém set_nls antes do to_equal e reset_nls depois', () => {
  const snippets = readSnippets();
  const entry = Object.values(snippets).find((s) => prefixesOf(s).includes('ut-nls-cursor'));
  assert.ok(entry, 'snippet ut-nls-cursor ausente');
  const body = bodyOf(entry as Snippet);
  const setNls = body.indexOf('ut.set_nls');
  const equal = body.indexOf('to_equal');
  const resetNls = body.indexOf('ut.reset_nls');
  assert.ok(setNls >= 0 && equal > setNls && resetNls > equal, body);
});

test('snippets: package.json registra o arquivo para sql, plsql e oracle-sql', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
    contributes?: { snippets?: Array<{ language: string; path: string }> };
  };
  const contributed = pkg.contributes?.snippets ?? [];
  for (const language of ['sql', 'plsql', 'oracle-sql']) {
    const entry = contributed.find((s) => s.language === language);
    assert.ok(entry, `contributes.snippets ausente para ${language}`);
    assert.strictEqual(entry?.path, './snippets/utplsql.code-snippets');
    assert.ok(fs.existsSync(path.join(ROOT, entry?.path ?? '')), 'arquivo de snippets ausente');
  }
});
