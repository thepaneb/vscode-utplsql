import { test } from 'node:test';
import assert from 'node:assert';
import { parseCobertura } from '../../cobertura';

const XML = `<?xml version="1.0"?>
<coverage line-rate="0.5" version="1.9">
  <packages>
    <package name="app">
      <classes>
        <class name="FUNCAO_EXEMPLO" filename="install/functions/funcao_exemplo.sql">
          <lines>
            <line number="3" hits="2"/>
            <line number="4" hits="0"/>
            <line number="5" hits="2"/>
          </lines>
        </class>
        <class name="PROC_EXEMPLO" filename="install/procedures/proc_exemplo.sql">
          <lines>
            <line number="7" hits="1"/>
          </lines>
        </class>
      </classes>
    </package>
  </packages>
</coverage>`;

test('faz parse de todos os arquivos cobertos', () => {
  const files = parseCobertura(XML);
  assert.strictEqual(files.length, 2);
  assert.strictEqual(files[0].file, 'install/functions/funcao_exemplo.sql');
});

test('lê número da linha e hits', () => {
  const files = parseCobertura(XML);
  const f = files[0];
  assert.strictEqual(f.lines.length, 3);
  assert.deepStrictEqual(f.lines[0], { line: 3, hits: 2 });
  assert.deepStrictEqual(f.lines[1], { line: 4, hits: 0 });
});

test('retorna vazio para XML sem cobertura', () => {
  assert.deepStrictEqual(parseCobertura('<coverage></coverage>'), []);
});
