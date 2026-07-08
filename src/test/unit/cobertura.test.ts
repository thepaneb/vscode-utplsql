import assert from 'node:assert';
import { test } from 'node:test';
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

test('parseCobertura: pula classe sem filename', () => {
  const xml = `<?xml version="1.0"?>
<coverage>
  <packages>
    <package name="app">
      <classes>
        <class name="SEM_ARQUIVO">
          <lines><line number="1" hits="1"/></lines>
        </class>
        <class name="COM_ARQUIVO" filename="ok.sql">
          <lines><line number="1" hits="2"/></lines>
        </class>
      </classes>
    </package>
  </packages>
</coverage>`;
  const files = parseCobertura(xml);
  assert.strictEqual(files.length, 1);
  assert.strictEqual(files[0].file, 'ok.sql');
});

test('parseCobertura: linha com numero invalido e filtrada', () => {
  const xml = `<?xml version="1.0"?>
<coverage>
  <packages>
    <package name="app">
      <classes>
        <class name="X" filename="x.sql">
          <lines><line number="abc" hits="0"/><line number="3" hits="1"/></lines>
        </class>
      </classes>
    </package>
  </packages>
</coverage>`;
  const files = parseCobertura(xml);
  assert.strictEqual(files.length, 1);
  assert.strictEqual(files[0].lines.length, 1);
  assert.strictEqual(files[0].lines[0].line, 3);
});

test('parseCobertura: multiplos packages', () => {
  const xml = `<?xml version="1.0"?>
<coverage>
  <packages>
    <package name="pkg1">
      <classes>
        <class name="A" filename="a.sql"><lines><line number="1" hits="1"/></lines></class>
      </classes>
    </package>
    <package name="pkg2">
      <classes>
        <class name="B" filename="b.sql"><lines><line number="2" hits="2"/></lines></class>
      </classes>
    </package>
  </packages>
</coverage>`;
  const files = parseCobertura(xml);
  assert.strictEqual(files.length, 2);
});
