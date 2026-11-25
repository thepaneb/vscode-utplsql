import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { PSEUDO_LOCALE, pseudoLocalize, ptBr, resolveLocale, t } from '../../i18n';

function withPseudo<T>(fn: () => T): T {
  const previous = process.env.UTPLSQL_PSEUDO_LOC;
  process.env.UTPLSQL_PSEUDO_LOC = '1';
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env.UTPLSQL_PSEUDO_LOC;
    else process.env.UTPLSQL_PSEUDO_LOC = previous;
  }
}

test('pseudo: desligado por padrão mantém a mensagem original', () => {
  delete process.env.UTPLSQL_PSEUDO_LOC;
  assert.strictEqual(t('pt-br', 'ext.noConnection'), 'Conexão Oracle não informada.');
});

test('pseudo: UTPLSQL_PSEUDO_LOC=1 acentua e expande a mensagem', () => {
  withPseudo(() => {
    const pseudo = t('pt-br', 'ext.noConnection');
    assert.notStrictEqual(pseudo, 'Conexão Oracle não informada.');
    assert.ok(pseudo.startsWith('['));
    assert.ok(pseudo.endsWith(']'));
    assert.ok(pseudo.includes('~'));
    assert.ok(pseudo.length > 'Conexão Oracle não informada.'.length);
  });
});

test('pseudo: determinístico e preserva a interpolação', () => {
  withPseudo(() => {
    const first = t('pt-br', 'ext.validate.problems', { count: 3 });
    const second = t('pt-br', 'ext.validate.problems', { count: 3 });
    assert.strictEqual(first, second);
    assert.ok(first.includes('3'));
    assert.ok(!first.includes('{count}'));
  });
});

test('pseudo: resolveLocale aceita qps-ploc só com a env', () => {
  delete process.env.UTPLSQL_PSEUDO_LOC;
  assert.strictEqual(resolveLocale(PSEUDO_LOCALE, 'en'), 'en');
  withPseudo(() => {
    assert.strictEqual(resolveLocale(PSEUDO_LOCALE, 'en'), PSEUDO_LOCALE);
  });
});

test('pseudo: t(qps-ploc) usa o catálogo en como base', () => {
  withPseudo(() => {
    const pseudo = t(PSEUDO_LOCALE, 'ext.noConnection');
    assert.ok(pseudo.startsWith('['));
  });
});

test('pseudo: todas as chaves do catálogo sobrevivem à transformação', () => {
  withPseudo(() => {
    for (const key of Object.keys(ptBr)) {
      assert.strictEqual(typeof t('pt-br', key), 'string', `chave ${key}`);
    }
  });
});

test('pseudoLocalize: preserva dígitos e pontuação', () => {
  const out = pseudoLocalize('Test 42: ok!');
  assert.ok(out.includes('42'));
  assert.ok(out.includes(':'));
  assert.ok(out.includes('!'));
});
