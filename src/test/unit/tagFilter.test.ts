import assert from 'node:assert';
import { test } from 'node:test';
import { collectTags, filterItemsByTags, parseTagSelection } from '../../tagFilter';

// PRD-51: filtro por tag — puro (sem vscode).

const A = { id: 'test:a' };
const B = { id: 'test:b' };
const C = { id: 'test:c' };
const items = [
  { item: A, tags: ['fast', 'critical'] },
  { item: B, tags: ['slow'] },
  { item: C, tags: [] },
];

test('filterItemsByTags: sem filtro inclui todos', () => {
  assert.deepStrictEqual(filterItemsByTags(items, [], []), [A, B, C]);
});

test('filterItemsByTags: inclusão simples casa qualquer tag', () => {
  assert.deepStrictEqual(filterItemsByTags(items, ['fast'], []), [A]);
  assert.deepStrictEqual(filterItemsByTags(items, ['fast', 'slow'], []), [A, B]);
});

test('filterItemsByTags: comparação é case-insensitive (RNF1)', () => {
  assert.deepStrictEqual(filterItemsByTags(items, ['FAST'], []), [A]);
  assert.deepStrictEqual(filterItemsByTags(items, ['Fast', 'SLOW'], []), [A, B]);
});

test('filterItemsByTags: exclusão remove o item mesmo se incluído', () => {
  assert.deepStrictEqual(filterItemsByTags(items, ['fast'], ['critical']), []);
  assert.deepStrictEqual(filterItemsByTags(items, [], ['slow']), [A, C]);
});

test('filterItemsByTags: item sem tag só entra quando não há inclusão (RNF2)', () => {
  assert.deepStrictEqual(filterItemsByTags(items, ['fast'], []), [A]);
  assert.deepStrictEqual(filterItemsByTags(items, [], []), [A, B, C]);
});

test('filterItemsByTags: só exclusão preserva itens sem tag', () => {
  assert.deepStrictEqual(filterItemsByTags(items, [], ['fast']), [B, C]);
});

test('parseTagSelection: separa inclusões e exclusões pelo prefixo !', () => {
  assert.deepStrictEqual(parseTagSelection(['fast', '!slow', '!critical']), {
    include: ['fast'],
    exclude: ['slow', 'critical'],
  });
});

test('parseTagSelection: só exclusões deixa include vazio', () => {
  assert.deepStrictEqual(parseTagSelection(['!slow']), { include: [], exclude: ['slow'] });
});

test('parseTagSelection: ignora vazios e normaliza case do prefixo', () => {
  assert.deepStrictEqual(parseTagSelection(['', '  fast  ', '! SLOW ']), {
    include: ['fast'],
    exclude: ['SLOW'],
  });
});

test('collectTags: união distinta ordenada, sem vazios', () => {
  const tags = collectTags([
    { tags: ['fast', 'critical'] },
    { tags: ['slow', 'fast'] },
    { tags: [] },
    { tags: undefined },
  ]);
  assert.deepStrictEqual(tags, ['critical', 'fast', 'slow']);
});

test('collectTags: lista vazia devolve array vazio', () => {
  assert.deepStrictEqual(collectTags([]), []);
});
