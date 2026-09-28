import './setup.js';
import assert from 'node:assert';
import { createRequire } from 'node:module';
import { test } from 'node:test';

interface Manifest {
  capabilities?: { untrustedWorkspaces?: { supported?: boolean } };
  contributes: {
    configuration?: { properties?: Record<string, { scope?: string }> };
    languages?: { id: string; extensions?: string[] }[];
    breakpoints?: { language: string }[];
    debuggers?: {
      type: string;
      configurationAttributes?: { launch?: { properties?: Record<string, unknown> } };
      initialConfigurations?: { type?: string; request?: string; packageName?: string }[];
    }[];
    menus?: Record<string, { command: string }[]>;
  };
}

const req = createRequire(__filename);
const pkg = req('../../../package.json') as Manifest;

test('contributes.languages: .pks/.pkb/.prc/.fnc/.trg mapeiam para plsql', () => {
  const plsql = pkg.contributes.languages?.find((l) => l.id === 'plsql');
  assert.ok(plsql, 'linguagem plsql ausente no manifest');
  for (const ext of ['.pks', '.pkb', '.prc', '.fnc', '.trg']) {
    assert.ok(plsql.extensions?.includes(ext), `${ext} não associada a plsql`);
  }
});

test('contributes.breakpoints: habilita o gutter na linguagem plsql', () => {
  assert.ok(
    pkg.contributes.breakpoints?.some((b) => b.language === 'plsql'),
    'contributes.breakpoints para plsql ausente',
  );
});

test('debugger utplsql: initialConfigurations gera launch config de debug', () => {
  const dbg = pkg.contributes.debuggers?.find((d) => d.type === 'utplsql');
  assert.ok(dbg, 'debugger utplsql ausente no manifest');
  const initial = dbg.initialConfigurations?.[0];
  assert.ok(initial, 'initialConfigurations ausente');
  assert.strictEqual(initial.type, 'utplsql');
  assert.strictEqual(initial.request, 'launch');
  assert.strictEqual(initial.packageName, '$' + '{fileBasenameNoExtension}');
});

test('debugger utplsql: expõe os atributos de launch esperados', () => {
  const dbg = pkg.contributes.debuggers?.find((d) => d.type === 'utplsql');
  const props = dbg?.configurationAttributes?.launch?.properties ?? {};
  for (const key of ['packageName', 'testName', 'connection', 'stopOnException']) {
    assert.ok(key in props, `atributo ${key} ausente`);
  }
});

test('menu do editor expõe utplsql.debugTest para test packages', () => {
  const menu = pkg.contributes.menus?.['editor/context'] ?? [];
  assert.ok(menu.some((m) => m.command === 'utplsql.debugTest'));
});

test('settings sensíveis têm scope machine (PRD-81 RF1)', () => {
  const props = pkg.contributes.configuration?.properties ?? {};
  for (const key of [
    'utplsql.connection',
    'utplsql.profiles',
    'utplsql.activeProfile',
    'utplsql.oracleClientLibDir',
    'utplsql.oracleClientConfigDir',
  ]) {
    assert.strictEqual(props[key]?.scope, 'machine', `${key} deveria ter scope "machine"`);
  }
});

test('extensão fica desabilitada em workspace não confiável (PRD-81 RF2)', () => {
  assert.strictEqual(pkg.capabilities?.untrustedWorkspaces?.supported, false);
});
