import './setup.js';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

const ROOT = path.resolve(__dirname, '../../..');
const TEST_DIR = path.join(ROOT, 'src', 'test');

/** Orçamento atual (ratchet): não pode aumentar; a meta da PRD-114 é ≤178. */
const CURRENT_AS_ANY = 116;
const TARGET_AS_ANY = 178;
const CURRENT_ANY = 188;

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...tsFiles(full));
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

function count(regex: RegExp): number {
  const self = path.join(TEST_DIR, 'unit', 'anyBudget.test.ts');
  let total = 0;
  for (const file of tsFiles(TEST_DIR)) {
    if (file === self) continue; // não contar o próprio teste/orçamento
    for (const rawLine of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim();
      if (line.startsWith('*') || line.startsWith('//') || line.startsWith('/*')) continue;
      for (const match of rawLine.matchAll(regex)) {
        if (match) total++;
      }
    }
  }
  return total;
}

test('PRD-114: o orçamento de any em src/test não regride', () => {
  const asAny = count(/\bas any\b/g);
  const anyWords = count(/\bany\b/g);
  assert.ok(asAny <= CURRENT_AS_ANY, `as any subiu para ${asAny} (orçamento ${CURRENT_AS_ANY})`);
  assert.ok(asAny <= TARGET_AS_ANY, `as any ${asAny} acima da meta da PRD-114 (${TARGET_AS_ANY})`);
  assert.ok(
    anyWords <= CURRENT_ANY,
    `ocorrências de any subiram para ${anyWords} (orçamento ${CURRENT_ANY})`,
  );
});
