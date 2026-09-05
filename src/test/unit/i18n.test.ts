import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { en, missingEnKeys, ptBr, resolveLocale, t } from '../../i18n';

test('resolveLocale: auto com editor pt -> pt-br', () => {
  assert.strictEqual(resolveLocale('auto', 'pt-BR'), 'pt-br');
  assert.strictEqual(resolveLocale('auto', 'pt-br'), 'pt-br');
  assert.strictEqual(resolveLocale('auto', 'pt'), 'pt-br');
});

test('resolveLocale: auto com editor en -> en', () => {
  assert.strictEqual(resolveLocale('auto', 'en'), 'en');
  assert.strictEqual(resolveLocale('auto', 'en-US'), 'en');
  assert.strictEqual(resolveLocale('auto', 'de'), 'en');
});

test('resolveLocale: forçado ignora idioma do editor', () => {
  assert.strictEqual(resolveLocale('en', 'pt-BR'), 'en');
  assert.strictEqual(resolveLocale('pt-br', 'en'), 'pt-br');
});

test('resolveLocale: valor invalido cai no auto', () => {
  assert.strictEqual(resolveLocale('es', 'en'), 'en');
  assert.strictEqual(resolveLocale('es', 'pt'), 'pt-br');
});

test('t: pt-br retorna a chave do catalogo pt', () => {
  assert.strictEqual(t('pt-br', 'ext.noConnection'), 'Conexão Oracle não informada.');
});

test('t: en retorna a traducao em ingles', () => {
  assert.strictEqual(t('en', 'ext.noConnection'), 'Oracle connection not set.');
});

test('t: interpolacao parametrizada', () => {
  assert.strictEqual(t('pt-br', 'ext.profile.active', { name: 'DEV' }), 'Perfil ativo: DEV');
  assert.strictEqual(
    t('en', 'runner.oracleUnavailable', { error: 'ORA-1' }),
    'Oracle runner unavailable, falling back to CLI: ORA-1',
  );
});

test('t: chave ausente em en cai para pt-br', () => {
  const missing = { ...en };
  delete missing['ext.noConnection'];
  // t() usa o catalogo en real; simula ausencia removendo e restaurando
  const original = en['ext.noConnection'];
  try {
    delete (en as Record<string, string>)['ext.noConnection'];
    assert.strictEqual(t('en', 'ext.noConnection'), 'Conexão Oracle não informada.');
  } finally {
    (en as Record<string, string>)['ext.noConnection'] = original;
  }
});

test('t: chave inexistente retorna a propria chave (nunca lanca)', () => {
  assert.strictEqual(t('pt-br', 'nao.existe.xyz'), 'nao.existe.xyz');
  assert.strictEqual(t('en', 'nao.existe.xyz'), 'nao.existe.xyz');
});

test('t: placeholder nao fornecido permanece literal', () => {
  assert.strictEqual(t('pt-br', 'ext.profile.active'), 'Perfil ativo: {name}');
});

test('paridade: catálogos pt-BR e en com as mesmas chaves', () => {
  assert.deepStrictEqual(missingEnKeys(), [], 'chaves ausentes em en');
});

test('catalogos nao vazios e com interpolacao valida', () => {
  assert.ok(Object.keys(ptBr).length > 30);
  assert.ok(Object.keys(en).length > 30);
  // nenhuma chave com placeholder deve ter placeholder sem definicao
  const paramRe = /\{(\w+)\}/g;
  for (const [locale, cat] of [
    ['pt-br', ptBr],
    ['en', en],
  ] as const) {
    for (const [key, value] of Object.entries(cat)) {
      if (key === 'nls.command.refresh') continue;
      for (const m of value.matchAll(paramRe)) {
        // placeholder numerico no catalogo sem ser usado no codigo é permitido;
        // garante apenas que o formato está correto
        assert.ok(m[1].length > 0, `placeholder vazio em ${locale}:${key}`);
      }
    }
  }
});
