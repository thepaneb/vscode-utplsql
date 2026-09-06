import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { deriveDeclarationCoverage, parsePlsqlDeclarations } from '../../plsqlDeclarations';

test('parsePlsqlDeclarations: procedures e functions simples', () => {
  const text = `CREATE OR REPLACE PACKAGE BODY app IS
  PROCEDURE calc IS
  BEGIN
    NULL;
  END;
  FUNCTION get_total RETURN NUMBER IS
  BEGIN
    RETURN 1;
  END;
END;`;
  const decls = parsePlsqlDeclarations(text);
  assert.deepStrictEqual(
    decls.map((d) => [d.name, d.line]),
    [
      ['calc', 1],
      ['get_total', 5],
    ],
  );
});

test('parsePlsqlDeclarations: nomes quotados', () => {
  const text = `PROCEDURE "calcular desconto" IS
BEGIN NULL; END;`;
  const decls = parsePlsqlDeclarations(text);
  assert.strictEqual(decls.length, 1);
  assert.strictEqual(decls[0].name, 'calcular desconto');
});

test('parsePlsqlDeclarations: ignora em comentarios e strings', () => {
  const text = `-- PROCEDURE comentada IS
/* FUNCTION fake */
PROCEDURE real IS
  v := 'PROCEDURE string';
BEGIN
  NULL;
END;`;
  const decls = parsePlsqlDeclarations(text);
  assert.deepStrictEqual(
    decls.map((d) => d.name),
    ['real'],
  );
});

test('parsePlsqlDeclarations: ignora MEMBER PROCEDURE/FUNCTION', () => {
  const text = `TYPE t AS OBJECT (
  MEMBER PROCEDURE do_it,
  MEMBER FUNCTION get_it RETURN NUMBER
);`;
  const decls = parsePlsqlDeclarations(text);
  assert.deepStrictEqual(decls, []);
});

test('parsePlsqlDeclarations: case-insensitive', () => {
  const text = `procedure lower_name IS begin null; end;
Function MixedName return number is begin return 1; end;`;
  const decls = parsePlsqlDeclarations(text);
  assert.deepStrictEqual(
    decls.map((d) => d.name),
    ['lower_name', 'MixedName'],
  );
});

test('parsePlsqlDeclarations: sem declaracoes retorna []', () => {
  assert.deepStrictEqual(parsePlsqlDeclarations(''), []);
  assert.deepStrictEqual(parsePlsqlDeclarations('SELECT * FROM dual;'), []);
});

test('deriveDeclarationCoverage: executada quando escopo tem hits', () => {
  const text = `PROCEDURE p1 IS
BEGIN
  NULL;
END;
PROCEDURE p2 IS
BEGIN
  NULL;
END;`;
  // p1: linhas 1..4 (0-based 0..3); p2: linhas 6..9 (0-based 5..8)
  const fileLines = [
    { line: 3, hits: 2 }, // dentro do escopo de p1
    { line: 8, hits: 0 }, // p2 sem hits
  ];
  const cov = deriveDeclarationCoverage(text, fileLines);
  assert.deepStrictEqual(
    cov.map((d) => [d.name, d.executed]),
    [
      ['p1', true],
      ['p2', false],
    ],
  );
});

test('deriveDeclarationCoverage: sem hits nenhuma executada', () => {
  const text = `PROCEDURE p1 IS
BEGIN NULL; END;`;
  const cov = deriveDeclarationCoverage(text, [{ line: 2, hits: 0 }]);
  assert.strictEqual(cov[0].executed, false);
});

test('deriveDeclarationCoverage: arquivo sem declaracoes retorna []', () => {
  const cov = deriveDeclarationCoverage('SELECT 1 FROM dual;', [{ line: 1, hits: 5 }]);
  assert.deepStrictEqual(cov, []);
});

test('parsePlsqlDeclarations: string multilinha preserva quebras no masking', () => {
  const text = `PROCEDURE p IS
  v := 'linha1
linha2';
BEGIN NULL; END;`;
  const decls = parsePlsqlDeclarations(text);
  assert.strictEqual(decls.length, 1);
  assert.strictEqual(decls[0].name, 'p');
});
